import * as React from 'react';
import copyToClipboard from 'clipboard-copy';

type OnCopied = () => void;
type OnCopyError = (error: unknown) => void;
type OnCopyClick = (event: React.MouseEvent<Element>) => void;
export type UseCopierOpts = {
  onCopied?: OnCopied;
  onError?: OnCopyError;
  onClick?: OnCopyClick;
  timeout?: number;
};

export function useCopier(contents: (() => string | undefined) | string, opts?: UseCopierOpts) {
  const { onCopied, onError, onClick, timeout = 2000 } = opts || {};

  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = React.useRef(false);
  const [recentlySuccessful, setRecentlySuccessful] = React.useState(false);

  // Clear the feedback timer on unmount, and let an in-flight write that
  // finishes afterwards know not to start a new one.
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copy = React.useCallback(
    async (event: React.MouseEvent<Element>) => {
      // Ends the feedback now, for a copy that wrote nothing or failed.
      const endFeedback = () => {
        clearTimeout(copyTimeoutRef.current);
        if (mountedRef.current) {
          setRecentlySuccessful(false);
        }
      };

      try {
        const content = typeof contents === 'function' ? contents() : contents;
        // Nothing to copy: leave the clipboard untouched and report no copy, so
        // `recentlySuccessful` only ever means that something was written.
        if (content) {
          await copyToClipboard(content);

          // Each successful write restarts the window, whichever copy it
          // belongs to, so the feedback lasts `timeout` after the last write
          // to finish. The flag stays on in between, so it doesn't flicker.
          clearTimeout(copyTimeoutRef.current);
          if (mountedRef.current) {
            setRecentlySuccessful(true);
            copyTimeoutRef.current = setTimeout(() => {
              setRecentlySuccessful(false);
            }, timeout);
          }
          onCopied?.();
        } else {
          endFeedback();
        }
      } catch (error) {
        endFeedback();
        onError?.(error);
      }

      onClick?.(event);
    },
    [contents, timeout, onCopied, onError, onClick],
  );

  return { copy, recentlySuccessful };
}
