import * as React from 'react';
import { CodeHighlighter } from '@fairgarden/docs/CodeHighlighter';
import type { CodeHighlighterProps } from '@fairgarden/docs/CodeHighlighter/types';
import { CodeContent } from '../CodeContent';

type PreProps = {
  'data-name'?: string;
  'data-slug'?: string;
  'data-precompute'?: string;
  'data-content-props'?: string;
  /**
   * Renders the code block. A wrapper can swap it, for example to give the
   * blocks it holds a collapsible window.
   * @default CodeContent
   */
  Content?: CodeHighlighterProps<object>['Content'];
  /** Placeholder shown until a lazy `Content` loads. */
  ContentLoading?: CodeHighlighterProps<object>['ContentLoading'];
};

export function Pre(props: PreProps) {
  if (!props['data-precompute']) {
    return (
      <div>
        Expected precompute data to be provided. Ensure that transformHtmlCodeBlock rehype plugin is
        used.
      </div>
    );
  }

  const precompute = JSON.parse(
    props['data-precompute'],
  ) as CodeHighlighterProps<object>['precompute'];

  const contentProps = props['data-content-props']
    ? JSON.parse(props['data-content-props'])
    : ({} as Record<string, unknown> | null);

  return (
    <CodeHighlighter
      name={props['data-name']}
      slug={props['data-slug']}
      precompute={precompute}
      Content={props.Content ?? CodeContent}
      ContentLoading={props.ContentLoading}
      contentProps={contentProps}
    />
  );
}
