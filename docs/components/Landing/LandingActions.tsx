import * as React from 'react';
import styles from './LandingActions.module.css';

/**
 * Presents a paragraph of markdown links as a row of buttons.
 * The first link is the primary action.
 * @param children a markdown paragraph holding one or more links
 */
export function LandingActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}

function isLink(node: React.ReactNode) {
  return React.isValidElement<{ href?: string }>(node) && typeof node.props.href === 'string';
}

function isLinkRow(node: React.ReactNode): node is React.ReactElement {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return false;
  }

  const parts = React.Children.toArray(node.props.children).filter(
    (part) => typeof part !== 'string' || part.trim() !== '',
  );

  return parts.length > 0 && parts.every(isLink);
}

/**
 * Wraps each child that holds nothing but links in `LandingActions`, so a band can turn
 * a plain markdown line of links into its row of buttons without another wrapper in the page.
 * @param children the band's markdown children
 */
export function wrapLandingActions(children: React.ReactNode) {
  return React.Children.toArray(children).map((child) =>
    isLinkRow(child) ? <LandingActions key={child.key}>{child}</LandingActions> : child,
  );
}
