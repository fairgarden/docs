import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { CodeProviderLazy } from '@fairgarden/docs/CodeProvider';
import type { Code } from '@fairgarden/docs/CodeHighlighter/types';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';

import { InlineCodeContent } from './InlineCodeContent';

const sourceParser = createParseSource();

const button = `export function Button() {
  return <button type="button">Save</button>;
}`;

const code: Code = {
  Default: {
    fileName: 'Checkbox.tsx',
    source: `import { useChecked } from './useChecked';

export function Checkbox() {
  const [checked, toggle] = useChecked();
  return <input type="checkbox" checked={checked} onChange={toggle} />;
}`,
    extraFiles: {
      'useChecked.ts': {
        source: `import * as React from 'react';

export function useChecked() {
  const [checked, setChecked] = React.useState(false);
  return [checked, () => setChecked((value) => !value)] as const;
}`,
      },
    },
  },
};

/**
 * Inline code with no `url` and the default `highlightAfter`, under a
 * `CodeProviderLazy` that keeps its default, lazily loaded emphasis enhancer: one
 * block from a string child, and one from multi-file `code`. The server parses every
 * file and runs the emphasis enhancer on it, so the HTML already has the frames the
 * client would otherwise add once it loaded the enhancer, whichever side loaded it
 * first.
 */
export function InlineCode() {
  return (
    <CodeProviderLazy>
      {/* @focus-start */}
      <div data-testid="single">
        <CodeHighlighter
          fileName="Button.tsx"
          name="Button"
          slug="button"
          Content={InlineCodeContent}
          sourceParser={sourceParser}
        >
          {button}
        </CodeHighlighter>
      </div>
      <div data-testid="files">
        <CodeHighlighter
          code={code}
          name="Checkbox"
          slug="checkbox"
          Content={InlineCodeContent}
          sourceParser={sourceParser}
        />
      </div>
      {/* @focus-end */}
    </CodeProviderLazy>
  );
}
