/**
 * i18n Utility Functions
 * Helper functions for internationalization with next-intl
 */

import { useFormatter, useTranslations } from 'next-intl';

/**
 * Custom hook for formatting Toman currency
 */
export function useTomanFormatter() {
  const format = useFormatter();
  const t = useTranslations();

  return {
    formatToman: (amount: number) => {
      if (amount === 0)
        return t('plans.free');
      const formatted = format.number(amount, 'toman');
      return `${formatted} ${t('currency.toman')}`;
    },
    formatTomanShort: (amount: number) => {
      if (amount === 0)
        return t('plans.free');
      return format.number(amount, 'toman');
    },
  };
}

/**
 * Translation keys for common UI patterns
 */
export const commonKeys = {
  // Actions
  save: 'actions.save',
  cancel: 'actions.cancel',
  delete: 'actions.delete',
  edit: 'actions.edit',
  loading: 'actions.loading',
  tryAgain: 'actions.tryAgain',

  // Status
  active: 'status.active',
  inactive: 'status.inactive',
  pending: 'status.pending',
  completed: 'status.completed',
  failed: 'status.failed',

  // States
  loadingDefault: 'states.loading.default',
  errorDefault: 'states.error.default',
  emptyDefault: 'states.empty.default',
  successDefault: 'states.success.default',

  // Time
  now: 'time.now',
  today: 'time.today',
  perMonth: 'time.perMonth',
  forever: 'time.forever',
} as const;

/**
 * Type-safe translation key helper
 */
export type TranslationKey = keyof typeof commonKeys;
