import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';

import { CodeContent } from '../CodeContent';

const sourceParser = createParseSource();

export function Code({ children, fileName }: { children: string; fileName?: string }) {
  return (
    // @focus-start
    <CodeHighlighter
      fileName={fileName}
      Content={CodeContent}
      sourceParser={sourceParser}
      highlightAfter="init"
    >
      {children}
    </CodeHighlighter>
    // @focus-end
  );
}
