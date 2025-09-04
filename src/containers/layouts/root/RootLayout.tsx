'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Toaster } from '@/components/ui/toaster';
import {
  QueryClientProvider,
} from '@/containers/providers';
import { cn } from '@/lib';
import { getDirection } from '@/lib/rtl';

type RootLayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
  locale: string;
  translations: Record<string, unknown>;
  theme?: string;
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
  theme,
  env,
}: RootLayoutProps) {
  const direction = getDirection(locale);
  const isRTL = direction === 'rtl';
  return (
    <div
      className={cn(
        'min-h-screen bg-background font-sans antialiased',
        isRTL && 'rtl',
      )}
      dir={direction}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme={theme || 'system'}
        enableSystem={true}
        disableTransitionOnChange
      >
        <QueryClientProvider>
          <>
            <NuqsAdapter>
              <NextIntlClientProvider messages={translations} locale={locale}>
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
