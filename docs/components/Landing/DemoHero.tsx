import * as React from 'react';
import { wrapLandingActions } from './LandingActions';
import styles from './DemoHero.module.css';

/**
 * The opening band of the landing page: markdown copy beside a featured demo.
 * A line of the copy that holds nothing but links becomes its row of buttons.
 *
 * The `Demo` prefix is load-bearing. `transformMarkdownMetaLinks` strips the
 * `[See Demo]` fallback link that follows a top-level `<Demo… />` element, so
 * the link stays in the markdown source for GitHub readers without rendering here.
 * @param demo the demo shown beside the copy
 * @param children markdown copy, starting with the page's `h1`
 */
export function DemoHero({ demo, children }: { demo: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.copy}>{wrapLandingActions(children)}</div>
        <div className={styles.media}>
          <div className={styles.frame}>{demo}</div>
        </div>
      </div>
    </section>
  );
}
