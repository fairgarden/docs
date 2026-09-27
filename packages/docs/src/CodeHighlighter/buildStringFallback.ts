import type { Root as HastRoot } from 'hast';
import type { SourceComments, SourceEnhancers } from './types';
import { buildRootFallback } from './fallbackFormat';
import type { FallbackNode } from './fallbackFormat';
import { parsePlainText } from '../pipeline/parseSource';

export interface StringFallbackResult {
  /** Compact, windowed fallback frames (text only — `.line` spans stripped). */
  fallback: FallbackNode[];
  /** Total source lines. */
  totalLines: number;
  /** Lines visible in the collapsed window (the sum of visible frame sizes). */
  focusedLines: number;
  /** Whether the enhanced frame structure has hidden content to expand into. */
  collapsible: boolean;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Derive a *windowed* fallback for a plain-string source by running the same
 * `sourceEnhancers` the live render uses over a cheap line-guttered HAST
 * (`parsePlainText` — gutters, no syntax highlighting). The inline-string
 * fallback path otherwise wraps the whole source in one un-windowed focus frame,
 * so an oversized / `@focus` / `@highlight` block paints its full text before
 * hydration then snaps to the collapsed window. Running the enhancers here makes
 * the loading frames match the live render, and the resulting `root.data` carries
 * the `totalLines` / `focusedLines` the compact fallback can't preserve.
 *
 * Synchronous by design — it runs at fallback-prep time inside the (sync)
 * `prepareInitialSource`, which can be part of a server render that the browser
 * then hydrates (a `CodeHighlighter` rendered by a client component). So, like
 * `useCode` while hydrating, it runs only the enhancers marked `enhancerSync`, such
 * as the built-in emphasis enhancers, and skips the rest: one that loads on demand
 * could return synchronously on one side and a promise on the other, and prepare a
 * different fallback on each. With none to run, or when one returns a promise
 * anyway, it returns `undefined` so the caller falls back to the naive single-frame
 * wrap rather than blocking.
 */
export function buildStringFallback(
  source: string,
  comments: SourceComments | undefined,
  fileName: string,
  sourceEnhancers: SourceEnhancers,
): StringFallbackResult | undefined {
  const synchronousEnhancers = sourceEnhancers.filter((enhancer) => enhancer.enhancerSync);
  if (synchronousEnhancers.length === 0) {
    return undefined;
  }

  let root: HastRoot = parsePlainText(source);

  for (const enhancer of synchronousEnhancers) {
    const result = enhancer(root, comments, fileName);
    if (isPromiseLike(result)) {
      return undefined;
    }
    root = result;
  }

  const data = root.data as
    | { totalLines?: number; focusedLines?: number; collapsible?: boolean }
    | undefined;
  const totalLines = data?.totalLines ?? 0;
  const focusedLines = data?.focusedLines ?? totalLines;
  const collapsible = data?.collapsible === true;

  return { fallback: buildRootFallback(root), totalLines, focusedLines, collapsible };
}
