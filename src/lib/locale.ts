'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

  cookieStore.set(COOKIE_NAME, locale);
  redirect('/');
}
