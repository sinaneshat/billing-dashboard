'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { toastManager } from '@/lib/toast/toast-manager';

type AsyncAction<T = unknown> = (param: T) => Promise<void>;
type SyncAction<T = unknown> = (param: T) => void;

type BillingActionOptions = {
  successMessage?: string;
  errorMessage?: string;
};

export function useBillingActions() {
  const t = useTranslations();

  const createAsyncAction = useCallback(<T>(
    action: AsyncAction<T>,
    options: BillingActionOptions = {},
  ) => {
    return async (param: T) => {
      try {
        await action(param);
        if (options.successMessage) {
          toastManager.success(options.successMessage);
        }
      } catch (error) {
        const errorMessage = options.errorMessage
          || (error instanceof Error ? error.message : t('common.errorOccurred'));
        toastManager.error(errorMessage);
      }
    };
  }, [t]);

  const createSyncAction = useCallback(<T>(
    action: SyncAction<T>,
    options: BillingActionOptions = {},
  ) => {
    return (param: T) => {
      try {
        action(param);
        if (options.successMessage) {
          toastManager.success(options.successMessage);
        }
      } catch (error) {
        const errorMessage = options.errorMessage
          || (error instanceof Error ? error.message : t('common.errorOccurred'));
        toastManager.error(errorMessage);
      }
    };
  }, [t]);

  const createDownloadAction = useCallback((
    downloadFn: AsyncAction<string>,
    itemType: 'receipt' | 'invoice' = 'receipt',
  ) => {
    return createAsyncAction(downloadFn, {
      successMessage: t(`billing.${itemType}Downloaded`),
      errorMessage: t(`billing.${itemType}DownloadFailed`),
    });
  }, [createAsyncAction, t]);

  const createDeleteAction = useCallback((
    deleteFn: AsyncAction<string>,
    itemType: string,
  ) => {
    return createAsyncAction(deleteFn, {
      successMessage: t(`billing.${itemType}Deleted`),
      errorMessage: t(`billing.${itemType}DeleteFailed`),
    });
  }, [createAsyncAction, t]);

  const createRetryAction = useCallback((
    retryFn: AsyncAction<string>,
  ) => {
    return createAsyncAction(retryFn, {
      successMessage: t('billing.retryInitiated'),
      errorMessage: t('billing.retryFailed'),
    });
  }, [createAsyncAction, t]);

  return {
    createAsyncAction,
    createSyncAction,
    createDownloadAction,
    createDeleteAction,
    createRetryAction,
  };
}
