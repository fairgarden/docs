import * as React from 'react';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';

import { CodeContent } from '../CodeContent';
import { CodeContentLoading } from '../CodeContentLoading';

import code from '../../snippets/large/snippet';

const sourceParser = createParseSource();

export default function Page() {
  return (
    // @focus-start
    <CodeHighlighter
      Content={CodeContent}
      ContentLoading={CodeContentLoading}
      sourceParser={sourceParser}
      fileName="large-file.js"
    >
      {code}
    </CodeHighlighter>
    // @focus-end
  );
}
