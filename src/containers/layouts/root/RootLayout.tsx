'use client';

import { NextIntlClientProvider } from 'next-intl';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Toaster } from '@/components/ui/toaster';
import {
  QueryClientProvider,
} from '@/containers/providers';

type RootLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
  locale: string;
  translations: Record<string, unknown>;
  env: {
    NEXT_PUBLIC_WEBAPP_ENV?: string;
    NEXT_PUBLIC_MAINTENANCE?: string;
  };
};

export function RootLayout({
  children,
  modal,
  locale,
  translations,
  env,
}: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <QueryClientProvider>
        <NuqsAdapter>
          <NextIntlClientProvider
            messages={translations}
            locale={locale}
            timeZone="UTC"
          >
            {env.NEXT_PUBLIC_MAINTENANCE !== 'true'
              ? (
                  <main>{children}</main>
                )
              : (
                  <div>Maintenance</div>
                )}
            {modal}
          </NextIntlClientProvider>
        </NuqsAdapter>
      </QueryClientProvider>
      <Toaster />
    </div>
  );
}

export default RootLayout;
