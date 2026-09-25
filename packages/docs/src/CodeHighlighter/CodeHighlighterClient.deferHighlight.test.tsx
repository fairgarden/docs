/**
 * @vitest-environment jsdom
 *
 * `deferHighlight` holds variant and transform swaps while the async transform
 * deltas (`computeHastDeltas`) are still being computed, so a swap never paints
 * a tree that re-flows once they land. `useCode` picks the rendered variant on
 * its own, so the wait has to cover every variant of the block, not just the
 * variant the highlighter itself considers current.
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

function renderBlock(code: Code, loader: ComputeHastDeltasLoader) {
  commits = [];
  const variants = Object.keys(code);
  return render(
    <CodeContext.Provider
      value={{
        parseSource,
        sourceParser: Promise.resolve(parseSource),
        parseCode,
        computeHastDeltasLoader: loader,
      }}
    >
      <CodeHighlighterClient variants={variants} code={code} highlightAfter="init">
        <Demo />
      </CodeHighlighterClient>
    </CodeContext.Provider>,
  );
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

describe('CodeHighlighterClient deferHighlight while transform deltas are computed', () => {
  it('holds a switch into a variant with transforms, and its JS toggle, until the deltas land', async () => {
    const deltas = createHeldDeltas();
    renderBlock({ Plain: plainVariant(), Typed: typedVariant() }, deltas.loader);
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
    renderBlock({ Typed: typedVariant(), Plain: plainVariant() }, deltas.loader);
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
    renderBlock({ Typed: typedVariant(), Other: typedVariant('Other') }, deltas.loader);
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
    renderBlock({ Plain: plainVariant(), Other: plainVariant('Other') }, deltas.loader);
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
