import * as React from 'react';
import type { Metadata } from 'next';
import { Google_Sans, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import styles from './layout.module.css';
import './global.css';

const googleSans = Google_Sans({
  variable: '--font-text',
  subsets: ['latin'],
  axes: ['opsz', 'GRAD'],
  fallback: ['Arial', 'sans-serif'],
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-code',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal'],
  fallback: ["'Courier New'", 'Courier', 'monospace'],
});

const fontClassNames = [googleSans.variable, jetBrainsMono.variable].join(' ');

export const metadata: Metadata = {
  title: 'FairGarden Docs',
  description: 'How to use the FairGarden Docs packages',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#8265ab" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="FG Docs" />
        <link rel="manifest" href="/site.webmanifest" />
        <Analytics />
        <SpeedInsights />
      </head>
      <body className={`${fontClassNames} ${styles.body}`}>
        <div>{children}</div>
      </body>
    </html>
  );
}
