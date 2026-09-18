import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import type { Code as CodeType } from '@fairgarden/docs/CodeHighlighter/types';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { createEnhanceCodeEmphasis } from '@fairgarden/docs/pipeline/enhanceCodeEmphasis';

import { CollapsibleCodeContent } from './CollapsibleCodeContent';

const sourceParser = createParseSource();
const sourceEnhancers = [createEnhanceCodeEmphasis({ focusFramesMaxSize: 6 })];

/**
 * A server component that renders a collapsible code block with focusFramesMaxSize.
 *
 * Uses `focusFramesMaxSize: 6` so highlighted regions longer than 6 lines
 * are split into a focused window from the start with unfocused overflow below.
 */
export function CodeMaxSize({ code }: { code: CodeType }) {
  return (
    // @focus-start
    <CodeHighlighter
      code={code}
      Content={CollapsibleCodeContent}
      sourceParser={sourceParser}
      sourceEnhancers={sourceEnhancers}
    />
    // @focus-end
  );
}
