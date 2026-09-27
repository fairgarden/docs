import type { HastRoot, SourceComments, SourceEnhancer } from '../../CodeHighlighter/types';

// Must stay light: only types are imported, so building a lazy enhancer never pulls
// in the enhancer it defers.

/**
 * Loads the enhancer a lazy enhancer defers: the enhancer itself, or a module whose
 * default export is the enhancer.
 */
export type LoadSourceEnhancer = () => Promise<SourceEnhancer | { default: SourceEnhancer }>;

/** A source enhancer built by {@link createLazySourceEnhancer}. */
export interface LazySourceEnhancer extends SourceEnhancer {
  enhancerName: string;
  /**
   * Loads the enhancer now, so later calls run synchronously, for instance when a
   * block becomes editable. Optional: the first call loads it anyway.
   */
  preload: () => Promise<void>;
  /** Forgets the loaded enhancer, so the next call loads it again. Intended for tests. */
  reset: () => void;
}

/**
 * Builds a source enhancer that loads its implementation on demand, keeping it out
 * of the initial bundle until a block actually enhances.
 *
 * `load` runs once, on the first call (or `preload()`), and its result is cached for
 * the lifetime of the enhancer. Build the enhancer at module level so every block
 * shares that cache. Until it has loaded, a call returns a promise. After, it runs
 * the loaded enhancer synchronously, so re-enhancing (e.g. while editing) doesn't
 * flash. A failed load is retried on the next call.
 *
 * `enhancerName` must be the `enhancerName` of the enhancer `load` resolves to. The
 * lazy enhancer carries it from the start, so a tree the enhancer already ran on (at
 * build time or on the server) skips it without loading anything and is never
 * enhanced twice, and a tree it runs on records it in `appliedEnhancers`.
 *
 * Because it can return a promise, it isn't marked `enhancerSync`: `useCode` never
 * runs it while server rendering or hydrating, only right after, so whether the
 * server or the browser has loaded it can't make the hydrated markup differ from
 * the server HTML.
 *
 * @example
 * ```ts
 * const annotateLazy = createLazySourceEnhancer(
 *   'annotate',
 *   async () => (await import('./annotate')).annotate,
 * );
 * ```
 */
export function createLazySourceEnhancer(
  enhancerName: string,
  load: LoadSourceEnhancer,
): LazySourceEnhancer {
  if (typeof enhancerName !== 'string' || enhancerName === '') {
    throw new Error(
      'createLazySourceEnhancer needs an enhancerName: the name of the enhancer it loads, so trees that enhancer already ran on skip it.',
    );
  }

  let loaded: SourceEnhancer | undefined;
  let loading: Promise<SourceEnhancer> | undefined;
  // Bumped by `reset()`, so a load that started before it can't repopulate the cache.
  let generation = 0;

  function loadOnce(): Promise<SourceEnhancer> {
    if (loaded) {
      return Promise.resolve(loaded);
    }
    if (!loading) {
      const loadGeneration = generation;
      loading = (async () => {
        try {
          const result = await load();
          const enhancer = typeof result === 'function' ? result : result.default;
          if (
            process.env.NODE_ENV !== 'production' &&
            enhancer.enhancerName &&
            enhancer.enhancerName !== enhancerName
          ) {
            console.warn(
              `createLazySourceEnhancer: "${enhancerName}" loaded an enhancer named "${enhancer.enhancerName}". Use the loaded enhancer's name, so trees it already ran on skip the lazy one.`,
            );
          }
          if (loadGeneration === generation) {
            loaded = enhancer;
          }
          return enhancer;
        } finally {
          if (loadGeneration === generation) {
            loading = undefined;
          }
        }
      })();
    }
    return loading;
  }

  async function enhanceOnceLoaded(
    root: HastRoot,
    comments: SourceComments | undefined,
    fileName: string,
  ): Promise<HastRoot> {
    const enhance = await loadOnce();
    return enhance(root, comments, fileName);
  }

  function enhanceLazily(
    root: HastRoot,
    comments: SourceComments | undefined,
    fileName: string,
  ): HastRoot | Promise<HastRoot> {
    if (loaded) {
      return loaded(root, comments, fileName);
    }
    return enhanceOnceLoaded(root, comments, fileName);
  }

  async function preload(): Promise<void> {
    await loadOnce();
  }

  function reset(): void {
    generation += 1;
    loaded = undefined;
    loading = undefined;
  }

  return Object.assign(enhanceLazily, { enhancerName, preload, reset });
}
