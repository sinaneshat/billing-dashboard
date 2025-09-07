import { getRequestConfig } from 'next-intl/server';

import { formats } from './formats';

export default getRequestConfig(async () => {
  // FORCED: Always use Persian (fa) locale - user choice disabled
  const locale = 'fa';

  // Dynamic locale detection commented out - keeping code for future use
  /*
  // Read locale from cookie following official next-intl cookie pattern
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  // Use cookie value or fallback to default locale
  const requestLocale = localeCookie?.value || defaultLocale;

  // Validate that the incoming locale is supported
  if (!locales.includes(requestLocale as (typeof locales)[number])) {
    // If invalid locale in cookie, fallback to default instead of 404
    const locale = defaultLocale;
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
  */

  // Import messages for Persian locale
  const messages = await import(`./locales/${locale}/common.json`).then(
    module => module.default,
  );

  return {
    locale,
    messages,
    formats,
    timeZone: 'UTC',
  };
});
