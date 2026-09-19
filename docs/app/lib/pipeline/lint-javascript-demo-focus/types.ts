import { createTypes } from '@/functions/createTypes';
import { lintJavascriptDemoFocus } from '@fairgarden/docs/pipeline/lintJavascriptDemoFocus';

export const TypesLintJavascriptDemoFocus = createTypes(import.meta.url, lintJavascriptDemoFocus);
