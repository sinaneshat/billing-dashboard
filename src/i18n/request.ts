import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { formats } from './formats';
import { locales } from './routing';

export default getRequestConfig(async () => {
  // Dynamic locale detection using cookies
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  // Use cookie value or fallback to default locale (English)
  const requestLocale = localeCookie?.value || 'en';

  // Validate that the incoming locale is supported
  if (!locales.includes(requestLocale as (typeof locales)[number])) {
    // If invalid locale in cookie, fallback to default (English)
    const locale = 'en';
    const messages = await import(`./locales/${locale}/common.json`).then(
      module => module.default,
    );

    return {
      locale,
      messages,
      formats,
      timeZone: 'UTC',
    };
  }

  // Import messages for the valid locale
  const messages = await import(`./locales/${requestLocale}/common.json`).then(
    module => module.default,
  );

  return {
    locale: requestLocale,
    messages,
    formats,
    // Set a default timezone (can be overridden by user preferences)
    timeZone: 'UTC',
  };
});
