import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';

import { CodeContent } from '../../code-highlighter/demos/CodeContent';

export function Code({ children, fileName }: { children: string; fileName?: string }) {
  return (
    // @focus-start
    <CodeHighlighter fileName={fileName} Content={CodeContent}>
      {children}
    </CodeHighlighter>
    // @focus-end
  );
}
