'use server';

import { cookies } from 'next/headers';

import type { Locale } from '@/i18n/routing';
import { defaultLocale, locales } from '@/i18n/routing';

const COOKIE_NAME = 'NEXT_LOCALE';

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return (cookieStore.get(COOKIE_NAME)?.value as Locale) ?? defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();

  // Validate locale
  if (!locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  // Set locale cookie with proper settings for persistence
  cookieStore.set(COOKIE_NAME, locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  // According to Context7 next-intl docs: Don't redirect, let client handle refresh
  // This preserves theme state and prevents UI flash
}
