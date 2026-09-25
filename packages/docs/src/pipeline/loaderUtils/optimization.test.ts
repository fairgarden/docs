import { describe, it, expect, vi } from 'vitest';
import { resolveModulePath } from './resolveModulePath';
import type { DirectoryEntry } from './resolveModulePath';
import { parseImportsAndComments } from './parseImportsAndComments';

describe('Filesystem Optimization Tests', () => {
  it('should make only one directory read when includeTypeDefs is true', async () => {
    const mockDirectoryReader = vi.fn();

    // Mock filesystem with both .ts and .d.ts files
    const mockDirectoryContents: DirectoryEntry[] = [
      { name: 'Component.ts', isDirectory: false, isFile: true },
      { name: 'Component.d.ts', isDirectory: false, isFile: true },
    ];

    mockDirectoryReader.mockResolvedValue(mockDirectoryContents);

    // Call with includeTypeDefs = true
    const result = await resolveModulePath(
      '/src/Component',
      mockDirectoryReader,
      {},
      true, // includeTypeDefs
    );

    // Should have made only ONE directory read call
    expect(mockDirectoryReader).toHaveBeenCalledTimes(1);
    expect(mockDirectoryReader).toHaveBeenCalledWith('file:///src');

    // Should return both import and typeImport paths
    expect(result).toEqual({
      import: 'file:///src/Component.ts',
      typeImport: 'file:///src/Component.d.ts',
    });
  });

  it('should prioritize .d.ts for type imports and .ts for value imports in single pass', async () => {
    const mockDirectoryReader = vi.fn();

    // Mock filesystem with .ts, .tsx, .d.ts files
    const mockDirectoryContents: DirectoryEntry[] = [
      { name: 'Component.tsx', isDirectory: false, isFile: true },
      { name: 'Component.ts', isDirectory: false, isFile: true },
      { name: 'Component.d.ts', isDirectory: false, isFile: true },
    ];

    mockDirectoryReader.mockResolvedValue(mockDirectoryContents);

    // Call with includeTypeDefs = true
    const result = await resolveModulePath(
      '/src/Component',
      mockDirectoryReader,
      {},
      true, // includeTypeDefs
    );

    // Should have made only ONE directory read call
    expect(mockDirectoryReader).toHaveBeenCalledTimes(1);

    // Should prioritize .ts for value imports (VALUE_IMPORT_EXTENSIONS: ['.ts', '.tsx', '.js', '.jsx', '.d.ts'])
    // Should prioritize .d.ts for type imports (TYPE_IMPORT_EXTENSIONS: ['.d.ts', '.ts', '.tsx', '.js', '.jsx'])
    expect(result).toEqual({
      import: 'file:///src/Component.ts', // .ts comes first in VALUE_IMPORT_EXTENSIONS
      typeImport: 'file:///src/Component.d.ts', // .d.ts comes first in TYPE_IMPORT_EXTENSIONS
    });
  });

  it('should handle index files with single directory read', async () => {
    const mockDirectoryReader = vi.fn();

    // Mock parent directory
    const parentContents: DirectoryEntry[] = [
      { name: 'Component', isDirectory: true, isFile: false },
    ];

    // Mock Component directory contents
    const componentDirContents: DirectoryEntry[] = [
      { name: 'index.ts', isDirectory: false, isFile: true },
      { name: 'index.d.ts', isDirectory: false, isFile: true },
    ];

    mockDirectoryReader
      .mockResolvedValueOnce(parentContents) // First call for parent directory
      .mockResolvedValueOnce(componentDirContents); // Second call for Component directory

    // Call with includeTypeDefs = true
    const result = await resolveModulePath(
      '/src/Component',
      mockDirectoryReader,
      {},
      true, // includeTypeDefs
    );

    // Should have made TWO directory read calls (parent + Component directory)
    expect(mockDirectoryReader).toHaveBeenCalledTimes(2);
    expect(mockDirectoryReader).toHaveBeenNthCalledWith(1, 'file:///src');
    expect(mockDirectoryReader).toHaveBeenNthCalledWith(2, 'file:///src/Component');

    // Should return both index paths with correct priorities
    expect(result).toEqual({
      import: 'file:///src/Component/index.ts',
      typeImport: 'file:///src/Component/index.d.ts',
    });
  });

  it('should return single path when no type difference exists', async () => {
    const mockDirectoryReader = vi.fn();

    // Mock filesystem with only .ts file
    const mockDirectoryContents: DirectoryEntry[] = [
      { name: 'Component.ts', isDirectory: false, isFile: true },
    ];

    mockDirectoryReader.mockResolvedValue(mockDirectoryContents);

    // Call with includeTypeDefs = true
    const result = await resolveModulePath(
      '/src/Component',
      mockDirectoryReader,
      {},
      true, // includeTypeDefs
    );

    // Should have made only ONE directory read call
    expect(mockDirectoryReader).toHaveBeenCalledTimes(1);

    // Should return only import path when both resolve to the same file
    expect(result).toEqual({
      import: 'file:///src/Component.ts',
    });
  });
});

describe('parseImportsAndComments scales linearly', () => {
  // Each input once made the parser rescan earlier text for every position or
  // comment, so its parse time grew with the square of its size. In one pass,
  // parsing an input 16 times as large takes about 16 times as long; a rescan
  // takes about 256 times as long. The limit sits between the two, so the guard
  // doesn't depend on how fast the machine is, and taking the fastest of several
  // runs at each size keeps one-off pauses (JIT compilation, GC) out of it.
  const growth = 16;
  const maxTimeGrowth = 64;
  const options = {
    removeCommentsWithPrefix: ['@highlight'],
    notableCommentsPrefix: ['@highlight'],
  };

  /**
   * Parses `build(count)` and `build(count * growth)` several times, returning how
   * many times as long the larger input took, and its result.
   */
  function measureTimeGrowth(build: (count: number) => string, count: number, fileName: string) {
    const inputs = [build(count), build(count * growth)];
    const fastestMs = [Infinity, Infinity];
    // The larger input is parsed last in each round, so this ends as its result
    let result: ReturnType<typeof parseImportsAndComments> | undefined;
    for (let round = 0; round < 7; round += 1) {
      for (let index = 0; index < inputs.length; index += 1) {
        const start = performance.now();
        result = parseImportsAndComments(inputs[index], fileName, options);
        fastestMs[index] = Math.min(fastestMs[index], performance.now() - start);
      }
    }
    return { timeGrowth: fastestMs[1] / fastestMs[0], result: result! };
  }

  it('reads an MDX import after a very long line', () => {
    const { timeGrowth, result } = measureTimeGrowth(
      (count) => `${' '.repeat(count)}x\nimport { Button } from './Button';\n`,
      5_000,
      '/src/demo.mdx',
    );

    expect(Object.keys(result.relative)).toEqual(['./Button']);
    expect(timeGrowth).toBeLessThan(maxTimeGrowth);
  });

  it('strips and keeps many comments on one long line', () => {
    const { timeGrowth, result } = measureTimeGrowth(
      (count) => 'const count = 1; /* @highlight */ /* note */ '.repeat(count),
      300,
      '/src/demo.js',
    );

    expect(result.code).toBe('const count = 1; /* note */ '.repeat(300 * growth));
    expect(timeGrowth).toBeLessThan(maxTimeGrowth);
  });

  it('maps the positions of many imports in stripped code', () => {
    const count = 250;
    const { timeGrowth, result } = measureTimeGrowth(
      (importCount) =>
        Array.from(
          { length: importCount },
          (_, index) => `import { Item${index} } from './item${index}'; // @highlight`,
        ).join('\n'),
      count,
      '/src/demo.ts',
    );

    const lastIndex = count * growth - 1;
    const lastPath = `'./item${lastIndex}'`;
    const lastStart = result.code!.indexOf(lastPath);
    expect(result.relative[`./item${lastIndex}`].positions).toEqual([
      { start: lastStart, end: lastStart + lastPath.length },
    ]);
    expect(timeGrowth).toBeLessThan(maxTimeGrowth);
  });

  it('ends unfinished MDX ESM blocks without searching the rest of the file for each', () => {
    const { timeGrowth, result } = measureTimeGrowth(
      (count) => "export const loaders = {\n  load: () => import('./chart'),\n\n".repeat(count),
      250,
      '/src/demo.mdx',
    );

    expect(Object.keys(result.relative)).toEqual(['./chart']);
    expect(timeGrowth).toBeLessThan(maxTimeGrowth);
  });

  it('gives up on an unclosed export list without searching the rest of the file', () => {
    const { timeGrowth, result } = measureTimeGrowth(
      (count) => 'export { first, second\nconst count = 1;\n'.repeat(count),
      250,
      '/src/demo.ts',
    );

    expect(result.relative).toEqual({});
    expect(timeGrowth).toBeLessThan(maxTimeGrowth);
  });
});
