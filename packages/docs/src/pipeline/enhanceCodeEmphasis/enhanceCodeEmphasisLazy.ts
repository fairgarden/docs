import { createLazySourceEnhancer } from '../createLazySourceEnhancer/createLazySourceEnhancer';

// Lazy form of `enhanceCodeEmphasis`. The real enhancer is ~13 KB gzip (frame
// range / indent logic); this wrapper keeps it out of the initial bundle and
// dynamic-imports it only when a block actually enhances client-side. A
// precomputed block's HAST already carries the emphasis (recorded under the
// same `enhancerName`), so `shouldSkipEnhancer` skips this wrapper without ever
// importing the chunk. `CodeProviderLazy` uses this; the eager `CodeProvider`
// uses the bundled `enhanceCodeEmphasis` directly so its zero-fetch invariant
// holds.
//
// Must stay light: the heavy module is reached exclusively through the dynamic
// `import()` below, and `createLazySourceEnhancer` imports only types.

// Stable name — MUST match `enhanceCodeEmphasis.enhancerName` so a precomputed
// HAST that recorded the eager enhancer is correctly skipped by this wrapper
// (and vice versa). Hardcoded rather than imported to avoid pulling the chunk.
const ENHANCE_CODE_EMPHASIS_NAME = 'enhanceCodeEmphasis';

/**
 * Defers the `enhanceCodeEmphasis` chunk until a block actually enhances
 * (client highlight or live edit). Runs synchronously once the chunk is warm so
 * live-edit re-enhancement does not flash; returns a promise on the first cold
 * call (the existing async-enhancer path handles it). Carries the same
 * `enhancerName` so precomputed HAST skips it without loading anything.
 *
 * Built with `createLazySourceEnhancer`: whether a call returns synchronously
 * depends on whether this process has loaded the chunk yet, which the server and
 * the browser decide independently, so it isn't marked `enhancerSync`. `useCode`
 * therefore never runs it while server rendering or hydrating, only right after,
 * so it can't make the hydrated markup differ from the server HTML.
 */
export const enhanceCodeEmphasisLazy = createLazySourceEnhancer(
  ENHANCE_CODE_EMPHASIS_NAME,
  async () => (await import('./enhanceCodeEmphasis')).enhanceCodeEmphasis,
);

/**
 * Warms the emphasis-enhancer chunk so the next enhancement runs synchronously
 * (no flash during live-edit re-enhancement). Optional — the wrapper loads on
 * first use anyway; this is a head start, e.g. when a block becomes editable.
 */
export async function preloadCodeEmphasis(): Promise<void> {
  await enhanceCodeEmphasisLazy.preload();
}

/** Clears the module cache. Intended for tests exercising the cold path. */
export function resetCodeEmphasisCache(): void {
  enhanceCodeEmphasisLazy.reset();
}
