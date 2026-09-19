import * as React from 'react';
import styles from './Flower.module.css';

export type FlowerColor = 'purple' | 'plum' | 'crimson' | 'amber';

export interface FlowerProps {
  /**
   * Number of petals fanned evenly around the center.
   * @default 8
   */
  petals?: number;
  /**
   * Petal color, taken from the Radix color scales.
   * @default 'purple'
   */
  color?: FlowerColor;
  /**
   * Width and height of the flower in pixels.
   * @default 160
   */
  size?: number;
  /**
   * Accessible name. The flower is treated as decorative when omitted.
   */
  label?: string;
}

const MIN_PETALS = 1;
const MAX_PETALS = 24;

/**
 * A flat flower that fans its petals evenly around the center.
 * It mainly serves as the component documented by the landing page demos.
 */
export function Flower(props: FlowerProps) {
  const { petals = 8, color = 'purple', size = 160, label } = props;

  const count = Math.min(MAX_PETALS, Math.max(MIN_PETALS, Math.round(petals) || MIN_PETALS));
  // Fewer petals are drawn wider so the flower always reads as full.
  const petalWidth = Math.min(13, Math.max(5, 60 / count + 3));
  // Purple is the stylesheet's default, and an unknown color falls back to it.
  const className = [styles.root, styles[color]].filter(Boolean).join(' ');

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from(Array(count).keys(), (index) => (
        <g
          key={index}
          className={styles.spoke}
          style={{ transform: `rotate(${(index * 360) / count}deg)` }}
        >
          <ellipse className={styles.petal} cx="0" cy="-27" rx={petalWidth} ry="19" />
        </g>
      ))}
      <circle className={styles.center} r="11" />
    </svg>
  );
}
