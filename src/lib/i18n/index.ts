/**
 * Internationalization Utilities - English-only
 *
 * This application uses next-intl for translation key management with English-only support.
 *
 * **Usage in components:**
 * ```tsx
 * import { useTranslations } from 'next-intl';
 *
 * export function MyComponent() {
 *   const t = useTranslations('namespace');
 *   return <h1>{t('key')}</h1>;
 * }
 * ```
 *
 * **Translation keys:** Located in `/src/i18n/locales/en/common.json`
 * **Locale:** Hardcoded to 'en' throughout the application
 * **Currency:** USD-only formatting via standard Intl.NumberFormat
 *
 * Note: Import hooks directly from 'next-intl' rather than from this module.
 */

// Locale utility (returns 'en' for English-only app)
export { getUserLocale } from './locale-cookies';
