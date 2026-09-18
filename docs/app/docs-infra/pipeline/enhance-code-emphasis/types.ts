import { createTypes } from '@/functions/createTypes';
import { enhanceCodeEmphasis } from '@fairgarden/docs/pipeline/enhanceCodeEmphasis';

export const TypesEnhanceCodeEmphasis = createTypes(import.meta.url, enhanceCodeEmphasis);
