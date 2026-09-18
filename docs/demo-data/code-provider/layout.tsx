'use client';

import * as React from 'react';
import { CodeProviderLazy } from '@fairgarden/docs/CodeProvider';
import { createEnhanceCodeEmphasis } from '@fairgarden/docs/pipeline/enhanceCodeEmphasis';

const sourceEnhancers = [
  createEnhanceCodeEmphasis({ paddingFrameMaxSize: 2, focusFramesMaxSize: 18 }),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CodeProviderLazy sourceEnhancers={sourceEnhancers}>{children}</CodeProviderLazy>;
}
