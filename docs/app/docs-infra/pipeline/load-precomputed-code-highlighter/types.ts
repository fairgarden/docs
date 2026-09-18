import { createTypes } from '@/functions/createTypes';
import loadPrecomputedCodeHighlighter from '@fairgarden/docs/pipeline/loadPrecomputedCodeHighlighter';

export const TypesLoadPrecomputedCodeHighlighter = createTypes(
  import.meta.url,
  loadPrecomputedCodeHighlighter,
);
