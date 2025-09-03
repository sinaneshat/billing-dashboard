import { z } from 'zod';

export const supportedLanguagesSchema = z.enum(['en']);
export type SupportedLanguages = z.infer<typeof supportedLanguagesSchema>;

export const fallbackLng: SupportedLanguages = 'en';
export const languages: SupportedLanguages[] = ['en'];
export const defaultNS = 'translation';
export const i18nCookieName = 'NEXT_LOCALE';
