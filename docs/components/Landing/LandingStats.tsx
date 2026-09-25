import * as React from 'react';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';
import styles from './LandingStats.module.css';

/**
 * A band that presents its markdown list as a row of headline figures.
 * Each item leads with its figure in bold, followed by a sentence-case label.
 * @param tone background treatment of the band
 * @param children markdown content with a list such as `- **-58%** HTML parse time`
 */
export function LandingStats({
  tone = 'solid',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  return (
    <LandingSection tone={tone} className={styles.root}>
      {children}
    </LandingSection>
  );
}
