import * as React from 'react';
import { Flower } from '@/components/Flower';
import styles from './garden.module.css';

export default function Garden() {
  return (
    <div className={styles.bed}>
      {/* @focus-start */}
      <Flower petals={5} color="crimson" size={96} />
      <Flower petals={8} color="purple" size={128} />
      <Flower petals={12} color="amber" size={96} />
      {/* @focus-end */}
    </div>
  );
}
