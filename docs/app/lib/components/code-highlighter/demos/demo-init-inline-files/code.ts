import type { Code } from '@fairgarden/docs/CodeHighlighter/types';

const checkbox = `import * as React from 'react';
import { useChecked } from './useChecked';
import styles from './checkbox.module.css';

interface CheckboxProps {
  label: string;
}

export function Checkbox({ label }: CheckboxProps) {
  const [checked, toggle] = useChecked(false);
  return (
    <label className={styles.root}>
      <input type="checkbox" checked={checked} onChange={toggle} />
      {label}
    </label>
  );
}`;

const checkboxStyles = `.root {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}`;

const useChecked = `import * as React from 'react';

export function useChecked(initial: boolean): [boolean, () => void] {
  const [checked, setChecked] = React.useState<boolean>(initial);
  const toggle = React.useCallback(() => setChecked((value) => !value), []);
  return [checked, toggle];
}`;

const index = `export * from './Checkbox';`;

/**
 * One variant with four inline files and no `url`: every source is a plain
 * string the highlighter has to parse itself.
 */
export const code: Code = {
  Default: {
    fileName: 'Checkbox.tsx',
    source: checkbox,
    extraFiles: {
      'checkbox.module.css': { source: checkboxStyles },
      'useChecked.ts': { source: useChecked },
      'index.ts': { source: index },
    },
  },
};
