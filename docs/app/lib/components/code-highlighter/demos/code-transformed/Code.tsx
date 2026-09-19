import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { TypescriptToJavascriptTransformer } from '@fairgarden/docs/pipeline/transformTypescriptToJavascript';

import { CodeContent } from '../CodeContent';

const sourceParser = createParseSource();
const sourceTransformers = [TypescriptToJavascriptTransformer];

export function Code({ children, fileName }: { children: string; fileName?: string }) {
  return (
    // @focus-start
    <CodeHighlighter
      fileName={fileName}
      Content={CodeContent}
      sourceParser={sourceParser}
      sourceTransformers={sourceTransformers}
    >
      {children}
    </CodeHighlighter>
    // @focus-end
  );
}
