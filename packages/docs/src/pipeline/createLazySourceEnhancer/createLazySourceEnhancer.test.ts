import { describe, it, expect, vi } from 'vitest';
import { createLazySourceEnhancer } from './createLazySourceEnhancer';
import { applyEnhancers } from '../loadIsomorphicCodeVariant/runSourceEnhancers';
import type { HastRoot, SourceEnhancer } from '../../CodeHighlighter/types';

function makeRoot(): HastRoot {
  return { type: 'root', children: [{ type: 'text', value: 'const a = 1;' }] };
}

/** An eager enhancer that counts the times it ran on a root. */
const countPass: SourceEnhancer = (root) => ({
  ...root,
  data: { ...root.data, totalLines: (root.data?.totalLines ?? 0) + 1 },
});
countPass.enhancerName = 'countPass';

describe('createLazySourceEnhancer', () => {
  it('gives the enhancer its name', () => {
    const enhancer = createLazySourceEnhancer('countPass', async () => countPass);

    expect(enhancer.enhancerName).toBe('countPass');
  });

  it('is not marked enhancerSync, so it never runs while server rendering or hydrating', () => {
    const enhancer = createLazySourceEnhancer('countPass', async () => countPass);

    expect(enhancer.enhancerSync).toBeUndefined();
  });

  it('requires an enhancer name', () => {
    expect(() => createLazySourceEnhancer('', async () => countPass)).toThrow(
      'createLazySourceEnhancer needs an enhancerName',
    );
  });

  it('returns a promise before it has loaded and the enhanced root after', async () => {
    const enhancer = createLazySourceEnhancer('countPass', async () => countPass);

    const cold = enhancer(makeRoot(), undefined, 'a.ts');
    expect(cold).toBeInstanceOf(Promise);
    expect(await cold).toEqual(countPass(makeRoot(), undefined, 'a.ts'));

    const warm = enhancer(makeRoot(), undefined, 'a.ts');
    expect(warm).not.toBeInstanceOf(Promise);
    expect(warm).toEqual(countPass(makeRoot(), undefined, 'a.ts'));
  });

  it('passes the root, comments and file name to the loaded enhancer', async () => {
    const eager = Object.assign(vi.fn(countPass), { enhancerName: 'countPass' });
    const enhancer = createLazySourceEnhancer('countPass', async () => eager);
    const root = makeRoot();

    await enhancer(root, { 1: ['@highlight'] }, 'a.ts');

    expect(eager).toHaveBeenCalledWith(root, { 1: ['@highlight'] }, 'a.ts');
  });

  it('loads once for every call, including calls made while it loads', async () => {
    const load = vi.fn(async () => countPass);
    const enhancer = createLazySourceEnhancer('countPass', load);

    await Promise.all([
      enhancer(makeRoot(), undefined, 'a.ts'),
      enhancer(makeRoot(), undefined, 'b.ts'),
      enhancer.preload(),
    ]);
    enhancer(makeRoot(), undefined, 'c.ts');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps a separate cache for each enhancer', async () => {
    const first = createLazySourceEnhancer('countPass', async () => countPass);
    const second = createLazySourceEnhancer('countPass', async () => countPass);

    await first.preload();

    expect(first(makeRoot(), undefined, 'a.ts')).not.toBeInstanceOf(Promise);
    expect(second(makeRoot(), undefined, 'a.ts')).toBeInstanceOf(Promise);
  });

  it('runs synchronously after preload', async () => {
    const enhancer = createLazySourceEnhancer('countPass', async () => countPass);

    await enhancer.preload();

    expect(enhancer(makeRoot(), undefined, 'a.ts')).not.toBeInstanceOf(Promise);
  });

  it('accepts a module whose default export is the enhancer', async () => {
    const enhancer = createLazySourceEnhancer('countPass', async () => ({ default: countPass }));

    expect(await enhancer(makeRoot(), undefined, 'a.ts')).toEqual(
      countPass(makeRoot(), undefined, 'a.ts'),
    );
  });

  it('loads again after reset', async () => {
    const load = vi.fn(async () => countPass);
    const enhancer = createLazySourceEnhancer('countPass', load);
    await enhancer.preload();

    enhancer.reset();

    expect(enhancer(makeRoot(), undefined, 'a.ts')).toBeInstanceOf(Promise);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('tries loading again on the next call when a load fails', async () => {
    const load = vi
      .fn<() => Promise<SourceEnhancer>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValue(countPass);
    const enhancer = createLazySourceEnhancer('countPass', load);

    await expect(enhancer(makeRoot(), undefined, 'a.ts')).rejects.toThrow('chunk failed');

    expect(await enhancer(makeRoot(), undefined, 'a.ts')).toEqual(
      countPass(makeRoot(), undefined, 'a.ts'),
    );
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('warns when the loaded enhancer has another name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const enhancer = createLazySourceEnhancer('annotate', async () => countPass);

      await enhancer.preload();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('"annotate" loaded an enhancer named "countPass"'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  describe('in the enhancer pipeline', () => {
    it('records itself in appliedEnhancers', async () => {
      const enhancer = createLazySourceEnhancer('countPass', async () => countPass);

      const enhanced: HastRoot = await applyEnhancers(makeRoot(), undefined, 'a.ts', [enhancer]);

      expect(enhanced.data?.appliedEnhancers).toEqual(['countPass']);
    });

    it('never runs again on a root the eager enhancer already ran on, and never loads', async () => {
      const load = vi.fn(async () => countPass);
      const enhancer = createLazySourceEnhancer('countPass', load);
      const enhancedOnServer = await applyEnhancers(makeRoot(), undefined, 'a.ts', [countPass]);

      const enhanced: HastRoot = await applyEnhancers(enhancedOnServer, undefined, 'a.ts', [
        enhancer,
      ]);

      expect(enhanced.data?.totalLines).toBe(1);
      expect(load).not.toHaveBeenCalled();
    });
  });
});
