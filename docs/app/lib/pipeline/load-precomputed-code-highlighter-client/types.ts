import { createTypes } from '@/functions/createTypes';
import loadPrecomputedCodeHighlighterClient from '@fairgarden/docs/pipeline/loadPrecomputedCodeHighlighterClient';

export const TypesLoadPrecomputedCodeHighlighterClient = createTypes(
  import.meta.url,
  loadPrecomputedCodeHighlighterClient,
);
