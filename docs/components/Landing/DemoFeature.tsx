import * as React from 'react';
import type { LandingTone } from './LandingSection';
import styles from './DemoFeature.module.css';

export interface DemoFeatureProps {
  /** The demo, types table or other exhibit shown beside the copy. */
  media: React.ReactNode;
  /**
   * Background treatment of the band.
   * @default 'plain'
   */
  tone?: Exclude<LandingTone, 'solid'>;
  /**
   * Places the exhibit before the copy on wide screens.
   * @default false
   */
  reverse?: boolean;
  /** Markdown copy, starting with the section's `h2`. */
  children: React.ReactNode;
}

/**
 * A band that pairs markdown copy with a live exhibit.
 *
 * The `Demo` prefix is load-bearing. `transformMarkdownMetaLinks` strips the
 * `[See Demo]` or `[See Types]` fallback link that follows a top-level `<Demo… />`
 * element, so the link stays in the markdown source for GitHub readers without rendering here.
 */
export function DemoFeature({
  media,
  tone = 'plain',
  reverse = false,
  children,
}: DemoFeatureProps) {
  return (
    <section
      className={styles.root}
      data-landing-tone={tone}
      data-reverse={reverse ? '' : undefined}
    >
      <div className={styles.inner}>
        <div className={styles.copy}>{children}</div>
        <div className={styles.media}>{media}</div>
      </div>
    </section>
  );
}
