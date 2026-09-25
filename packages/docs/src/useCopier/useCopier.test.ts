/**
 * @vitest-environment jsdom
 */
import type * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopier } from '.';

/**
 * Replaces `navigator.clipboard` with a recorder and returns the texts written
 * to it plus a function that restores the original (absent) clipboard.
 */
function stubClipboard() {
  const writes: string[] = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        writes.push(text);
      },
    },
  });
  const restore = () => {
    delete (window.navigator as { clipboard?: Clipboard }).clipboard;
  };
  return { writes, restore };
}

describe('useCopier', () => {
  it('writes the content, reports a recent copy and clears it after the timeout', async () => {
    const { writes, restore } = stubClipboard();
    vi.useFakeTimers();
    try {
      const copied: string[] = [];
      const { result } = renderHook(() =>
        useCopier('Button', { timeout: 1000, onCopied: () => copied.push('copied') }),
      );
      expect(result.current.recentlySuccessful).toBe(false);

      await act(async () => {
        await result.current.copy({} as React.MouseEvent<Element>);
      });
      expect(writes).toEqual(['Button']);
      expect(copied).toEqual(['copied']);
      expect(result.current.recentlySuccessful).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(result.current.recentlySuccessful).toBe(false);
    } finally {
      vi.useRealTimers();
      restore();
    }
  });

  it('reads the content from a function at copy time', async () => {
    const { writes, restore } = stubClipboard();
    try {
      let label = 'Button';
      const { result } = renderHook(() => useCopier(() => label));
      label = 'Checkbox';

      await act(async () => {
        await result.current.copy({} as React.MouseEvent<Element>);
      });
      expect(writes).toEqual(['Checkbox']);
      expect(result.current.recentlySuccessful).toBe(true);
    } finally {
      restore();
    }
  });

  describe('empty content', () => {
    it('does not report a copy when the content function returns undefined', async () => {
      const { writes, restore } = stubClipboard();
      try {
        const calls: string[] = [];
        const { result } = renderHook(() =>
          useCopier(() => undefined, {
            onCopied: () => calls.push('copied'),
            onError: () => calls.push('error'),
            onClick: () => calls.push('click'),
          }),
        );

        await act(async () => {
          await result.current.copy({} as React.MouseEvent<Element>);
        });
        expect(writes).toEqual([]);
        expect(result.current.recentlySuccessful).toBe(false);
        expect(calls).toEqual(['click']);
      } finally {
        restore();
      }
    });

    it('does not report a copy for an empty string', async () => {
      const { writes, restore } = stubClipboard();
      try {
        const calls: string[] = [];
        const { result } = renderHook(() =>
          useCopier('', {
            onCopied: () => calls.push('copied'),
            onError: () => calls.push('error'),
            onClick: () => calls.push('click'),
          }),
        );

        await act(async () => {
          await result.current.copy({} as React.MouseEvent<Element>);
        });
        expect(writes).toEqual([]);
        expect(result.current.recentlySuccessful).toBe(false);
        expect(calls).toEqual(['click']);
      } finally {
        restore();
      }
    });

    it('clears an earlier copy feedback when the content becomes empty', async () => {
      const { writes, restore } = stubClipboard();
      try {
        let label: string | undefined = 'Button';
        const { result } = renderHook(() => useCopier(() => label));

        await act(async () => {
          await result.current.copy({} as React.MouseEvent<Element>);
        });
        expect(result.current.recentlySuccessful).toBe(true);

        label = undefined;
        await act(async () => {
          await result.current.copy({} as React.MouseEvent<Element>);
        });
        expect(writes).toEqual(['Button']);
        expect(result.current.recentlySuccessful).toBe(false);
      } finally {
        restore();
      }
    });
  });

  it('reports a failed write through onError without a recent copy', async () => {
    const failure = new Error('Permission denied');
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw failure;
        },
      },
    });
    try {
      const errors: unknown[] = [];
      const clicks: string[] = [];
      const { result } = renderHook(() =>
        useCopier('Button', {
          onError: (error) => errors.push(error),
          onClick: () => clicks.push('click'),
        }),
      );

      await act(async () => {
        await result.current.copy({} as React.MouseEvent<Element>);
      });
      expect(errors).toHaveLength(1);
      expect(result.current.recentlySuccessful).toBe(false);
      expect(clicks).toEqual(['click']);
    } finally {
      delete (window.navigator as { clipboard?: Clipboard }).clipboard;
    }
  });
});
