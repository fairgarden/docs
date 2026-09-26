import 'server-only';

import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import { createParseSource } from '@fairgarden/docs/pipeline/parseSource';
import { TypescriptToJavascriptTransformer } from '@fairgarden/docs/pipeline/transformTypescriptToJavascript';

import { CodeContent } from '../CodeContent';
import { FilesContent } from './FilesContent';
import { code } from './code';

const sourceParser = createParseSource();
const sourceTransformers = [TypescriptToJavascriptTransformer];

/**
 * Inline multi-file `code` with no `url`, highlighted on init: once with file
 * tabs, and once with every file shown at once plus a TS → JS transform.
 */
export function InlineFiles() {
  return (
    <React.Fragment>
      {/* @focus-start */}
      <div data-testid="tabs">
        <CodeHighlighter
          code={code}
          name="Checkbox"
          slug="checkbox-tabs"
          Content={CodeContent}
          sourceParser={sourceParser}
          highlightAfter="init"
        />
      </div>
      <div data-testid="files">
        <CodeHighlighter
          code={code}
          name="Checkbox"
          slug="checkbox-files"
          Content={FilesContent}
          sourceParser={sourceParser}
          sourceTransformers={sourceTransformers}
          highlightAfter="init"
        />
      </div>
      {/* @focus-end */}
    </React.Fragment>
  );
}
