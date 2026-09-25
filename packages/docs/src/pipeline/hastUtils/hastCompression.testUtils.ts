/**
 * Test fixtures for `hastCompression`. Kept in a sibling file so the
 * production module's public surface stays free of helpers that only tests
 * should reach.
 */
import type { Root as HastRoot } from 'hast';
import { compressHast } from './hastCompress';
import { fallbackToText } from './fallbackFormat';
import type { FallbackNode } from './fallbackFormat';

/**
 * Builds a `hastCompressed` file the way production payloads are compressed:
 * the DEFLATE dictionary is the file's own `fallback` text, so the source
 * decodes only with that same `fallback`. `root` is the HAST that gets
 * compressed and defaults to a single `<span>` holding `text`.
 */
export function createCompressedFile(
  text: string,
  root: HastRoot = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: {},
        children: [{ type: 'text', value: text }],
      },
    ],
  },
): { source: { hastCompressed: string }; fallback: FallbackNode[] } {
  const fallback: FallbackNode[] = [text];
  return {
    source: { hastCompressed: compressHast(JSON.stringify(root), fallbackToText(fallback)) },
    fallback,
  };
}
