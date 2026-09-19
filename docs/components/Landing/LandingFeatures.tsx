import * as React from 'react';
import { AppWindow, Braces, Layers, PencilLine, Search, Zap } from 'lucide-react';
import { LandingSection } from './LandingSection';
import type { LandingTone } from './LandingSection';
import styles from './LandingFeatures.module.css';

const ICONS = {
  demo: AppWindow,
  types: Braces,
  search: Search,
  build: Zap,
  edit: PencilLine,
  settle: Layers,
};

export type LandingFeatureIcon = keyof typeof ICONS;

/**
 * A feature card: an icon above markdown content.
 * When the content ends with a paragraph holding a link, the whole card follows that link.
 * @param icon the decorative icon shown above the content
 * @param children markdown content, starting with the card's `h3`
 */
function LandingFeature({
  icon,
  children,
}: {
  icon: LandingFeatureIcon;
  children: React.ReactNode;
}) {
  const Icon = ICONS[icon];

  return (
    <div className={styles.card}>
      <span className={styles.icon}>
        <Icon aria-hidden />
      </span>
      {children}
    </div>
  );
}

function isCard(child: React.ReactNode) {
  return React.isValidElement(child) && child.type === LandingFeature;
}

/**
 * A band that introduces a grid of feature cards.
 * Cards are written as `LandingFeatures.Item`, so the band is the only import a page needs.
 * @param tone background treatment of the band
 * @param children markdown content, followed by one `LandingFeatures.Item` per card
 */
export function LandingFeatures({
  tone = 'plain',
  children,
}: {
  tone?: LandingTone;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);
  const firstCard = items.findIndex(isCard);
  const lastCard = items.findLastIndex(isCard);

  if (firstCard === -1) {
    throw new Error('LandingFeatures expects at least one LandingFeatures.Item');
  }

  return (
    <LandingSection tone={tone} centered>
      {items.slice(0, firstCard)}
      <div className={styles.grid}>{items.slice(firstCard, lastCard + 1)}</div>
      {items.slice(lastCard + 1)}
    </LandingSection>
  );
}

LandingFeatures.Item = LandingFeature;
