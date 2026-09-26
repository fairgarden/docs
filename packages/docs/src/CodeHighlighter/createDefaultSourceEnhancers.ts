import {
  createEnhanceCodeEmphasis,
  enhanceCodeEmphasis,
} from '../pipeline/enhanceCodeEmphasis/enhanceCodeEmphasis';
import type { EnhanceCodeEmphasisOptions } from '../pipeline/parseSource/calculateFrameRanges';
import type { SourceEnhancers } from './types';

/**
 * Creates the source enhancers the server loaders (`CodeSourceLoader`,
 * `CodeInitialSourceLoader`) run when `CodeHighlighter` is given no
 * `sourceEnhancers`: the emphasis enhancer the demo loaders run at build time.
 * It uses the `demoEmphasisOptions` passed to `withFairGardenDocs`, which forwards
 * them in the `FAIRGARDEN_DOCS_DEMO_EMPHASIS_OPTIONS` environment variable, and
 * the defaults otherwise, as `CodeProvider` does.
 *
 * The enhancer records itself on every tree it enhances (`appliedEnhancers`), so
 * the client skips it: the server HTML already has the emphasis frames, and the
 * client neither loads nor runs the enhancer, leaving nothing whose load state
 * could make the hydrated markup differ from the server HTML.
 */
export function createDefaultSourceEnhancers(): SourceEnhancers {
  // Read as the full `process.env.NAME` expression, so bundlers inline the value
  // Next's `env` config sets.
  const serializedOptions = process.env.FAIRGARDEN_DOCS_DEMO_EMPHASIS_OPTIONS;
  if (!serializedOptions) {
    return [enhanceCodeEmphasis];
  }
  const emphasisOptions: EnhanceCodeEmphasisOptions = JSON.parse(serializedOptions);
  return [createEnhanceCodeEmphasis(emphasisOptions)];
}
