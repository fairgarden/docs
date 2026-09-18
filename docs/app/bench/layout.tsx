import * as React from 'react';
import type { Metadata } from 'next';

import { BenchProvider } from '@/components/BenchProvider';
import styles from '../layout.module.css';

export const metadata: Metadata = {
  title: 'FairGarden Docs Benchmarks',
  description: 'Performance demos for FairGarden Docs packages',
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <BenchProvider>{children}</BenchProvider>
      </div>
    </div>
  );
}
