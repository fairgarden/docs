/**
 * `CodeSourceLoader` is the server loader `CodeHighlighter` routes to when its code
 * still has to be highlighted: it loads and parses every variant, then renders
 * `CodeHighlighterClient`. These tests render its output with `renderToString`, as
 * the server render does: there is no `CodeProvider`, so the client cannot parse
 * anything itself and shows only what the loader already highlighted.
 */
import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import { describe, it, expect, beforeAll } from 'vitest';
import CodeSourceLoader from './CodeSourceLoader';
import type { CodeHighlighterChunkContentProps } from './CodeHighlighterChunk';
import { useCode } from '../useCode';
import { createParseSource } from '../pipeline/parseSource';
import { hasAllVariants } from '../pipeline/loadIsomorphicCodeVariant/hasAllCodeVariants';
import type { Code, ContentProps, ParseSource } from './types';

let parseSource: ParseSource;

beforeAll(async () => {
  parseSource = await createParseSource();
});

/** Renders every file of the selected variant, each under its name. */
function FilesContent(props: ContentProps<object>) {
  const code = useCode(props);
  return (
    <div>
      {code.files.map((file) => (
        <section key={file.name} data-file={file.name}>
          {file.component}
        </section>
      ))}
    </div>
  );
}

/** One variant whose files are all inline strings, with no `url`. */
const inlineCode: Code = {
  Default: {
    fileName: 'Button.tsx',
    source: 'export const Button = () => <button type="button" />;',
    extraFiles: {
      'button.css': { source: '.button {\n  color: red;\n}' },
      'useToggle.ts': { source: 'export const useToggle = (value: boolean) => !value;' },
    },
  },
};

async function loadInlineCode(highlightAfter: 'init' | 'idle') {
  const props: CodeHighlighterChunkContentProps = {
    loading: true,
    data: inlineCode,
    code: inlineCode,
    initialVariant: 'Default',
    Content: FilesContent,
    sourceParser: Promise.resolve(parseSource),
    highlightAfter,
  };
  const element = await CodeSourceLoader(props);
  const clientProps = element.props as { code: Code };
  return { element, code: clientProps.code };
}

/** The server-rendered markup of each file, keyed by file name. */
function serverMarkupByFile(element: React.ReactElement): Record<string, string> {
  const files: Record<string, string> = {};
  const sections = /<section data-file="([^"]+)">(.*?)<\/section>/gs;
  for (const match of ReactDOMServer.renderToString(element).matchAll(sections)) {
    files[match[1]] = match[2];
  }
  return files;
}

describe('CodeSourceLoader', () => {
  describe('inline code with no url', () => {
    it('parses every file on the server, extra files included', async () => {
      const { code } = await loadInlineCode('init');

      const variant = code.Default;
      if (!variant || typeof variant === 'string') {
        throw new Error('expected a loaded variant');
      }
      expect(typeof variant.source).toBe('object');
      for (const file of Object.values(variant.extraFiles ?? {})) {
        expect(typeof file === 'object' && typeof file.source).toBe('object');
      }
      // So the client has nothing left to parse.
      expect(hasAllVariants(['Default'], code, true)).toBe(true);
    });

    it("server-renders every file highlighted with highlightAfter: 'init'", async () => {
      const { element } = await loadInlineCode('init');

      const files = serverMarkupByFile(element);

      expect(Object.keys(files)).toEqual(['Button.tsx', 'button.css', 'useToggle.ts']);
      // The main file too: with any file left unparsed, the client holds the whole
      // block back until it can parse it, which it can't do during a server render.
      for (const markup of Object.values(files)) {
        expect(markup).toContain('class="pl-');
      }
    });

    it("server-renders every file plain until the highlight trigger with highlightAfter: 'idle'", async () => {
      const { element } = await loadInlineCode('idle');

      const files = serverMarkupByFile(element);

      expect(Object.keys(files)).toEqual(['Button.tsx', 'button.css', 'useToggle.ts']);
      for (const markup of Object.values(files)) {
        expect(markup).not.toContain('class="pl-');
      }
    });
  });
});
