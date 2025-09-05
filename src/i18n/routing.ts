// Simple i18n configuration without routing
export const locales = ['en', 'fa'] as const;
export const defaultLocale = 'en';

export type Locale = (typeof locales)[number];
