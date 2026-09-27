import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { CodeProviderLazy } from '@fairgarden/docs/CodeProvider';
import type { Code } from '@fairgarden/docs/CodeHighlighter/types';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { enhanceCodeEmphasis } from '@fairgarden/docs/pipeline/enhanceCodeEmphasis';

import { InlineCodeContent } from './InlineCodeContent';

const sourceParser = createParseSource();
// Runs the emphasis enhancer on the server, which the client then skips.
const serverSourceEnhancers = [enhanceCodeEmphasis];

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
 * `CodeProviderLazy` that keeps its default, lazily loaded emphasis enhancer.
 *
 * - The block from a string child leaves emphasis to the provider, which applies it
 *   right after hydration, whether or not the server or the browser has loaded it.
 * - The block from multi-file `code` passes the emphasis enhancer to the server, so
 *   the HTML already has its frames and the client has nothing left to enhance.
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
          sourceEnhancers={serverSourceEnhancers}
        />
      </div>
      {/* @focus-end */}
    </CodeProviderLazy>
  );
}
