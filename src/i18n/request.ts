import { getRequestConfig } from 'next-intl/server';

import { formats } from './formats';
import { defaultLocale } from './routing';

export default getRequestConfig(async () => {
  // Always use the default locale since we don't have routing
  const locale = defaultLocale;

  // Import messages for the locale (single file contains all translations)
  const messages = await import(`./locales/${locale}/common.json`).then(
    module => module.default,
  );

  return {
    locale,
    messages,
    formats,
    // Set a default timezone (can be overridden by user preferences)
    timeZone: 'UTC',
  };
});
