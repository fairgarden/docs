import { createMultipleTypes } from '@/functions/createTypes';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import * as CodeHighlighterTypes from '@fairgarden/docs/CodeHighlighter/types';

const { types, AdditionalTypes } = createMultipleTypes(import.meta.url, {
  CodeHighlighter,
  CodeHighlighterTypes,
});

export const TypesCodeHighlighter = types;
export const TypesCodeHighlighterAdditional = AdditionalTypes;
