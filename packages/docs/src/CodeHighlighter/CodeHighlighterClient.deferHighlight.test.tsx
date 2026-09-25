/**
 * @vitest-environment jsdom
 *
 * `deferHighlight` holds variant and transform swaps while the async transform
 * deltas (`computeHastDeltas`) are still being computed, so a swap never paints
 * a tree that re-flows once they land. `useCode` picks the rendered variant on
 * its own, so the wait has to cover every variant of the block, not just the
 * variant the highlighter itself considers current. Rendering doesn't wait for
 * the deltas: the code shown meanwhile stays highlighted wherever it can be, and
 * is never older than the loaded code.
 */
import * as React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CodeHighlighterClient } from './CodeHighlighterClient';
import { CodeHighlighterContext } from './CodeHighlighterContext';
import { CodeContext } from '../CodeProvider/CodeContext';
import type { ComputeHastDeltasLoader } from '../CodeProvider/CodeContext';
import { useCode } from '../useCode';
import { preloadTransformEngine } from '../useCode/transformEngineCache';
import { createParseSource } from '../pipeline/parseSource';
import { parseCode } from '../pipeline/loadIsomorphicCodeVariant/parseCode';
import { computeHastDeltas } from '../pipeline/loadIsomorphicCodeVariant/computeHastDeltas';
import { transformSource } from '../pipeline/loadIsomorphicCodeVariant/transformSource';
import type { Code, ContentProps, ParseSource, Transforms, VariantCode } from './types';

const typedSource = 'const typed: number = 1;\nexport default typed;\n';
const typedJavaScript = 'const typed = 1;\nexport default typed;\n';

let parseSource: ParseSource;
let typedTransforms: Transforms;

beforeAll(async () => {
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
  await preloadTransformEngine();
  parseSource = await createParseSource();
  // A TS → JS transform with a real source delta, as the build produces it.
  typedTransforms = (await transformSource(typedSource, 'Typed.tsx', [
    {
      extensions: ['tsx'],
      transformer: async () => ({ js: { source: typedJavaScript, fileName: 'Typed.jsx' } }),
    },
  ]))!;
});

beforeEach(() => {
  window.localStorage.clear();
});

const plainVariant = (name = 'Plain'): VariantCode => ({
  fileName: `${name}.js`,
  source: `const ${name.toLowerCase()} = 1;\n`,
});

const typedVariant = (name = 'Typed'): VariantCode => ({
  fileName: `${name}.tsx`,
  source: typedSource.replaceAll('typed', name.toLowerCase()),
  transforms: structuredClone(typedTransforms),
});

/**
 * A `computeHastDeltasLoader` whose computations finish only when the test
 * resolves them.
 */
function createHeldDeltas() {
  const pending: Array<() => void> = [];
  const loader: ComputeHastDeltasLoader = async () => (parsedCode, parser) =>
    new Promise<Code>((resolve) => {
      pending.push(() => resolve(computeHastDeltas(parsedCode, parser)));
    });
  const resolveAll = async () => {
    await act(async () => {
      pending.splice(0).forEach((finish) => finish());
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });
  };
  return { loader, pending, resolveAll };
}

/** Each distinct committed state of the rendered file: its name and markup. */
let commits: Array<{ fileName: string; markup: string }> = [];

function Demo(props: ContentProps<object>) {
  const code = useCode(props, { variantSwapDelay: 0, transformDelay: 0 });
  const deferHighlight = React.useContext(CodeHighlighterContext)?.deferHighlight;
  const preRef = React.useRef<HTMLPreElement>(null);
  React.useLayoutEffect(() => {
    const fileName = code.selectedFileName ?? '';
    const markup = preRef.current?.innerHTML ?? '';
    const last = commits[commits.length - 1];
    if (!last || last.fileName !== fileName || last.markup !== markup) {
      commits.push({ fileName, markup });
    }
  });
  return (
    <div>
      <span data-testid="file">{code.selectedFileName}</span>
      <span data-testid="defer">{String(!!deferHighlight)}</span>
      <pre ref={preRef} data-testid="code">
        {code.selectedFile}
      </pre>
      {code.variants.map((variant) => (
        <button
          key={variant}
          type="button"
          data-testid={`variant:${variant}`}
          onClick={() => code.selectVariant(variant)}
        >
          {variant}
        </button>
      ))}
      <button type="button" data-testid="js" onClick={() => code.selectTransform('js')}>
        JS
      </button>
    </div>
  );
}

/**
 * Renders a block, returning a function that replaces its `code` (as a new
 * `code` prop, a `refresh()` or a lazily loaded variant does, starting a re-parse).
 */
function mountBlock(code: Code, loader: ComputeHastDeltasLoader) {
  commits = [];
  const block = (current: Code) => (
    <CodeContext.Provider
      value={{
        parseSource,
        sourceParser: Promise.resolve(parseSource),
        parseCode,
        computeHastDeltasLoader: loader,
      }}
    >
      <CodeHighlighterClient variants={Object.keys(current)} code={current} highlightAfter="init">
        <Demo />
      </CodeHighlighterClient>
    </CodeContext.Provider>
  );
  const view = render(block(code));
  return (next: Code) => view.rerender(block(next));
}

/** Lets timers, frames and the coordinated swap barriers run their course. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
  });
}

const renderedFileName = () => screen.getByTestId('file').textContent;
const isDeferred = () => screen.getByTestId('defer').textContent === 'true';
const renderedText = () => screen.getByTestId('code').textContent ?? '';
/** Whether rendered code markup is highlighted (split into highlighted lines). */
const isHighlighted = (markup: string) => markup.includes('class="line"');

/**
 * A TypeScript variant holding `const <name>: number = <value>`, with the TS →
 * JS transform the build computes for exactly that source.
 */
async function typedVariantOf(name: string, value: number): Promise<VariantCode> {
  const fileName = `${name}.tsx`;
  const source = `const ${name.toLowerCase()}: number = ${value};\nexport default ${name.toLowerCase()};\n`;
  const transforms = await transformSource(source, fileName, [
    {
      extensions: ['tsx'],
      transformer: async (text) => ({
        js: { source: text.replace(': number', ''), fileName: `${name}.jsx` },
      }),
    },
  ]);
  return { fileName, source, transforms };
}

describe('CodeHighlighterClient deferHighlight while transform deltas are computed', () => {
  it('holds a switch into a variant with transforms, and its JS toggle, until the deltas land', async () => {
    const deltas = createHeldDeltas();
    mountBlock({ Plain: plainVariant(), Typed: typedVariant() }, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    await settle();
    expect(renderedFileName()).toBe('Plain.js');
    expect(isDeferred()).toBe(true);
    const commitsBefore = commits.length;

    // Switch to the TypeScript variant, then ask for JS, while the deltas are
    // still being computed.
    act(() => {
      screen.getByTestId('variant:Typed').click();
    });
    await settle();
    act(() => {
      screen.getByTestId('js').click();
    });
    await settle();

    // Nothing commits until they land.
    expect(renderedFileName()).toBe('Plain.js');
    expect(commits).toHaveLength(commitsBefore);

    await deltas.resolveAll();
    await waitFor(() => expect(renderedFileName()).toBe('Typed.tsx'));
    expect(isDeferred()).toBe(false);

    act(() => {
      screen.getByTestId('js').click();
    });
    await waitFor(() => expect(renderedFileName()).toBe('Typed.jsx'));
    await settle();
    expect(screen.getByTestId('code').textContent).toContain('const typed = 1;');

    // Each swap painted its final tree: the variant in TypeScript, then in
    // JavaScript, with no re-flow after either.
    const typedCommits = commits
      .slice(commitsBefore)
      .filter(({ fileName }) => fileName !== 'Plain.js');
    expect(typedCommits.map(({ fileName }) => fileName)).toEqual(['Typed.tsx', 'Typed.jsx']);
  });

  it('holds a switch out of a variant with transforms into one without, until the deltas land', async () => {
    const deltas = createHeldDeltas();
    mountBlock({ Typed: typedVariant(), Plain: plainVariant() }, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    expect(isDeferred()).toBe(true);

    act(() => {
      screen.getByTestId('variant:Plain').click();
    });
    await settle();
    expect(renderedFileName()).toBe('Typed.tsx');

    await deltas.resolveAll();
    await waitFor(() => expect(renderedFileName()).toBe('Plain.js'));
    expect(isDeferred()).toBe(false);
  });

  it('holds a switch between variants that all have transforms, until the deltas land', async () => {
    const deltas = createHeldDeltas();
    mountBlock({ Typed: typedVariant(), Other: typedVariant('Other') }, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    expect(isDeferred()).toBe(true);

    act(() => {
      screen.getByTestId('variant:Other').click();
    });
    await settle();
    expect(renderedFileName()).toBe('Typed.tsx');

    await deltas.resolveAll();
    await waitFor(() => expect(renderedFileName()).toBe('Other.tsx'));
    expect(isDeferred()).toBe(false);
  });

  it('never waits for the deltas when no variant has transforms', async () => {
    const deltas = createHeldDeltas();
    mountBlock({ Plain: plainVariant(), Other: plainVariant('Other') }, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    expect(isDeferred()).toBe(false);

    act(() => {
      screen.getByTestId('variant:Other').click();
    });
    await waitFor(() => expect(renderedFileName()).toBe('Other.js'));
    expect(deltas.pending).toHaveLength(1);
    expect(isDeferred()).toBe(false);

    await deltas.resolveAll();
  });
});

describe('CodeHighlighterClient rendering while the deltas of a re-parse are computed', () => {
  /**
   * Renders `code`, lets its first deltas land, applies `before` (e.g. a
   * transform toggle), then replaces the code with `next` and returns the commits
   * made from then on, with the deltas for `next` still pending.
   */
  async function replaceWhileDeltasPending(code: Code, next: Code, before?: () => Promise<void>) {
    const deltas = createHeldDeltas();
    const replace = mountBlock(code, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    await deltas.resolveAll();
    await settle();
    await before?.();
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);

    const commitsBefore = commits.length;
    act(() => {
      replace(next);
    });
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    await settle();
    expect(isDeferred()).toBe(true);
    return { deltas, commitsAfterReplace: () => commits.slice(commitsBefore) };
  }

  it('keeps a variant without transforms highlighted, with its new content, in a mixed block', async () => {
    const typed = await typedVariantOf('Typed', 1);
    const { deltas, commitsAfterReplace } = await replaceWhileDeltasPending(
      { Plain: plainVariant(), Typed: typed },
      { Plain: { ...plainVariant(), source: 'const plain = 2;\n' }, Typed: { ...typed } },
    );

    expect(renderedText()).toContain('const plain = 2;');
    expect(commitsAfterReplace().length).toBeGreaterThan(0);
    for (const { markup } of commitsAfterReplace()) {
      expect(isHighlighted(markup)).toBe(true);
      expect(markup).not.toContain('= <span class="pl-c1 fgd-num">1</span>');
    }

    await deltas.resolveAll();
    expect(renderedText()).toContain('const plain = 2;');
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);
  });

  it('keeps TypeScript highlighted, with its new content, in a block where every variant has transforms', async () => {
    const other = await typedVariantOf('Other', 1);
    const { deltas, commitsAfterReplace } = await replaceWhileDeltasPending(
      { Typed: await typedVariantOf('Typed', 1), Other: other },
      { Typed: await typedVariantOf('Typed', 5), Other: { ...other } },
    );

    expect(renderedText()).toContain('const typed: number = 5;');
    expect(commitsAfterReplace().length).toBeGreaterThan(0);
    for (const { markup } of commitsAfterReplace()) {
      expect(isHighlighted(markup)).toBe(true);
    }

    await deltas.resolveAll();
    expect(renderedText()).toContain('const typed: number = 5;');
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);
  });

  const selectJavaScript = async () => {
    act(() => {
      screen.getByTestId('js').click();
    });
    await waitFor(() => expect(renderedFileName()).toBe('Typed.jsx'));
    await settle();
  };

  it('keeps the JavaScript tree highlighted when a re-parse leaves the content unchanged', async () => {
    const typed = await typedVariantOf('Typed', 1);
    const other = await typedVariantOf('Other', 1);
    const { deltas, commitsAfterReplace } = await replaceWhileDeltasPending(
      { Typed: typed, Other: other },
      { Typed: structuredClone(typed), Other: structuredClone(other) },
      selectJavaScript,
    );

    expect(renderedFileName()).toBe('Typed.jsx');
    expect(renderedText()).toContain('const typed = 1;');
    for (const { markup } of commitsAfterReplace()) {
      expect(isHighlighted(markup)).toBe(true);
    }

    await deltas.resolveAll();
    expect(renderedText()).toContain('const typed = 1;');
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);
  });

  it('shows changed JavaScript as plain text until its deltas land, never the old or untransformed code', async () => {
    const other = await typedVariantOf('Other', 1);
    const { deltas, commitsAfterReplace } = await replaceWhileDeltasPending(
      { Typed: await typedVariantOf('Typed', 1), Other: other },
      { Typed: await typedVariantOf('Typed', 5), Other: { ...other } },
      selectJavaScript,
    );

    expect(renderedFileName()).toBe('Typed.jsx');
    expect(commitsAfterReplace().length).toBeGreaterThan(0);
    for (const { fileName, markup } of commitsAfterReplace()) {
      expect(fileName).toBe('Typed.jsx');
      expect(markup).toContain('const typed = 5;');
      expect(markup).not.toContain('number');
    }

    await deltas.resolveAll();
    await settle();
    expect(renderedFileName()).toBe('Typed.jsx');
    expect(renderedText()).toContain('const typed = 5;');
    expect(renderedText()).not.toContain('number');
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);
  });

  it('renders the first load as it did, plain until the first deltas land', async () => {
    const deltas = createHeldDeltas();
    mountBlock({ Plain: plainVariant(), Typed: await typedVariantOf('Typed', 1) }, deltas.loader);
    await waitFor(() => expect(deltas.pending).toHaveLength(1));
    await settle();

    expect(screen.getByTestId('code').innerHTML).toBe(
      '<pre spellcheck="false"><code data-total-lines="2" data-focused-lines="2"><span data-frame-type="focus" class="frame">const plain = 1;\n</span></code></pre>',
    );

    await deltas.resolveAll();
    expect(isHighlighted(screen.getByTestId('code').innerHTML)).toBe(true);
  });
});
