'use client';

import * as React from 'react';
import type { Root as HastRoot } from 'hast';
import { decodeHastSource } from '../pipeline/loadIsomorphicCodeVariant/decodeHastSource';
import type {
  HastRoot as RecordedHastRoot,
  SourceEnhancers,
  SourceComments,
  VariantSource,
} from '../CodeHighlighter/types';
import type { FallbackNode } from '../CodeHighlighter/fallbackFormat';
import { useIsHydrated } from '../CodeHighlighter/useIsHydrated';
import {
  recordEnhancerApplied,
  shouldSkipEnhancer,
} from '../pipeline/loadIsomorphicCodeVariant/runSourceEnhancers';

// Safety-net deadline (ms) for the async enhancer pass. A client-side enhancer that
// REJECTS or HANGS would otherwise leave `asyncWork` non-null forever — keeping
// `isEnhancing` true and locking the consumer (`<Pre>` via `useFileNavigation`) at its
// un-enhanced 'base' phase until a full page reload. On failure/timeout we settle to the
// already sync-enhanced result so the phase advances.
const ENHANCER_TIMEOUT_MS = 10_000;

/**
 * Applies enhancers sequentially to a HAST root, starting from a given index.
 * Each enhancer receives the output of the previous enhancer in the chain.
 * Enhancers with a stable `enhancerName` are skipped if already recorded on
 * the HAST root, and recorded after they run.
 */
async function applyEnhancersFrom(
  source: HastRoot,
  comments: SourceComments | undefined,
  fileName: string,
  enhancers: SourceEnhancers,
  startIndex: number,
): Promise<HastRoot> {
  let current = source;
  for (let i = startIndex; i < enhancers.length; i += 1) {
    const enhancer = enhancers[i];
    if (shouldSkipEnhancer(current, enhancer)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    current = await enhancer(current, comments, fileName);
    recordEnhancerApplied(current, enhancer);
  }
  return current;
}

/**
 * Whether `enhancers` would hold anything back from the server render and the
 * hydration of `root`: an enhancer the root hasn't recorded that isn't marked
 * `enhancerSync`. It reads only the recorded names and the enhancers' flags, so the
 * server and the browser agree on it.
 */
function holdsBackDuringHydration(root: RecordedHastRoot, enhancers: SourceEnhancers): boolean {
  const recorded = new Set(root.data?.appliedEnhancers);
  for (const enhancer of enhancers) {
    const name = enhancer.enhancerName;
    if (name && recorded.has(name)) {
      continue;
    }
    if (!enhancer.enhancerSync) {
      return true;
    }
    if (name) {
      recorded.add(name);
    }
  }
  return false;
}

export interface UseSourceEnhancingProps {
  /** The source to enhance (from transformed files or variant) */
  source: VariantSource | null | undefined;
  /** The filename for this source */
  fileName: string | undefined;
  /** Comments extracted from the source (typically from the original variant) */
  comments: SourceComments | undefined;
  /** Array of enhancer functions to apply */
  sourceEnhancers?: SourceEnhancers;
  /** Fallback data for deriving the DEFLATE decompression dictionary */
  fallback?: FallbackNode[];
}

export interface UseSourceEnhancingResult {
  /** The enhanced source */
  enhancedSource: VariantSource | null;
  /** Whether enhancement is currently in progress */
  isEnhancing: boolean;
}

interface AsyncWork {
  firstAsyncPromise: Promise<HastRoot>;
  asyncStartIndex: number;
}

interface EnhanceState {
  enhancedSource: VariantSource | null;
  asyncWork: AsyncWork | null;
  /** An enhancer was held back from the server render and the hydration. */
  deferred: boolean;
}

/**
 * Computes the synchronous enhancement result and any pending async work.
 * Enhancers are run in order; sync ones apply immediately, and the first
 * async enhancer's promise is captured so it can be continued in an effect.
 * Enhancers already recorded on the tree are skipped.
 *
 * While `hydrating` (the server render or the hydration), the run stops, without
 * calling it, at the first enhancer that isn't marked `enhancerSync`: it and the
 * ones after it wait for the render right after hydration.
 *
 * The source is decoded through the shared `decodeHastSource` cache, which
 * amortizes decompression and `JSON.parse` across other consumers (`Pre`,
 * `useFileNavigation`, `sourceLineCounts`). The variant `fallback` is forwarded
 * so a compressed payload is decompressed with its DEFLATE dictionary and each
 * frame's `data.fallback` is restored. The decoded tree is shared, and the
 * pipeline mutates `root.data` (`recordEnhancerApplied`), so it is copied right
 * before the first enhancer runs. When none runs, the source is returned as it is.
 */
function computeEnhanceState(
  source: VariantSource | null | undefined,
  comments: SourceComments | undefined,
  fileName: string | undefined,
  sourceEnhancers: SourceEnhancers | undefined,
  fallback: FallbackNode[] | undefined,
  hydrating: boolean,
): EnhanceState {
  if (!source || !sourceEnhancers || sourceEnhancers.length === 0) {
    return { enhancedSource: source ?? null, asyncWork: null, deferred: false };
  }
  const decoded = decodeHastSource(source, fallback);
  if (!decoded) {
    return { enhancedSource: source, asyncWork: null, deferred: false };
  }

  const name = fileName || 'unknown';
  let current: HastRoot = decoded;
  // The tree the enhancers ran on so far, or `undefined` while none has.
  let enhanced: HastRoot | undefined;
  for (let i = 0; i < sourceEnhancers.length; i += 1) {
    const enhancer = sourceEnhancers[i];
    if (shouldSkipEnhancer(current, enhancer)) {
      continue;
    }
    if (hydrating && !enhancer.enhancerSync) {
      return { enhancedSource: enhanced ?? source, asyncWork: null, deferred: true };
    }
    if (!enhanced) {
      current = structuredClone(current) as HastRoot;
    }
    const result = enhancer(current, comments, name);
    if (result instanceof Promise) {
      return {
        enhancedSource: enhanced ?? source,
        asyncWork: {
          firstAsyncPromise: result.then((resolved) => {
            recordEnhancerApplied(resolved, enhancer);
            return resolved;
          }),
          asyncStartIndex: i,
        },
        deferred: false,
      };
    }
    current = result;
    recordEnhancerApplied(current, enhancer);
    enhanced = current;
  }
  return { enhancedSource: enhanced ?? source, asyncWork: null, deferred: false };
}

/**
 * Hook that applies source enhancers to a single source file.
 *
 * Enhancers are functions that modify the HAST (Hypertext Abstract Syntax Tree)
 * representation of code. They receive the parsed HAST root, any comments extracted
 * from the source code, and the filename for context.
 *
 * Enhancement runs when the source or enhancers change: synchronous enhancers
 * apply during render, and asynchronous ones in the background, with the source
 * enhanced so far shown meanwhile, preventing layout shift since enhanced code
 * should be visually similar.
 *
 * @example
 * ```tsx
 * // Enhancer that adds line highlighting based on comments
 * const highlightEnhancer: SourceEnhancer = (root, comments, fileName) => {
 *   // Use comments like { 5: ['@highlight'] } to add highlighting
 *   return addHighlightToLines(root, comments);
 * };
 *
 * function MyCodeDisplay({ source, fileName }) {
 *   const enhancers = React.useMemo(() => [highlightEnhancer], []);
 *   const { enhancedSource, isEnhancing } = useSourceEnhancing({
 *     source,
 *     fileName,
 *     comments: undefined,
 *     sourceEnhancers: enhancers,
 *   });
 *   return <Pre>{enhancedSource}</Pre>;
 * }
 * ```
 *
 * @remarks
 * - Only HAST sources can be enhanced. String sources are returned unchanged.
 * - Enhancers already recorded on the source (`appliedEnhancers`, e.g. by the
 *   server or at build time) are skipped. When all of them are, the source is
 *   returned as it is.
 * - While server rendering and hydrating, only enhancers marked `enhancerSync`
 *   (such as `createEnhanceCodeEmphasis` enhancers) run. The others wait for the
 *   render right after hydration, so an enhancer that can return a promise never
 *   makes the hydrated markup differ from the server HTML. A component that holds
 *   nothing back doesn't render again after hydration.
 * - Enhancers must return stable references to avoid infinite re-renders.
 * - Use `React.useMemo` for the enhancers array to prevent unnecessary re-runs.
 */
export function useSourceEnhancing({
  source,
  fileName,
  comments,
  sourceEnhancers,
  fallback,
}: UseSourceEnhancingProps): UseSourceEnhancingResult {
  // Track previous values to detect changes
  const [prevSource, setPrevSource] = React.useState(source);
  const [prevEnhancers, setPrevEnhancers] = React.useState(sourceEnhancers);
  const [prevComments, setPrevComments] = React.useState(comments);
  const [prevFileName, setPrevFileName] = React.useState(fileName);

  // Hold back, while server rendering and hydrating, every enhancer the tree hasn't
  // recorded that isn't marked `enhancerSync`. Only such a component tracks
  // hydration, and so renders once more right after it.
  const holdsBack = React.useMemo(() => {
    if (!source || !sourceEnhancers || sourceEnhancers.length === 0) {
      return false;
    }
    const decoded = decodeHastSource(source, fallback);
    return decoded ? holdsBackDuringHydration(decoded, sourceEnhancers) : false;
  }, [source, sourceEnhancers, fallback]);
  const hydrating = !useIsHydrated(holdsBack);

  const [state, setState] = React.useState<EnhanceState>(() =>
    computeEnhanceState(source, comments, fileName, sourceEnhancers, fallback, hydrating),
  );

  const hasChanged =
    source !== prevSource ||
    sourceEnhancers !== prevEnhancers ||
    comments !== prevComments ||
    fileName !== prevFileName;

  // The render right after hydration: run the enhancers held back until now
  // (synchronously when they can, otherwise through the async path below).
  const hydrationEnded = state.deferred && !hydrating;

  // When inputs change, apply sync enhancers immediately during render
  if (hasChanged || hydrationEnded) {
    if (source !== prevSource) {
      setPrevSource(source);
    }
    if (sourceEnhancers !== prevEnhancers) {
      setPrevEnhancers(sourceEnhancers);
    }
    if (comments !== prevComments) {
      setPrevComments(comments);
    }
    if (fileName !== prevFileName) {
      setPrevFileName(fileName);
    }
    setState(computeEnhanceState(source, comments, fileName, sourceEnhancers, fallback, hydrating));
  }

  // Continue from the first async enhancer without re-running sync ones
  React.useEffect(() => {
    if (!state.asyncWork || !sourceEnhancers) {
      return undefined;
    }

    const { firstAsyncPromise, asyncStartIndex } = state.asyncWork;
    const enhancers = sourceEnhancers;
    const name = fileName || 'unknown';
    let cancelled = false;

    // Clear `asyncWork` (keeping whatever enhanced source we already have) so
    // `isEnhancing` drops and the consumer's phase advances. Used by the failure and
    // timeout paths below — without it a rejected/hung enhancer wedges 'base' forever.
    const settleWithCurrent = () => {
      if (!cancelled) {
        setState((previous) => ({
          enhancedSource: previous.enhancedSource,
          asyncWork: null,
          deferred: false,
        }));
      }
    };

    // Safety net for a hung enhancer (a promise that never settles): force-settle after
    // the deadline so the un-enhanced phase isn't locked until a reload.
    const timer = setTimeout(settleWithCurrent, ENHANCER_TIMEOUT_MS);

    async function continueEnhancing() {
      try {
        const asyncResult = await firstAsyncPromise;
        if (cancelled) {
          return;
        }
        const final = await applyEnhancersFrom(
          asyncResult,
          comments,
          name,
          enhancers,
          asyncStartIndex + 1,
        );
        if (!cancelled) {
          setState({ enhancedSource: final, asyncWork: null, deferred: false });
        }
      } catch (error) {
        // A rejected async enhancer must not strand `asyncWork` non-null forever.
        console.error('Async source enhancer failed; settling with the current result.', error);
        settleWithCurrent();
      } finally {
        clearTimeout(timer);
      }
    }

    continueEnhancing();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.asyncWork, sourceEnhancers, fileName, comments]);

  return {
    enhancedSource: state.enhancedSource,
    isEnhancing: state.asyncWork !== null || state.deferred,
  };
}
