import * as React from 'react';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';
import styles from './LandingLinks.module.css';

/**
 * A band that presents its markdown list of links as a grid of cards.
 * Each item is a link followed by a paragraph describing where it leads,
 * and the whole card follows the link.
 * @param tone background treatment of the band
 * @param children markdown content with a loose list, one link and one description per item
 */
export function LandingLinks({
  tone = 'plain',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  return (
    <LandingSection tone={tone} centered className={styles.root}>
      {children}
    </LandingSection>
  );
}
