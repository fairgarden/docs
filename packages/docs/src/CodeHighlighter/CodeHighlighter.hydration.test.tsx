/**
 * @vitest-environment jsdom
 *
 * Inline code under `CodeProviderLazy`, with the default `highlightAfter`. The server
 * components are resolved first, as the RSC render does, into the client element
 * that both the server render and the browser render. It is then rendered to HTML
 * with `renderToString` and hydrated with `hydrateRoot`, with the lazily loaded
 * emphasis enhancer loaded on one side only: the server and the browser load it
 * independently, so either can have it while the other doesn't.
 */
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import * as ReactDOMClient from 'react-dom/client';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CodeHighlighter } from './CodeHighlighter';
import { CodeHighlighterClient } from './CodeHighlighterClient';
import { CodeProviderLazy } from '../CodeProvider/CodeProviderLazy';
import { useCode } from '../useCode';
import { createParseSource } from '../pipeline/parseSource';
import {
  enhanceCodeEmphasisLazy,
  preloadCodeEmphasis,
  resetCodeEmphasisCache,
} from '../pipeline/enhanceCodeEmphasis/enhanceCodeEmphasisLazy';
import type { Code, ContentProps, ParseSource, SourceEnhancer } from './types';

type FrameTypes = Array<string | null>;

let sourceParser: Promise<ParseSource>;

beforeAll(async () => {
  sourceParser = createParseSource();
  await sourceParser;
  // `<Pre>` observes frame visibility; jsdom has neither observer.
  class NoopObserver {
    observe() {}

    unobserve() {}

    disconnect() {}

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
  // Lets `act` flush effects and updates.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/** Renders the selected file. */
function SelectedFileContent(props: ContentProps<object>) {
  const code = useCode(props);
  return <div>{code.selectedFile}</div>;
}

/** One variant whose files are all inline strings, with no `url`. */
const inlineCode: Code = {
  Default: {
    fileName: 'Button.tsx',
    source: 'export const Button = () => <button type="button" />;',
    extraFiles: { 'useToggle.ts': { source: 'export {};' } },
  },
};

/**
 * Resolves the server components `CodeHighlighter` routes through (the chunk, its
 * server loader and `CodeSourceLoader`), as the RSC render does, down to the
 * `CodeHighlighterClient` element the server render and the browser both render.
 */
async function resolveServerComponents(element: React.ReactElement): Promise<React.ReactElement> {
  let current = element;
  while (typeof current.type === 'function' && current.type !== CodeHighlighterClient) {
    const component = current.type as (
      props: unknown,
    ) => React.ReactElement | Promise<React.ReactElement>;
    // eslint-disable-next-line no-await-in-loop
    current = await component(current.props);
  }
  return current;
}

/** The HTML the server renders for `element`. */
function toServerHtml(element: React.ReactElement): string {
  return ReactDOMServer.renderToString(element);
}

async function setLazyEnhancer(state: 'loaded' | 'not loaded') {
  resetCodeEmphasisCache();
  if (state === 'loaded') {
    await preloadCodeEmphasis();
  }
}

function getFrameTypesInDom(container: HTMLElement): FrameTypes {
  return Array.from(container.querySelectorAll('.frame')).map((frame) =>
    frame.getAttribute('data-frame-type'),
  );
}

/**
 * Renders the inline block to HTML with the lazy enhancer in `server` state, then
 * hydrates that HTML with it in `client` state and lets the client settle.
 */
async function serveThenHydrate(
  lazyEnhancer: { server: 'loaded' | 'not loaded'; client: 'loaded' | 'not loaded' },
  sourceEnhancers?: SourceEnhancer[],
) {
  const clientElement = await resolveServerComponents(
    <CodeHighlighter code={inlineCode} Content={SelectedFileContent} sourceParser={sourceParser} />,
  );
  const page = (
    <CodeProviderLazy sourceEnhancers={sourceEnhancers}>{clientElement}</CodeProviderLazy>
  );

  await setLazyEnhancer(lazyEnhancer.server);
  const container = document.createElement('div');
  container.innerHTML = toServerHtml(page);
  document.body.append(container);

  await setLazyEnhancer(lazyEnhancer.client);
  const serverFrameTypes = getFrameTypesInDom(container);

  const hydrationErrors: string[] = [];
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    hydrationErrors.push(args.map(String).join(' '));
  });
  let root: ReactDOMClient.Root | undefined;
  try {
    await React.act(async () => {
      root = ReactDOMClient.hydrateRoot(container, page, {
        onRecoverableError: (error) => hydrationErrors.push(String(error)),
      });
    });
    // Let a lazily loaded enhancer finish, if the client started one.
    await React.act(() => preloadCodeEmphasis());
  } finally {
    consoleError.mockRestore();
  }

  return {
    serverFrameTypes,
    hydratedFrameTypes: getFrameTypesInDom(container),
    hydrationErrors,
    unmount: () => {
      React.act(() => root?.unmount());
      container.remove();
    },
  };
}

describe('CodeHighlighter hydration', () => {
  describe('inline code under CodeProviderLazy', () => {
    it('hydrates without a mismatch when only the client has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate({ server: 'not loaded', client: 'loaded' });

      expect(result.hydrationErrors).toEqual([]);
      expect(result.hydratedFrameTypes).toEqual(result.serverFrameTypes);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate({ server: 'loaded', client: 'not loaded' });

      expect(result.hydrationErrors).toEqual([]);
      expect(result.hydratedFrameTypes).toEqual(result.serverFrameTypes);
      result.unmount();
    });

    it('server-renders the emphasis frames even when the server has the lazy enhancer cold', async () => {
      const result = await serveThenHydrate({ server: 'not loaded', client: 'not loaded' });

      expect(result.serverFrameTypes).toEqual(['focus']);
      expect(result.hydratedFrameTypes).toEqual(['focus']);
      result.unmount();
    });

    it('never runs the lazy enhancer on the client for code the server enhanced', async () => {
      const lazyEnhancer = vi.fn(enhanceCodeEmphasisLazy);
      Object.assign(lazyEnhancer, {
        enhancerName: enhanceCodeEmphasisLazy.enhancerName,
        enhancerLazy: true,
      });

      const result = await serveThenHydrate({ server: 'not loaded', client: 'not loaded' }, [
        lazyEnhancer,
      ]);

      expect(result.hydrationErrors).toEqual([]);
      expect(lazyEnhancer).not.toHaveBeenCalled();
      result.unmount();
    });
  });
});
