// File: src/app/layout.tsx
import '../styles/rtl.css';
import './global.css';

import type { Metadata, Viewport } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import React from 'react';

import { BRAND } from '@/constants/brand';
import { RootLayout } from '@/containers/layouts/root';
import { createMetadata } from '@/utils/metadata';

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
  // Remove server-side theme reading to prevent theme resets during language switching
  const env = process.env;

  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`lang-${locale} dir-${direction}`}
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
