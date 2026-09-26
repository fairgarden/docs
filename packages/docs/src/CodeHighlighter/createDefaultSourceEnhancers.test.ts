import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDefaultSourceEnhancers } from './createDefaultSourceEnhancers';
import { enhanceCodeEmphasis } from '../pipeline/enhanceCodeEmphasis';
import type { HastRoot } from './types';

/** Five one-line frames' worth of source, as the parser frames it: a single frame. */
function makeRoot(): HastRoot {
  const lines = Array.from({ length: 5 }, (_, index) => ({
    type: 'element' as const,
    tagName: 'span',
    properties: { className: 'line', dataLn: index + 1 },
    children: [{ type: 'text' as const, value: `line${index + 1}` }],
  }));
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: 'frame' },
        children: lines.flatMap((line) => [line, { type: 'text' as const, value: '\n' }]),
      },
    ],
    data: { totalLines: 5 },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createDefaultSourceEnhancers', () => {
  it('creates the default emphasis enhancer', () => {
    vi.stubEnv('FAIRGARDEN_DOCS_DEMO_EMPHASIS_OPTIONS', '');

    expect(createDefaultSourceEnhancers()).toEqual([enhanceCodeEmphasis]);
  });

  it('creates the emphasis enhancer with the demo emphasis options', async () => {
    vi.stubEnv('FAIRGARDEN_DOCS_DEMO_EMPHASIS_OPTIONS', JSON.stringify({ focusFramesMaxSize: 2 }));

    const [enhancer] = createDefaultSourceEnhancers();
    const enhanced = await enhancer(makeRoot(), undefined, 'test.ts');

    // Recorded under the same name as the default one, so the client skips either.
    expect(enhancer.enhancerName).toBe(enhanceCodeEmphasis.enhancerName);
    expect(enhanced.data?.focusedLines).toBe(2);
  });
});
