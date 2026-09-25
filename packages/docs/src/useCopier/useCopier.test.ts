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

/**
 * Replaces `navigator.clipboard` with one whose writes stay pending until the
 * test resolves them, in the order they were made, to model slow or
 * overlapping clipboard writes.
 */
function stubDeferredClipboard() {
  const pending: Array<{ text: string; resolve: () => void }> = [];
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) =>
        new Promise<void>((resolve) => {
          pending.push({ text, resolve });
        }),
    },
  });
  const restore = () => {
    delete (window.navigator as { clipboard?: Clipboard }).clipboard;
  };
  return { pending, restore };
}

const clickEvent = {} as React.MouseEvent<Element>;

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

  describe('repeated copies', () => {
    it('keeps the feedback for the full timeout after a second copy within the window', async () => {
      const { writes, restore } = stubClipboard();
      vi.useFakeTimers();
      try {
        const copied: string[] = [];
        const renders: boolean[] = [];
        const { result } = renderHook(() => {
          const copier = useCopier('Button', {
            timeout: 2000,
            onCopied: () => copied.push('copied'),
          });
          renders.push(copier.recentlySuccessful);
          return copier;
        });

        await act(async () => {
          await result.current.copy(clickEvent);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1500);
        });
        renders.length = 0;
        await act(async () => {
          await result.current.copy(clickEvent);
        });
        // The second copy restarts the window without dropping the flag first.
        expect(renders).not.toContain(false);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1999);
        });
        expect(result.current.recentlySuccessful).toBe(true);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(result.current.recentlySuccessful).toBe(false);
        expect(writes).toEqual(['Button', 'Button']);
        expect(copied).toEqual(['copied', 'copied']);
      } finally {
        vi.useRealTimers();
        restore();
      }
    });

    it('keeps the feedback on while a second copy is still writing', async () => {
      // A toast keyed on the flag would otherwise unmount and replay.
      const { pending, restore } = stubDeferredClipboard();
      try {
        const { result } = renderHook(() => useCopier('Button'));

        let firstCopy: Promise<void> | undefined;
        act(() => {
          firstCopy = result.current.copy(clickEvent);
        });
        await act(async () => {
          pending[0].resolve();
          await firstCopy;
        });
        expect(result.current.recentlySuccessful).toBe(true);

        let secondCopy: Promise<void> | undefined;
        act(() => {
          secondCopy = result.current.copy(clickEvent);
        });
        expect(result.current.recentlySuccessful).toBe(true);

        await act(async () => {
          pending[1].resolve();
          await secondCopy;
        });
        expect(result.current.recentlySuccessful).toBe(true);
      } finally {
        restore();
      }
    });

    it('times the feedback from the last write to finish when copies overlap', async () => {
      const { pending, restore } = stubDeferredClipboard();
      vi.useFakeTimers();
      try {
        const copied: string[] = [];
        let label = 'Button';
        const { result } = renderHook(() =>
          useCopier(() => label, { timeout: 2000, onCopied: () => copied.push(label) }),
        );

        // Both copies start before either write finishes.
        let firstCopy: Promise<void> | undefined;
        act(() => {
          firstCopy = result.current.copy(clickEvent);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        label = 'Checkbox';
        let secondCopy: Promise<void> | undefined;
        act(() => {
          secondCopy = result.current.copy(clickEvent);
        });
        expect(pending.map((write) => write.text)).toEqual(['Button', 'Checkbox']);

        // The first write finishes at t=1000, the second at t=1500.
        await act(async () => {
          pending[0].resolve();
          await firstCopy;
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
        await act(async () => {
          pending[1].resolve();
          await secondCopy;
        });

        // The first write's window would have ended at t=3000.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1999);
        });
        expect(result.current.recentlySuccessful).toBe(true);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(result.current.recentlySuccessful).toBe(false);
        expect(copied).toHaveLength(2);
      } finally {
        vi.useRealTimers();
        restore();
      }
    });

    it('keeps the window of a faster second write when a slower first write finishes later', async () => {
      const { pending, restore } = stubDeferredClipboard();
      vi.useFakeTimers();
      try {
        const { result } = renderHook(() => useCopier('Button', { timeout: 2000 }));

        let slowCopy: Promise<void> | undefined;
        act(() => {
          slowCopy = result.current.copy(clickEvent);
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
        let fastCopy: Promise<void> | undefined;
        act(() => {
          fastCopy = result.current.copy(clickEvent);
        });

        // The second write finishes first, at t=1000; the first at t=1500.
        await act(async () => {
          pending[1].resolve();
          await fastCopy;
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
        await act(async () => {
          pending[0].resolve();
          await slowCopy;
        });

        // The feedback lasts until 2000 ms after the last write finished.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1999);
        });
        expect(result.current.recentlySuccessful).toBe(true);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
        expect(result.current.recentlySuccessful).toBe(false);
      } finally {
        vi.useRealTimers();
        restore();
      }
    });

    it('drops the feedback when a later copy fails', async () => {
      let fail = false;
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            if (fail) {
              throw new Error('Permission denied');
            }
          },
        },
      });
      try {
        const errors: unknown[] = [];
        const { result } = renderHook(() =>
          useCopier('Button', { onError: (error) => errors.push(error) }),
        );

        await act(async () => {
          await result.current.copy(clickEvent);
        });
        expect(result.current.recentlySuccessful).toBe(true);

        fail = true;
        await act(async () => {
          await result.current.copy(clickEvent);
        });
        expect(result.current.recentlySuccessful).toBe(false);
        expect(errors).toHaveLength(1);
      } finally {
        delete (window.navigator as { clipboard?: Clipboard }).clipboard;
      }
    });
  });

  describe('unmount', () => {
    it('leaves no timer behind when unmounted during the feedback window', async () => {
      const { restore } = stubClipboard();
      vi.useFakeTimers();
      try {
        const { result, unmount } = renderHook(() => useCopier('Button', { timeout: 2000 }));

        await act(async () => {
          await result.current.copy(clickEvent);
        });
        expect(result.current.recentlySuccessful).toBe(true);
        expect(vi.getTimerCount()).toBe(1);

        unmount();
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
        restore();
      }
    });

    it('starts no timer when a write finishes after unmounting', async () => {
      const { pending, restore } = stubDeferredClipboard();
      vi.useFakeTimers();
      try {
        const copied: string[] = [];
        const { result, unmount } = renderHook(() =>
          useCopier('Button', { timeout: 2000, onCopied: () => copied.push('copied') }),
        );

        let copy: Promise<void> | undefined;
        act(() => {
          copy = result.current.copy(clickEvent);
        });
        unmount();
        pending[0].resolve();
        await copy;

        expect(vi.getTimerCount()).toBe(0);
        // The write itself did succeed.
        expect(copied).toEqual(['copied']);
      } finally {
        vi.useRealTimers();
        restore();
      }
    });
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
