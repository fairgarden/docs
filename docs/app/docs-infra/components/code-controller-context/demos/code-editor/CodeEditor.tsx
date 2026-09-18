import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';

import { CodeController } from './CodeController';
import { CodeEditorContent } from './CodeEditorContent';

const initialCode = {
  Default: {
    url: 'file://live-example.js',
    fileName: 'live-example.js',
    source: `// Welcome to the live code editor!
function greet(name) {
  return \`Hello, \${name}!\`;
}
`,
  },
};

export function CodeEditor() {
  return (
    // @focus-start
    <CodeController url={initialCode.Default.url}>
      <CodeHighlighter
        url={initialCode.Default.url}
        Content={CodeEditorContent}
        code={initialCode}
        controlled
        sourceParser={createParseSource()}
      />
    </CodeController>
    // @focus-end
  );
}
