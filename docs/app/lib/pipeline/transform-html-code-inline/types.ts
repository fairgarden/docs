import { createTypes } from '@/functions/createTypes';
import transformHtmlCodeInline from '@fairgarden/docs/pipeline/transformHtmlCodeInline';

export const TypesTransformHtmlCodeInline = createTypes(import.meta.url, transformHtmlCodeInline);
