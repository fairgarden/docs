import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import DemoCodeProvider from '@/demo-data/code-provider/DemoCodeProvider';
import { TypesDataProvider } from '@fairgarden/docs/useType';
import { Navigation } from '@/components/Navigation';
import { CodeComponentsProvider } from '@/code-components';
import styles from '../layout.module.css';
import { sitemap } from '../sitemap';
import { Search } from '../search';

export const metadata: Metadata = {
  title: 'FairGarden Docs',
  description: 'How to use the FairGarden Docs package',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DemoCodeProvider>
      <CodeComponentsProvider>
        <TypesDataProvider>
          <div className={styles.root}>
            <div className={styles.header}>
              <div className={styles.headerContainer}>
                <Link href="/docs-infra" className={styles.brand}>
                  <div className={styles.logo}>
                    <img src="/logo.svg" alt="FairGarden Docs Logo" />
                  </div>
                  <span>FairGarden Docs</span>
                </Link>
                <Search enableKeyboardShortcut containedScroll />
              </div>
            </div>
            <div className={styles.contentWrapper}>
              <Navigation sitemap={sitemap} />
              <div className={styles.container}>
                <div className={styles.content}>{children}</div>
              </div>
            </div>
          </div>
        </TypesDataProvider>
      </CodeComponentsProvider>
    </DemoCodeProvider>
  );
}
