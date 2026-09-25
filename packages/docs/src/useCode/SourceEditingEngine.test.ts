import { describe, it, expect } from 'vitest';
import { toControlledCode } from './SourceEditingEngine';
import { stringOrHastToString } from '../pipeline/hastUtils';
import { createCompressedFile } from '../pipeline/hastUtils/hastCompression.testUtils';
import type { Code } from '../CodeHighlighter/types';

describe('toControlledCode', () => {
  it('converts plain string sources and string extra files', () => {
    const code: Code = {
      Default: {
        fileName: 'Button.tsx',
        source: 'const button = 1;',
        extraFiles: { 'styles.css': '.button {}' },
      },
    };

    const controlled = toControlledCode(code, 'Default', undefined, stringOrHastToString);

    expect(controlled.Default?.source).toBe('const button = 1;');
    expect(controlled.Default?.extraFiles?.['styles.css']?.source).toBe('.button {}');
  });

  describe('compressed sources', () => {
    it('decodes the main file with its own fallback when the fallbacks map holds a same-named file of another variant', () => {
      const first = createCompressedFile('const first: number = 1;');
      const second = createCompressedFile('const second: number = 2;');
      const code: Code = {
        Second: { fileName: 'Button.tsx', ...second },
      };

      const controlled = toControlledCode(
        code,
        'Second',
        { 'Button.tsx': first.fallback },
        stringOrHastToString,
      );

      expect(controlled.Second?.source).toBe('const second: number = 2;');
    });

    it('decodes an extra file with its own fallback when the fallbacks map holds a same-named file of another variant', () => {
      const firstStyles = createCompressedFile('.first { color: red; }');
      const secondStyles = createCompressedFile('.second { color: blue; }');
      const code: Code = {
        Second: {
          fileName: 'Button.tsx',
          source: 'const second = 2;',
          extraFiles: { 'styles.css': secondStyles },
        },
      };

      const controlled = toControlledCode(
        code,
        'Second',
        { 'styles.css': firstStyles.fallback },
        stringOrHastToString,
      );

      expect(controlled.Second?.extraFiles?.['styles.css']?.source).toBe(
        '.second { color: blue; }',
      );
    });

    it('decodes the active variant with the fallbacks map when its own fallback was stripped', () => {
      const button = createCompressedFile('const button: number = 1;');
      const styles = createCompressedFile('.button { color: red; }');
      const code: Code = {
        Default: {
          fileName: 'Button.tsx',
          source: button.source,
          extraFiles: { 'styles.css': { source: styles.source } },
        },
      };

      const controlled = toControlledCode(
        code,
        'Default',
        { 'Button.tsx': button.fallback, 'styles.css': styles.fallback },
        stringOrHastToString,
      );

      expect(controlled.Default?.source).toBe('const button: number = 1;');
      expect(controlled.Default?.extraFiles?.['styles.css']?.source).toBe(
        '.button { color: red; }',
      );
    });
  });
});
