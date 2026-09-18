import { createTypes } from '@/functions/createTypes';
import enhanceCodeInline from '@fairgarden/docs/pipeline/enhanceCodeInline';

export const TypesEnhanceCodeInline = createTypes(import.meta.url, enhanceCodeInline);
