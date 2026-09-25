import { describe, it, expect } from 'vitest';
import { getPendingTransformedCode } from './getPendingTransformedCode';
import type { Code } from './types';

const hast = (text: string) => ({
  type: 'root' as const,
  children: [{ type: 'text' as const, value: text }],
});

describe('getPendingTransformedCode', () => {
  const loaded: Code = {
    First: { fileName: 'First.tsx', source: 'const first = 1;' },
    Second: { fileName: 'Second.tsx', source: 'const second = 2;' },
  };
  const output: Code = {
    First: { fileName: 'First.tsx', source: hast('first, with deltas') },
    Second: { fileName: 'Second.tsx', source: hast('second, with deltas') },
  };

  it('is undefined before the first computation has finished', () => {
    expect(getPendingTransformedCode(output, loaded, {})).toBeUndefined();
  });

  it('keeps the finished output of variants whose content is unchanged, as the same or an equal object', () => {
    const parsed: Code = {
      First: { fileName: 'First.tsx', source: hast('first, parsed again') },
      Second: { fileName: 'Second.tsx', source: hast('second, parsed again') },
    };
    const nextLoaded: Code = { First: loaded.First, Second: structuredClone(loaded.Second) };

    expect(getPendingTransformedCode(parsed, nextLoaded, { loaded, output })).toEqual(output);
  });

  it('shows the new parse of changed and new variants', () => {
    const parsed: Code = {
      First: { fileName: 'First.tsx', source: hast('first, parsed again') },
      Second: { fileName: 'Second.tsx', source: hast('second, changed') },
      Third: { fileName: 'Third.tsx', source: hast('third, new') },
    };
    const nextLoaded: Code = {
      First: loaded.First,
      Second: { fileName: 'Second.tsx', source: 'const second = 3;' },
      Third: { fileName: 'Third.tsx', source: 'const third = 3;' },
    };

    expect(getPendingTransformedCode(parsed, nextLoaded, { loaded, output })).toEqual({
      First: output.First,
      Second: parsed.Second,
      Third: parsed.Third,
    });
  });
});
