import * as React from 'react';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { CodeProvider } from '@fairgarden/docs/CodeProvider';
import { CodeController } from '../../../../../../lib/components/code-controller-context/demos/code-editor/CodeController';
import { CodeEditorContent } from '../../../../../../lib/components/code-controller-context/demos/code-editor/CodeEditorContent';

import code from '../../../code-highlighter/snippets/large/snippet';

const sourceParser = createParseSource();

export default function Page() {
  return (
    // @focus-start
    <CodeProvider>
      <CodeController>
        <CodeHighlighter
          Content={CodeEditorContent}
          controlled
          sourceParser={sourceParser}
          fileName="large-file.js"
        >
          {code}
        </CodeHighlighter>
      </CodeController>
    </CodeProvider>
    // @focus-end
  );
}
