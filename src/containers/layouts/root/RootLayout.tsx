'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
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
  const direction = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <div
      className="min-h-screen bg-background font-sans antialiased"
      dir={direction}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange
        storageKey="theme"
      >
        <QueryClientProvider>
          <>
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
          </>
        </QueryClientProvider>
      </ThemeProvider>
      <Toaster />
    </div>
  );
}

export default RootLayout;
