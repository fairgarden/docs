'use client';

import * as React from 'react';
import { CodeControllerContext } from '@fairgarden/docs/CodeControllerContext';
import type { CodeControllerProps } from '@fairgarden/docs/CodeControllerContext';
import { useCrossTabState } from '@fairgarden/docs/useCrossTabState';
import type { ControlledCode } from '@fairgarden/docs/CodeHighlighter/types';

export function CodeController({ children, url }: CodeControllerProps) {
  // `useCrossTabState` owns the controlled code and mirrors it across same-origin tabs.
  // The demo's `url` names the channel so each demo syncs on its own.
  // @focus-start @padding 1
  const [code, setCode] = useCrossTabState<ControlledCode | undefined>(url ?? null, undefined);

  const contextValue = React.useMemo(() => ({ code, setCode }), [code, setCode]);

  return (
    <CodeControllerContext.Provider value={contextValue}>{children}</CodeControllerContext.Provider>
  );
  // @focus-end
}
