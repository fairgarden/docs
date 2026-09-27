'use client';

import * as React from 'react';
import type { ContentProps } from '@fairgarden/docs/CodeHighlighter/types';
import { CodeContent } from '../CodeContent';

// Code-split, and arriving a moment after the rest of the page, as over a slow
// network. Hydration waits for it, then renders the code block again, by which time
// the browser has loaded the lazy emphasis enhancer that the first attempt asked for.
const CodeNote = React.lazy(async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
  const { CodeNote: Note } = await import('./CodeNote');
  return { default: Note };
});

/**
 * The code block, followed by a code-split note with no loading state of its own.
 * The wrapper gets `data-hydrated` once React has hydrated it.
 */
export function InlineCodeContent(props: ContentProps<object>) {
  // @focus-start @padding 1
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.setAttribute('data-hydrated', '');
  }, []);

  return (
    <div ref={ref}>
      <CodeContent {...props} />
      <CodeNote />
    </div>
  );
  // @focus-end
}
