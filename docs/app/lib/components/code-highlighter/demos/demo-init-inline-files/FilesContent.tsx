'use client';

import * as React from 'react';
import type { ContentProps } from '@fairgarden/docs/CodeHighlighter/types';
import { useCode } from '@fairgarden/docs/useCode';
import { CodeSource } from '../CodeSource';

/**
 * Renders every file of the selected variant at once, each under its name, so
 * all of them are in the initial HTML. The JS button toggles the TS → JS
 * transform for every file.
 */
export function FilesContent(props: ContentProps<object>) {
  // @focus-start @padding 1
  const code = useCode(props);
  const isJsSelected = code.selectedTransform === 'js';

  return (
    <div>
      {code.availableTransforms.includes('js') ? (
        <button type="button" onClick={() => code.selectTransform(isJsSelected ? null : 'js')}>
          {isJsSelected ? 'TS' : 'JS'}
        </button>
      ) : null}
      {code.files.map((file) => (
        <section key={file.name} data-file={file.name}>
          <h3>{file.name}</h3>
          <CodeSource>{file.component}</CodeSource>
        </section>
      ))}
    </div>
  );
  // @focus-end
}
