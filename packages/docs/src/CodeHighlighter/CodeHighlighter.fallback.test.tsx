/**
 * A `ContentLoading` streams in first and the loaded content replaces it, so both
 * must show the same window: otherwise the block paints its full length and then
 * snaps to the collapsed window (or the reverse). The fallback is prepared by
 * `CodeHighlighter` (inline code) or `CodeInitialSourceLoader` (code from a `url`),
 * and the content by `CodeSourceLoader`.
 */
import type * as React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { CodeHighlighter } from './CodeHighlighter';
import CodeSourceLoader from './CodeSourceLoader';
import CodeInitialSourceLoader from './CodeInitialSourceLoader';
import type {
  CodeHighlighterChunkContentProps,
  CodeHighlighterChunkUserProps,
} from './CodeHighlighterChunk';
import { createParseSource } from '../pipeline/parseSource';
import { enhanceCodeEmphasis } from '../pipeline/enhanceCodeEmphasis';
import type {
  Code,
  CodeHighlighterProps,
  ContentLoadingProps,
  ContentProps,
  LoadSource,
  ParseSource,
  SourceEnhancers,
} from './types';

let sourceParser: Promise<ParseSource>;

beforeAll(async () => {
  sourceParser = createParseSource();
  await sourceParser;
});

function Content(_props: ContentProps<object>) {
  return null;
}

function ContentLoading(_props: ContentLoadingProps<object>) {
  return null;
}

// Long enough for the emphasis enhancer to collapse it to a window.
const source = Array.from({ length: 40 }, (_, index) => `const value${index} = ${index};`).join(
  '\n',
);

type ChunkElement = React.ReactElement<{
  preloaded: Code;
  userProps: CodeHighlighterChunkUserProps;
}>;

/** The window the streamed `ContentLoading` paints. */
function getFallbackFocusedLines(element: ChunkElement): number | undefined {
  const fallback = element.props.userProps.fallback as React.ReactElement<{
    focusedLines?: number;
  }>;
  return fallback.props.focusedLines;
}

/** The window of the content that replaces the fallback. */
async function getLoadedFocusedLines(element: ChunkElement): Promise<number | undefined> {
  const loaded = (await CodeSourceLoader({
    ...element.props.userProps,
    data: element.props.preloaded,
    loading: false,
  } as CodeHighlighterChunkContentProps)) as React.ReactElement<{ code: Code }>;
  const variant = loaded.props.code.Default;
  if (!variant || typeof variant === 'string') {
    throw new Error('expected a loaded variant');
  }
  return variant.focusedLines;
}

describe('CodeHighlighter loading fallback', () => {
  describe('inline code', () => {
    function streamInlineCode(sourceEnhancers?: SourceEnhancers) {
      return CodeHighlighter({
        code: { Default: { fileName: 'values.ts', source } },
        Content,
        ContentLoading,
        sourceParser,
        sourceEnhancers,
        highlightAfter: 'stream',
      } as CodeHighlighterProps<object>) as ChunkElement;
    }

    it('shows the same window as the loaded content', async () => {
      const element = streamInlineCode();

      expect(getFallbackFocusedLines(element)).toBe(await getLoadedFocusedLines(element));
    });

    it('shows the same window as the loaded content with server enhancers', async () => {
      const element = streamInlineCode([enhanceCodeEmphasis]);

      expect(getFallbackFocusedLines(element)).toBe(12);
      expect(await getLoadedFocusedLines(element)).toBe(12);
    });
  });

  describe('code from a url', () => {
    const loadSource: LoadSource = async () => ({ source });
    const urlCode: Code = { Default: { fileName: 'values.ts', url: 'file:///values.ts' } };

    async function streamUrlCode(sourceEnhancers?: SourceEnhancers) {
      return (await CodeInitialSourceLoader({
        loading: true,
        code: urlCode,
        url: 'file:///values.ts',
        initialVariant: 'Default',
        Content,
        ContentLoading,
        loadSource,
        sourceParser,
        sourceEnhancers,
        highlightAfter: 'stream',
      } as CodeHighlighterChunkContentProps)) as ChunkElement;
    }

    it('shows the same window as the loaded content', async () => {
      const element = await streamUrlCode();

      expect(getFallbackFocusedLines(element)).toBe(await getLoadedFocusedLines(element));
    });

    it('shows the same window as the loaded content with server enhancers', async () => {
      const element = await streamUrlCode([enhanceCodeEmphasis]);

      expect(getFallbackFocusedLines(element)).toBe(12);
      expect(await getLoadedFocusedLines(element)).toBe(12);
    });
  });
});
