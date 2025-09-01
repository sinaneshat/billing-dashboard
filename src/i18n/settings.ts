export enum SupportedLanguages {
  EN = 'en',
  FA = 'fa', // Persian/Farsi support
}

export const fallbackLng = SupportedLanguages.EN;
export const languages = [SupportedLanguages.EN, SupportedLanguages.FA];
export const defaultNS = 'translation';
export const i18nCookieName = 'NEXT_LOCALE';

// RTL language configuration
export const rtlLanguages = [SupportedLanguages.FA];
export const isRTL = (locale: string): boolean => rtlLanguages.includes(locale as SupportedLanguages);
