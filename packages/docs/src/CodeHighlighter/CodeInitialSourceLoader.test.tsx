/**
 * `CodeInitialSourceLoader` is the server loader `CodeHighlighter` routes to when a
 * `ContentLoading` needs an initial source before the whole block has loaded: it
 * loads just the initial file, prepares the loading fallback from it, and hands the
 * result back to the chunk.
 */
import type * as React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import CodeInitialSourceLoader from './CodeInitialSourceLoader';
import type { CodeHighlighterChunkContentProps } from './CodeHighlighterChunk';
import { createParseSource } from '../pipeline/parseSource';
import { decodeHastSource } from '../pipeline/loadIsomorphicCodeVariant/decodeHastSource';
import { enhanceCodeEmphasis } from '../pipeline/enhanceCodeEmphasis';
import type {
  Code,
  ContentLoadingProps,
  ContentProps,
  LoadSource,
  ParseSource,
  SourceEnhancers,
} from './types';

let parseSource: ParseSource;

beforeAll(async () => {
  parseSource = await createParseSource();
});

function Content(_props: ContentProps<object>) {
  return null;
}

function ContentLoading(_props: ContentLoadingProps<object>) {
  return null;
}

const loadSource: LoadSource = async () => ({
  source: 'export const Button = () => <button type="button" />;',
});

const urlCode: Code = { Default: { fileName: 'Button.tsx', url: 'file:///Button.tsx' } };

describe('CodeInitialSourceLoader', () => {
  describe('source enhancers', () => {
    async function loadInitial(sourceEnhancers?: SourceEnhancers) {
      const props: CodeHighlighterChunkContentProps = {
        loading: true,
        code: urlCode,
        url: 'file:///Button.tsx',
        initialVariant: 'Default',
        Content,
        ContentLoading,
        loadSource,
        sourceParser: Promise.resolve(parseSource),
        highlightAfter: 'init',
        sourceEnhancers,
      };
      const element = (await CodeInitialSourceLoader(props)) as React.ReactElement<{
        preloaded: Code;
      }>;
      const variant = element.props.preloaded.Default;
      if (!variant || typeof variant === 'string') {
        throw new Error('expected a loaded variant');
      }
      return decodeHastSource(variant.source, variant.fallback);
    }

    it('runs no source enhancers on the initial source unless given some', async () => {
      const root = await loadInitial();

      expect(root?.data?.appliedEnhancers).toBeUndefined();
    });

    it('runs the given sourceEnhancers on the initial source and records them', async () => {
      const root = await loadInitial([enhanceCodeEmphasis]);

      expect(root?.data?.appliedEnhancers).toEqual(['enhanceCodeEmphasis']);
    });
  });
});
