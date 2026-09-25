import * as React from 'react';
import styles from './LandingSection.module.css';

export type LandingTone = 'plain' | 'tint' | 'solid';

export interface LandingSectionProps {
  /**
   * Background treatment of the band.
   * @default 'plain'
   */
  tone?: LandingTone;
  /**
   * Centers the heading and the lede that follows it.
   * @default false
   */
  centered?: boolean;
  /**
   * Keeps the content in a reading-width column, for bands led by text or a single code block.
   * @default false
   */
  narrow?: boolean;
  /**
   * Places adjacent code blocks side by side on wide screens.
   * @default false
   */
  columns?: boolean;
  /** Class for the band, used by the bands that build on this one. */
  className?: string;
  /** Markdown content, starting with the section's `h2`. */
  children: React.ReactNode;
}

/**
 * A full-width band of the landing page holding a column of markdown content.
 * Every other band builds on this one, so a page only ever nests one wrapper per band
 * and each import can sit directly above the band that uses it.
 */
export function LandingSection({
  tone = 'plain',
  centered = false,
  narrow = false,
  columns = false,
  className,
  children,
}: LandingSectionProps) {
  return (
    <section
      className={className ? `${styles.root} ${className}` : styles.root}
      data-landing-tone={tone}
      data-centered={centered ? '' : undefined}
      data-narrow={narrow ? '' : undefined}
      data-columns={columns ? '' : undefined}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
