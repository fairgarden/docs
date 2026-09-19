import { createTypes } from '@/functions/createTypes';
import transformMarkdownCode from '@fairgarden/docs/pipeline/transformMarkdownCode';

export const TypesTransformMarkdownCode = createTypes(import.meta.url, transformMarkdownCode);
