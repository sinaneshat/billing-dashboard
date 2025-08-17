'use client';

import { Space_Grotesk } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Toaster } from '@/components/ui/toaster';
import {
  QueryClientProvider,
} from '@/containers/providers';
import { cn } from '@/lib/utils/tailwind';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
});

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
    <html
      lang={locale}
      className={`${spaceGrotesk.className}`}
      suppressHydrationWarning
    >
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          spaceGrotesk.className,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
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
                  <Toaster />
                </NextIntlClientProvider>
              </NuqsAdapter>
            </>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

export default RootLayout;
