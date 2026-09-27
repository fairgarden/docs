/**
 * @vitest-environment jsdom
 *
 * Inline code with the default `highlightAfter`. The server components are resolved
 * first, as the RSC render does, into the client element that both the server render
 * and the browser render. It is then rendered to HTML with `renderToString` and
 * hydrated with `hydrateRoot`, with the lazily loaded enhancers loaded on one side
 * only: the server and the browser load them independently, so either can have one
 * while the other doesn't.
 */
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import * as ReactDOMClient from 'react-dom/client';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { CodeHighlighter } from './CodeHighlighter';
import { CodeHighlighterClient } from './CodeHighlighterClient';
import { useCodeFallback } from './useCodeFallback';
import { CodeProviderLazy } from '../CodeProvider/CodeProviderLazy';
import { useCode } from '../useCode';
import { hastToJsx } from '../pipeline/hastUtils';
import { createParseSource } from '../pipeline/parseSource';
import {
  createEnhanceCodeEmphasis,
  enhanceCodeEmphasis,
} from '../pipeline/enhanceCodeEmphasis/enhanceCodeEmphasis';
import { enhanceCodeEmphasisLazy } from '../pipeline/enhanceCodeEmphasis/enhanceCodeEmphasisLazy';
import { createLazySourceEnhancer } from '../pipeline/createLazySourceEnhancer';
import type { LazySourceEnhancer } from '../pipeline/createLazySourceEnhancer';
import type {
  Code,
  CodeHighlighterProps,
  ContentLoadingProps,
  ContentProps,
  ParseSource,
  SourceEnhancer,
} from './types';

type LoadState = 'loaded' | 'not loaded';

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

/** Long enough for the emphasis enhancer to collapse it to a window. */
const longCode: Code = {
  Default: {
    fileName: 'values.ts',
    source: Array.from({ length: 40 }, (_, index) => `const value${index} = ${index};`).join('\n'),
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

/**
 * The inline block as the page renders it: `CodeHighlighter` resolved on the server,
 * under a default `CodeProviderLazy`, one with the given `sourceEnhancers`, or none.
 */
async function createInlinePage(
  options: {
    code?: Code;
    serverEnhancers?: SourceEnhancer[];
    provider?: 'default' | 'none' | SourceEnhancer[];
  } = {},
): Promise<React.ReactElement> {
  const { code = inlineCode, serverEnhancers, provider = 'default' } = options;
  const clientElement = await resolveServerComponents(
    <CodeHighlighter
      code={code}
      Content={SelectedFileContent}
      sourceParser={sourceParser}
      sourceEnhancers={serverEnhancers}
    />,
  );
  if (provider === 'none') {
    return clientElement;
  }
  return (
    <CodeProviderLazy sourceEnhancers={provider === 'default' ? undefined : provider}>
      {clientElement}
    </CodeProviderLazy>
  );
}

/** The HTML the server renders for `element`. */
function toServerHtml(element: React.ReactElement): string {
  return ReactDOMServer.renderToString(element);
}

async function setLoadState(state: LoadState, enhancers: LazySourceEnhancer[]) {
  for (const enhancer of enhancers) {
    enhancer.reset();
    if (state === 'loaded') {
      // eslint-disable-next-line no-await-in-loop
      await enhancer.preload();
    }
  }
}

/** Reads the rendered code blocks: each frame's type and description, and the window. */
function readCode(container: HTMLElement) {
  const frames = Array.from(container.querySelectorAll('.frame'));
  return {
    frameTypes: frames.map((frame) => frame.getAttribute('data-frame-type')),
    frameDescriptions: frames.map((frame) => frame.getAttribute('data-frame-description')),
    focusedLines: container.querySelector('code')?.getAttribute('data-focused-lines') ?? null,
  };
}

/**
 * Renders `page` to HTML with the lazy enhancers (the emphasis enhancer by default)
 * in `server` state, then hydrates that HTML with them in `client` state and lets the
 * client settle.
 */
async function serveThenHydrate(
  page: React.ReactElement,
  loadState: { server: LoadState; client: LoadState },
  lazyEnhancers: LazySourceEnhancer[] = [enhanceCodeEmphasisLazy],
) {
  await setLoadState(loadState.server, lazyEnhancers);
  const container = document.createElement('div');
  container.innerHTML = toServerHtml(page);
  document.body.append(container);
  const server = readCode(container);

  await setLoadState(loadState.client, lazyEnhancers);
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
    // Let the lazily loaded enhancers finish, if the client started loading them.
    await React.act(async () => {
      await Promise.all(lazyEnhancers.map((enhancer) => enhancer.preload()));
    });
  } finally {
    consoleError.mockRestore();
  }

  return {
    server,
    hydrated: readCode(container),
    hydrationErrors,
    unmount: () => {
      React.act(() => root?.unmount());
      container.remove();
    },
  };
}

describe('CodeHighlighter hydration', () => {
  describe('inline code under a default CodeProviderLazy', () => {
    it('hydrates without a mismatch when only the client has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate(await createInlinePage(), {
        server: 'not loaded',
        client: 'loaded',
      });

      expect(result.hydrationErrors).toEqual([]);
      // The provider's emphasis enhancer runs right after hydration.
      expect(result.server.frameTypes).toEqual([null]);
      expect(result.hydrated.frameTypes).toEqual(['focus']);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate(await createInlinePage(), {
        server: 'loaded',
        client: 'not loaded',
      });

      expect(result.hydrationErrors).toEqual([]);
      expect(result.server.frameTypes).toEqual([null]);
      expect(result.hydrated.frameTypes).toEqual(['focus']);
      result.unmount();
    });

    it('server-renders the same markup whether or not the server has the lazy enhancer loaded', async () => {
      const page = await createInlinePage();
      const markup: string[] = [];

      await setLoadState('not loaded', [enhanceCodeEmphasisLazy]);
      markup.push(toServerHtml(page));
      await setLoadState('loaded', [enhanceCodeEmphasisLazy]);
      markup.push(toServerHtml(page));

      expect(markup[1]).toBe(markup[0]);
    });
  });

  describe('inline code with the emphasis enhancer passed to the server', () => {
    it('server-renders the emphasis frames, even with the lazy enhancer cold', async () => {
      const result = await serveThenHydrate(
        await createInlinePage({ serverEnhancers: [enhanceCodeEmphasis] }),
        { server: 'not loaded', client: 'not loaded' },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.server.frameTypes).toEqual(['focus']);
      expect(result.hydrated.frameTypes).toEqual(['focus']);
      result.unmount();
    });

    it('never runs the lazy enhancer on the client', async () => {
      const lazyEnhancer = vi.fn(enhanceCodeEmphasisLazy);
      Object.assign(lazyEnhancer, { enhancerName: enhanceCodeEmphasisLazy.enhancerName });

      const result = await serveThenHydrate(
        await createInlinePage({
          serverEnhancers: [enhanceCodeEmphasis],
          provider: [lazyEnhancer],
        }),
        { server: 'not loaded', client: 'not loaded' },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(lazyEnhancer).not.toHaveBeenCalled();
      result.unmount();
    });
  });

  describe('inline code under a provider with custom emphasis options', () => {
    it('applies the provider options in the server render, with no change after hydration', async () => {
      const result = await serveThenHydrate(
        await createInlinePage({
          code: longCode,
          provider: [createEnhanceCodeEmphasis({ focusFramesMaxSize: 30 })],
        }),
        { server: 'not loaded', client: 'not loaded' },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.server.focusedLines).toBe('30');
      expect(result.hydrated.focusedLines).toBe('30');
      result.unmount();
    });
  });

  describe('inline code with no provider', () => {
    it('renders in full, with no emphasis frames', async () => {
      const result = await serveThenHydrate(
        await createInlinePage({ code: longCode, provider: 'none' }),
        {
          server: 'loaded',
          client: 'loaded',
        },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.server).toMatchObject({ frameTypes: [null], focusedLines: '40' });
      expect(result.hydrated).toMatchObject({ frameTypes: [null], focusedLines: '40' });
      result.unmount();
    });
  });

  describe('a custom enhancer built with createLazySourceEnhancer', () => {
    /** Describes every frame, an enhancement only the client runs. */
    const describeFrames: SourceEnhancer = (root) => ({
      ...root,
      children: root.children.map((child) =>
        child.type === 'element'
          ? { ...child, properties: { ...child.properties, dataFrameDescription: 'described' } }
          : child,
      ),
    });
    const describeFramesLazy = createLazySourceEnhancer(
      'describeFrames',
      async () => describeFrames,
    );
    const providerEnhancers = [enhanceCodeEmphasisLazy, describeFramesLazy];

    it('hydrates without a mismatch when only the client has it loaded, then runs it', async () => {
      const result = await serveThenHydrate(
        await createInlinePage({ provider: providerEnhancers }),
        { server: 'not loaded', client: 'loaded' },
        providerEnhancers,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.hydrated.frameTypes).toEqual(['focus']);
      expect(result.hydrated.frameDescriptions).toEqual(['described']);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has it loaded, then runs it', async () => {
      const result = await serveThenHydrate(
        await createInlinePage({ provider: providerEnhancers }),
        { server: 'loaded', client: 'not loaded' },
        providerEnhancers,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.hydrated.frameTypes).toEqual(['focus']);
      expect(result.hydrated.frameDescriptions).toEqual(['described']);
      result.unmount();
    });
  });

  describe('the loading fallback of a CodeHighlighter rendered on the client', () => {
    /** Paints the fallback frames the server prepared. */
    function FallbackLoading(props: ContentLoadingProps<object>) {
      const { source, focusedLines } = useCodeFallback(props);
      return (
        <pre>
          <code data-focused-lines={focusedLines}>{source ? hastToJsx(source) : null}</code>
        </pre>
      );
    }

    // No loader functions, so the whole block, loading fallback included, renders in
    // the client tree: the server render and the hydration each prepare the fallback.
    const page = (
      <CodeProviderLazy>
        <CodeHighlighter
          {...({
            code: longCode,
            Content: SelectedFileContent,
            ContentLoading: FallbackLoading,
            sourceEnhancers: [enhanceCodeEmphasisLazy],
          } as CodeHighlighterProps<object>)}
        />
      </CodeProviderLazy>
    );

    it('hydrates without a mismatch when only the client has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate(page, { server: 'not loaded', client: 'loaded' });

      expect(result.hydrationErrors).toEqual([]);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has the lazy enhancer loaded', async () => {
      const result = await serveThenHydrate(page, { server: 'loaded', client: 'not loaded' });

      expect(result.hydrationErrors).toEqual([]);
      result.unmount();
    });
  });
});
