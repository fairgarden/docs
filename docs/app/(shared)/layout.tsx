import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import DemoCodeProvider from '@/demo-data/code-provider/DemoCodeProvider';
import { TypesDataProvider } from '@fairgarden/docs/useType';
import { CodeComponentsProvider } from '@/code-components';
import { Search } from '../search';
import styles from './layout.module.css';
import './tokens.css';

export const metadata: Metadata = {
  title: 'FairGarden Docs',
  description: 'Build-time optimized documentation infrastructure for React and Next.js sites',
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DemoCodeProvider>
      <CodeComponentsProvider>
        <TypesDataProvider>
          <div className={styles.root}>
            <header className={styles.header}>
              <div className={styles.headerInner}>
                <Link href="/" className={styles.brand}>
                  <img src="/logo.svg" alt="" />
                  <span>FairGarden Docs</span>
                </Link>
                <nav className={styles.nav} aria-label="Primary">
                  <Link href="/lib">Docs</Link>
                  <Link href="/lib/overview/architecture">Architecture</Link>
                  <a href="https://github.com/fairgarden/docs">GitHub</a>
                </nav>
                <Search enableKeyboardShortcut containedScroll />
              </div>
            </header>
            <main className={styles.main}>{children}</main>
          </div>
        </TypesDataProvider>
      </CodeComponentsProvider>
    </DemoCodeProvider>
  );
}
