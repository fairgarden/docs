import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';

import { CodeContent } from './CodeContent';

const sourceParser = createParseSource();

export function Code({
  children,
  language,
  fileName,
}: {
  children: string;

  language?: string;
  fileName?: string;
}) {
  return (
    // @focus-start
    <CodeHighlighter
      language={language}
      fileName={fileName}
      Content={CodeContent}
      sourceParser={sourceParser}
    >
      {children}
    </CodeHighlighter>
    // @focus-end
  );
}
