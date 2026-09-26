'use client';

import * as React from 'react';
import type { Root as HastRoot } from 'hast';
import { decodeHastSource } from '../pipeline/loadIsomorphicCodeVariant/decodeHastSource';
import type { SourceEnhancers, SourceComments, VariantSource } from '../CodeHighlighter/types';
import type { FallbackNode } from '../CodeHighlighter/fallbackFormat';
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

// Whether this render is past hydration, read through `useSyncExternalStore`: React
// uses the server snapshot (`false`) both while server rendering and while
// hydrating, and the client snapshot (`true`) on every other render. A component
// that hydrated re-renders with `true` right after hydration. Nothing changes after
// that, so there is nothing to subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

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

interface SyncEnhanceResult {
  /** The result after applying all sync enhancers (and resolving any leading async ones) */
  syncResult: HastRoot;
  /** Index of the first enhancer that returned a Promise, or enhancers.length if all were sync */
  asyncStartIndex: number;
  /** The promise returned by the first async enhancer, if any */
  firstAsyncPromise: Promise<HastRoot> | null;
  /**
   * Whether the run stopped, without calling it, at a lazy enhancer (`enhancerLazy`)
   * because `deferLazy` was set. That enhancer and the ones after it are left for
   * a render past hydration.
   */
  deferred: boolean;
}

/**
 * Runs enhancers in order until one returns a Promise.
 * Returns the sync-enhanced result up to that point, plus the pending promise
 * and its index so the caller can continue from there without re-running sync work.
 *
 * Enhancers with a stable `enhancerName` are skipped if already recorded on
 * the HAST root, and recorded after they run.
 *
 * With `deferLazy` (while server rendering or hydrating), the run also stops at the
 * first lazy enhancer, without calling it: whether it returns synchronously depends
 * on whether this process has loaded it yet, so running it could render a tree the
 * other side of the hydration didn't.
 */
function applyEnhancersUntilAsync(
  source: HastRoot,
  comments: SourceComments | undefined,
  fileName: string,
  enhancers: SourceEnhancers,
  deferLazy: boolean,
): SyncEnhanceResult {
  let current: HastRoot = source;
  for (let i = 0; i < enhancers.length; i += 1) {
    const enhancer = enhancers[i];
    if (shouldSkipEnhancer(current, enhancer)) {
      continue;
    }
    if (deferLazy && enhancer.enhancerLazy) {
      return {
        syncResult: current,
        asyncStartIndex: i,
        firstAsyncPromise: null,
        deferred: true,
      };
    }
    const result = enhancer(current, comments, fileName);
    if (result instanceof Promise) {
      return {
        syncResult: current,
        asyncStartIndex: i,
        firstAsyncPromise: result.then((resolved) => {
          recordEnhancerApplied(resolved, enhancer);
          return resolved;
        }),
        deferred: false,
      };
    }
    current = result;
    recordEnhancerApplied(current, enhancer);
  }
  return {
    syncResult: current,
    asyncStartIndex: enhancers.length,
    firstAsyncPromise: null,
    deferred: false,
  };
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

/**
 * Hook that applies source enhancers to a single source file.
 *
 * Enhancers are functions that modify the HAST (Hypertext Abstract Syntax Tree)
 * representation of code. They receive the parsed HAST root, any comments extracted
 * from the source code, and the filename for context.
 *
 * Enhancement runs asynchronously when the source or enhancers change.
 * The original source is returned immediately while enhancement runs in the background,
 * preventing layout shift since enhanced code should be visually similar.
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
 *   server) are skipped. When all of them are, the source is returned as it is.
 * - Lazy enhancers (`enhancerLazy`) never run while server rendering or hydrating,
 *   so the hydrated markup always matches the server HTML. They run right after
 *   hydration instead.
 * - Enhancers must return stable references to avoid infinite re-renders.
 * - Use `React.useMemo` for the enhancers array to prevent unnecessary re-runs.
 */
interface AsyncWork {
  firstAsyncPromise: Promise<HastRoot>;
  asyncStartIndex: number;
}

interface EnhanceState {
  enhancedSource: VariantSource | null;
  asyncWork: AsyncWork | null;
  /** A lazy enhancer was held back until a render past hydration. */
  deferred: boolean;
}

/**
 * Computes the synchronous enhancement result and any pending async work.
 * Enhancers are run in order; sync ones apply immediately, and the first
 * async enhancer's promise is captured so it can be continued in an effect.
 * With `deferLazy`, the run also stops at the first lazy enhancer (see
 * `applyEnhancersUntilAsync`).
 *
 * The source is decoded through the shared `decodeHastSource` cache, which
 * amortizes decompression and `JSON.parse` across other consumers (`Pre`,
 * `useFileNavigation`, `sourceLineCounts`). The variant `fallback` is forwarded
 * so a compressed payload is decompressed with its DEFLATE dictionary and each
 * frame's `data.fallback` is restored. When every enhancer is already recorded on
 * the decoded tree, the source is returned as it is. Otherwise the tree is
 * `structuredClone`d before enhancing, because the pipeline mutates `root.data`
 * (`recordEnhancerApplied`) and the decoded tree is shared.
 */
function computeEnhanceState(
  source: VariantSource | null | undefined,
  comments: SourceComments | undefined,
  fileName: string | undefined,
  sourceEnhancers: SourceEnhancers | undefined,
  fallback: FallbackNode[] | undefined,
  deferLazy: boolean,
): EnhanceState {
  if (!source || !sourceEnhancers || sourceEnhancers.length === 0) {
    return { enhancedSource: source ?? null, asyncWork: null, deferred: false };
  }
  const decoded = decodeHastSource(source, fallback);
  if (!decoded) {
    return { enhancedSource: source, asyncWork: null, deferred: false };
  }
  if (sourceEnhancers.every((enhancer) => shouldSkipEnhancer(decoded, enhancer))) {
    return { enhancedSource: source, asyncWork: null, deferred: false };
  }
  const { syncResult, firstAsyncPromise, asyncStartIndex, deferred } = applyEnhancersUntilAsync(
    structuredClone(decoded) as HastRoot,
    comments,
    fileName || 'unknown',
    sourceEnhancers,
    deferLazy,
  );
  return {
    enhancedSource: syncResult,
    asyncWork: firstAsyncPromise ? { firstAsyncPromise, asyncStartIndex } : null,
    deferred,
  };
}

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

  // Hold lazy enhancers back while server rendering and hydrating. The server and
  // the browser each run a lazy enhancer synchronously only once they have loaded
  // it, which they do independently, so running it here could make the hydrated
  // tree differ from the server HTML.
  const deferLazy = !React.useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [state, setState] = React.useState<EnhanceState>(() =>
    computeEnhanceState(source, comments, fileName, sourceEnhancers, fallback, deferLazy),
  );

  const hasChanged =
    source !== prevSource ||
    sourceEnhancers !== prevEnhancers ||
    comments !== prevComments ||
    fileName !== prevFileName;

  // The render right after hydration: run the lazy enhancers held back until now
  // (synchronously when already loaded, otherwise through the async path below).
  const hydrationEnded = state.deferred && !deferLazy;

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
    setState(computeEnhanceState(source, comments, fileName, sourceEnhancers, fallback, deferLazy));
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
