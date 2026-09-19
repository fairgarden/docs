import * as React from 'react';
import styles from './LandingFooter.module.css';

/**
 * The closing band of the landing page, for license and provenance notes.
 * @param children markdown content
 */
export function LandingFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className={styles.root}>
      <div className={styles.inner}>{children}</div>
    </footer>
  );
}
