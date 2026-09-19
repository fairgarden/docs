import * as React from 'react';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';
import styles from './LandingSteps.module.css';

/**
 * A band that presents its markdown ordered list as numbered steps.
 * Each item leads with its title in bold, and adjacent code blocks sit side by side.
 * @param tone background treatment of the band
 * @param children markdown content with an ordered list such as `1. **Title.** Description`
 */
export function LandingSteps({
  tone = 'plain',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  return (
    <LandingSection tone={tone} columns className={styles.root}>
      {children}
    </LandingSection>
  );
}
