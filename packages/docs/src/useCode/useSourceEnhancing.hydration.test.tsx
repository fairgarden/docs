/**
 * @vitest-environment jsdom
 *
 * `enhanceCodeEmphasisLazy` runs synchronously once its chunk has loaded and returns
 * a promise before that. The server and the browser load the chunk independently,
 * so a hydration render that ran it whenever it happened to be loaded would differ
 * from the server HTML whenever one side had it and the other didn't. These tests
 * render on the "server" with `renderToString`, then hydrate with `hydrateRoot`,
 * with the chunk loaded on one side only.
 */
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import * as ReactDOMClient from 'react-dom/client';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { Element as HastElement } from 'hast';
import { useSourceEnhancing } from './useSourceEnhancing';
import { createParseSource } from '../pipeline/parseSource';
import { enhanceCodeEmphasis } from '../pipeline/enhanceCodeEmphasis';
import { enhanceCodeEmphasisLazy } from '../pipeline/enhanceCodeEmphasis/enhanceCodeEmphasisLazy';
import { decodeHastSource } from '../pipeline/loadIsomorphicCodeVariant/decodeHastSource';
import { createLazySourceEnhancer } from '../pipeline/createLazySourceEnhancer';
import type { LazySourceEnhancer } from '../pipeline/createLazySourceEnhancer';
import type {
  HastRoot,
  ParseSource,
  SourceComments,
  SourceEnhancer,
  SourceEnhancers,
  VariantSource,
} from '../CodeHighlighter/types';

type FrameTypes = Array<string | null>;

const source = `import * as React from 'react';

export function Button() {
  return <button type="button" />;
}`;

// Highlights the third line, so the emphasis enhancer splits the single frame the
// parser produces into three, the middle one `highlighted`.
const comments: SourceComments = { 3: ['@highlight'] };
const plainFrames: FrameTypes = [null];
const enhancedFrames: FrameTypes = [null, 'highlighted', null];

let parseSource: ParseSource;

beforeAll(async () => {
  parseSource = await createParseSource();
  // Lets `act` flush effects and updates.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/** The source as the parser produces it: highlighted, but not yet enhanced. */
function parseButton(): HastRoot {
  return parseSource(source, 'Button.tsx');
}

function getFrameTypes(root: HastRoot | null): FrameTypes {
  return (root?.children ?? [])
    .filter((child): child is HastElement => child.type === 'element')
    .map((frame) => {
      const frameType = frame.properties.dataFrameType;
      return frameType == null ? null : String(frameType);
    });
}

/**
 * Renders one `<span class="frame">` per frame of the enhanced source, and reports
 * the frame types of every render through `onRender`.
 */
function EnhancedFrames(props: {
  source: VariantSource;
  sourceEnhancers: SourceEnhancers;
  onRender?: (frameTypes: FrameTypes) => void;
}) {
  const { enhancedSource } = useSourceEnhancing({
    source: props.source,
    fileName: 'Button.tsx',
    comments,
    sourceEnhancers: props.sourceEnhancers,
  });
  const frameTypes = getFrameTypes(decodeHastSource(enhancedSource));
  props.onRender?.(frameTypes);
  return (
    <pre>
      {frameTypes.map((frameType, index) => (
        <span key={index} className="frame" data-frame-type={frameType ?? undefined} />
      ))}
    </pre>
  );
}

/** The HTML the server renders for `element`. */
function toServerHtml(element: React.ReactElement): string {
  return ReactDOMServer.renderToString(element);
}

async function setLazyEnhancer(
  state: 'loaded' | 'not loaded',
  lazyEnhancer: LazySourceEnhancer = enhanceCodeEmphasisLazy,
) {
  lazyEnhancer.reset();
  if (state === 'loaded') {
    await lazyEnhancer.preload();
  }
}

function getFrameTypesInDom(container: HTMLElement): FrameTypes {
  return Array.from(container.querySelectorAll('.frame')).map((frame) =>
    frame.getAttribute('data-frame-type'),
  );
}

/**
 * Renders `element` to HTML with the lazy enhancer in `server` state, then hydrates
 * that HTML with it in `client` state. Returns the frame types of the server HTML and
 * of the client's first render, plus every hydration error React reported.
 */
async function serveThenHydrate(
  createBlock: (onRender?: (frameTypes: FrameTypes) => void) => React.ReactElement,
  lazyEnhancer: { server: 'loaded' | 'not loaded'; client: 'loaded' | 'not loaded' },
  enhancer?: LazySourceEnhancer,
) {
  await setLazyEnhancer(lazyEnhancer.server, enhancer);
  const container = document.createElement('div');
  container.innerHTML = toServerHtml(createBlock());
  document.body.append(container);

  await setLazyEnhancer(lazyEnhancer.client, enhancer);
  const serverFrameTypes = getFrameTypesInDom(container);

  const clientRenders: FrameTypes[] = [];
  const hydrationErrors: string[] = [];
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    hydrationErrors.push(args.map(String).join(' '));
  });
  let root: ReactDOMClient.Root | undefined;
  try {
    await React.act(async () => {
      root = ReactDOMClient.hydrateRoot(
        container,
        createBlock((frameTypes) => clientRenders.push(frameTypes)),
        { onRecoverableError: (error) => hydrationErrors.push(String(error)) },
      );
    });
  } finally {
    consoleError.mockRestore();
  }

  return {
    serverFrameTypes,
    firstClientFrameTypes: clientRenders[0],
    clientRenderCount: clientRenders.length,
    hydrationErrors,
    container,
    unmount: () => {
      React.act(() => root?.unmount());
      container.remove();
    },
  };
}

describe('useSourceEnhancing', () => {
  describe('hydration with a lazily loaded enhancer', () => {
    const createLazyBlock = (onRender?: (frameTypes: FrameTypes) => void) => (
      <EnhancedFrames
        source={parseButton()}
        sourceEnhancers={[enhanceCodeEmphasisLazy]}
        onRender={onRender}
      />
    );

    it('hydrates without a mismatch when only the client has the enhancer loaded', async () => {
      const result = await serveThenHydrate(createLazyBlock, {
        server: 'not loaded',
        client: 'loaded',
      });

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has the enhancer loaded', async () => {
      const result = await serveThenHydrate(createLazyBlock, {
        server: 'loaded',
        client: 'not loaded',
      });

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      result.unmount();
    });

    it('server-renders the same markup whether or not the server has the enhancer loaded', async () => {
      const markup: string[] = [];
      await setLazyEnhancer('not loaded');
      markup.push(toServerHtml(createLazyBlock()));
      await setLazyEnhancer('loaded');
      markup.push(toServerHtml(createLazyBlock()));

      expect(markup[1]).toBe(markup[0]);
    });

    it('applies the enhancer right after hydrating when the client has it loaded', async () => {
      const result = await serveThenHydrate(createLazyBlock, {
        server: 'not loaded',
        client: 'loaded',
      });

      expect(result.serverFrameTypes).toEqual(plainFrames);
      expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      result.unmount();
    });

    it('applies the enhancer once it loads when the client has it cold', async () => {
      const result = await serveThenHydrate(createLazyBlock, {
        server: 'loaded',
        client: 'not loaded',
      });

      await vi.waitFor(() => {
        expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      });
      result.unmount();
    });

    it('never runs the enhancer for a source that already recorded it', async () => {
      const lazyEnhancer = vi.fn(enhanceCodeEmphasisLazy);
      Object.assign(lazyEnhancer, { enhancerName: enhanceCodeEmphasisLazy.enhancerName });
      const enhancedOnServer = await enhanceCodeEmphasis(parseButton(), comments, 'Button.tsx');
      enhancedOnServer.data = {
        ...enhancedOnServer.data,
        appliedEnhancers: ['enhanceCodeEmphasis'],
      };

      const result = await serveThenHydrate(
        (onRender) => (
          <EnhancedFrames
            source={enhancedOnServer}
            sourceEnhancers={[lazyEnhancer]}
            onRender={onRender}
          />
        ),
        { server: 'not loaded', client: 'not loaded' },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.serverFrameTypes).toEqual(enhancedFrames);
      expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      expect(lazyEnhancer).not.toHaveBeenCalled();
      result.unmount();
    });
  });

  describe('hydration with a custom enhancer built with createLazySourceEnhancer', () => {
    /** Highlights every frame, so an enhanced render is easy to tell apart. */
    const highlightFrames: SourceEnhancer = (root) => ({
      ...root,
      children: root.children.map((child) =>
        child.type === 'element'
          ? { ...child, properties: { ...child.properties, dataFrameType: 'highlighted' } }
          : child,
      ),
    });
    const highlightFramesLazy = createLazySourceEnhancer(
      'highlightFrames',
      async () => highlightFrames,
    );

    const createCustomBlock = (onRender?: (frameTypes: FrameTypes) => void) => (
      <EnhancedFrames
        source={parseButton()}
        sourceEnhancers={[highlightFramesLazy]}
        onRender={onRender}
      />
    );

    it('hydrates without a mismatch when only the client has the enhancer loaded', async () => {
      const result = await serveThenHydrate(
        createCustomBlock,
        { server: 'not loaded', client: 'loaded' },
        highlightFramesLazy,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      // Enhanced right after hydration.
      expect(getFrameTypesInDom(result.container)).toEqual(['highlighted']);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has the enhancer loaded', async () => {
      const result = await serveThenHydrate(
        createCustomBlock,
        { server: 'loaded', client: 'not loaded' },
        highlightFramesLazy,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      // Enhanced once it loads, right after hydration.
      await vi.waitFor(() => {
        expect(getFrameTypesInDom(result.container)).toEqual(['highlighted']);
      });
      result.unmount();
    });
  });

  describe('hydration with an unmarked enhancer that loads on demand', () => {
    // Returns synchronously once "loaded" and a promise before, like a hand-built
    // lazy enhancer, without any marker. Each side loads it independently.
    let loaded = false;
    const emphasisOnDemand: SourceEnhancer = (root, commentsOnLine, fileName) => {
      if (loaded) {
        return enhanceCodeEmphasis(root, commentsOnLine, fileName);
      }
      return Promise.resolve().then(() => {
        loaded = true;
        return enhanceCodeEmphasis(root, commentsOnLine, fileName);
      });
    };
    const onDemandEnhancer: LazySourceEnhancer = Object.assign(emphasisOnDemand, {
      enhancerName: 'emphasisOnDemand',
      preload: async () => {
        loaded = true;
      },
      reset: () => {
        loaded = false;
      },
    });
    const createOnDemandBlock = (onRender?: (frameTypes: FrameTypes) => void) => (
      <EnhancedFrames
        source={parseButton()}
        sourceEnhancers={[onDemandEnhancer]}
        onRender={onRender}
      />
    );

    it('hydrates without a mismatch when only the client has it loaded', async () => {
      const result = await serveThenHydrate(
        createOnDemandBlock,
        { server: 'not loaded', client: 'loaded' },
        onDemandEnhancer,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      result.unmount();
    });

    it('hydrates without a mismatch when only the server has it loaded', async () => {
      const result = await serveThenHydrate(
        createOnDemandBlock,
        { server: 'loaded', client: 'not loaded' },
        onDemandEnhancer,
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.firstClientFrameTypes).toEqual(result.serverFrameTypes);
      await vi.waitFor(() => {
        expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      });
      result.unmount();
    });
  });

  describe('renders after hydration', () => {
    async function countClientPasses(createBlock: typeof createCountedBlock) {
      const result = await serveThenHydrate(createBlock, { server: 'loaded', client: 'loaded' });
      result.unmount();
      return result.clientRenderCount;
    }

    const enhancedOnServer = () => {
      const root = enhanceCodeEmphasis(parseButton(), comments, 'Button.tsx') as HastRoot;
      root.data = { ...root.data, appliedEnhancers: ['enhanceCodeEmphasis'] };
      return root;
    };

    function createCountedBlock(
      onRender?: (frameTypes: FrameTypes) => void,
      source: VariantSource = enhancedOnServer(),
      sourceEnhancers: SourceEnhancers = [enhanceCodeEmphasisLazy],
    ) {
      return (
        <EnhancedFrames source={source} sourceEnhancers={sourceEnhancers} onRender={onRender} />
      );
    }

    it('does not render again when every enhancer already ran on the server', async () => {
      expect(await countClientPasses(createCountedBlock)).toBe(1);
    });

    it('does not render again when every enhancer runs in the server render', async () => {
      const count = await countClientPasses((onRender) =>
        createCountedBlock(onRender, parseButton(), [enhanceCodeEmphasis]),
      );

      expect(count).toBe(1);
    });

    it('renders again to run an enhancer it held back', async () => {
      const count = await countClientPasses((onRender) =>
        createCountedBlock(onRender, parseButton(), [enhanceCodeEmphasisLazy]),
      );

      expect(count).toBeGreaterThan(1);
    });
  });

  describe('rendering outside hydration', () => {
    it('runs an enhancer not marked enhancerSync right after hydration, not in the server render', async () => {
      const custom: SourceEnhancer = (root) => enhanceCodeEmphasis(root, comments, 'Button.tsx');

      const result = await serveThenHydrate(
        (onRender) => (
          <EnhancedFrames source={parseButton()} sourceEnhancers={[custom]} onRender={onRender} />
        ),
        { server: 'loaded', client: 'loaded' },
      );

      expect(result.hydrationErrors).toEqual([]);
      expect(result.serverFrameTypes).toEqual(plainFrames);
      expect(getFrameTypesInDom(result.container)).toEqual(enhancedFrames);
      result.unmount();
    });

    it('runs an enhancer marked enhancerSync in the server render', () => {
      const custom: SourceEnhancer = (root) => enhanceCodeEmphasis(root, comments, 'Button.tsx');
      custom.enhancerSync = true;

      const container = document.createElement('div');
      container.innerHTML = toServerHtml(
        <EnhancedFrames source={parseButton()} sourceEnhancers={[custom]} />,
      );

      expect(getFrameTypesInDom(container)).toEqual(enhancedFrames);
    });

    it('still applies a synchronous enhancer in the server render', () => {
      const container = document.createElement('div');
      container.innerHTML = toServerHtml(
        <EnhancedFrames source={parseButton()} sourceEnhancers={[enhanceCodeEmphasis]} />,
      );

      expect(getFrameTypesInDom(container)).toEqual(enhancedFrames);
    });

    it('applies a loaded lazy enhancer on the first render of a client-only mount', async () => {
      await setLazyEnhancer('loaded');
      const renders: FrameTypes[] = [];

      render(
        <EnhancedFrames
          source={parseButton()}
          sourceEnhancers={[enhanceCodeEmphasisLazy]}
          onRender={(frameTypes) => renders.push(frameTypes)}
        />,
      );

      expect(renders[0]).toEqual(enhancedFrames);
    });
  });
});
