'use client';

import * as React from 'react';
import type { ContentLoadingProps } from '@fairgarden/docs/CodeHighlighter/types';
import { useCodeFallback } from '@fairgarden/docs/CodeHighlighter';
import { hastToJsx } from '@fairgarden/docs/pipeline/hastUtils';
import { getLanguageFromExtension } from '@fairgarden/docs/pipeline/loaderUtils';
import { CollapsibleDemoContentLoading } from '../../lib/hooks/use-code-window/demos/CollapsibleDemoContentLoading';
import styles from './DemoContentLoading.module.css';

/** Derive a `language-*` hint from a file name's extension (e.g. `.css` → `css`). */
function languageForFile(fileName: string): string | undefined {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? getLanguageFromExtension(fileName.slice(dot)) : undefined;
}

/**
 * Pre-hydration fallback that keeps every file of the demo in the initial HTML.
 * The collapsible fallback paints the selected file, and the files behind the other
 * tabs follow as plain text in semantic `<dl>` markup that only crawlers read.
 */
export function DemoContentLoading(props: ContentLoadingProps<object>) {
  // @focus-start @padding 1
  // `useCodeFallback` decodes the compact per-file fallbacks. The collapsible fallback
  // below calls it too, for the selected file, and the hook hoists the same data either way.
  const { extraSource } = useCodeFallback(props);
  const extraFiles = Object.entries(extraSource ?? {});

  return (
    <React.Fragment>
      <CollapsibleDemoContentLoading {...props} />
      {extraFiles.length > 0 && (
        <section className={styles.files}>
          <figure>
            <dl>
              {extraFiles.map(([fileName, file]) => {
                const language = languageForFile(fileName);
                return (
                  <React.Fragment key={fileName}>
                    <dt>
                      <code>{fileName}</code>
                    </dt>
                    <dd>
                      <pre>
                        <code
                          className={language ? `language-${language}` : undefined}
                          data-filename={fileName}
                        >
                          {hastToJsx(file.source)}
                        </code>
                      </pre>
                    </dd>
                  </React.Fragment>
                );
              })}
            </dl>
          </figure>
        </section>
      )}
    </React.Fragment>
  );
  // @focus-end
}
