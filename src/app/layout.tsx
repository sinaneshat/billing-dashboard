// File: src/app/layout.tsx
import './global.css';
import './globals-rtl.css'; // RTL styles

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';
import React from 'react';

import { BRAND } from '@/constants/brand';
import { RootLayout } from '@/containers/layouts/root';
import { isRTL } from '@/i18n/settings';
import { createMetadata } from '@/utils/metadata';

// Configure IBM Plex Sans Arabic for excellent Persian and English bilingual support
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['latin', 'arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans-arabic',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  // parent: ResolvingMetadata
  return createMetadata({
    title: BRAND.fullName,
    description: BRAND.description,
  });
}

type RootLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default async function Layout({ children, modal }: RootLayoutProps) {
  const locale = await getLocale();
  const translations = await getMessages();
  const env = process.env;
  const direction = isRTL(locale) ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${ibmPlexSansArabic.variable} ${ibmPlexSansArabic.className} ${direction} lang-${locale}`}
    >
      <body>
        <RootLayout
          locale={locale}
          translations={translations as Record<string, unknown>}
          modal={modal}
          env={{
            NEXT_PUBLIC_WEBAPP_ENV: env.NEXT_PUBLIC_WEBAPP_ENV,
            NEXT_PUBLIC_MAINTENANCE: env.NEXT_PUBLIC_MAINTENANCE,
          }}
        >
          {children}
        </RootLayout>
      </body>
    </html>
  );
}
