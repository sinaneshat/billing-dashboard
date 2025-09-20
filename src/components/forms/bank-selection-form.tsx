'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTomanCurrency } from '@/lib/format';

import FormProvider from './form-provider';
import RHFRadioGroup from './rhf-radio-group';

// Schema for bank selection
const BankSelectionFormSchema = z.object({
  selectedBankCode: z.string().min(1, 'validation.bankRequired'),
});

export type BankSelectionFormData = z.infer<typeof BankSelectionFormSchema>;

type Bank = {
  name: string;
  slug: string;
  bankCode: string;
  maxDailyAmount: number;
  maxDailyCount: number | null;
};

type BankSelectionFormProps = {
  banks: Bank[];
  onSubmit: (data: BankSelectionFormData) => void | Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  className?: string;
  initialValues?: Partial<BankSelectionFormData>;
};

export function BankSelectionForm({
  banks,
  onSubmit,
  onBack,
  isLoading = false,
  className,
  initialValues,
}: BankSelectionFormProps) {
  const t = useTranslations();

  const methods = useForm<BankSelectionFormData>({
    resolver: zodResolver(BankSelectionFormSchema),
    defaultValues: {
      selectedBankCode: '',
      ...initialValues,
    },
  });

  const handleSubmit = async (data: BankSelectionFormData) => {
    await onSubmit(data);
  };

  // Transform banks into options for the radio group following Shad-UI patterns
  const bankOptions = banks.map((bank) => {
    const dailyLimitText = `${formatTomanCurrency(bank.maxDailyAmount)} ${t('bankSetup.bank.dailyLimit')}`;
    const transactionCountText = bank.maxDailyCount
      ? `${bank.maxDailyCount} ${t('bankSetup.bank.transactionsPerDay')}`
      : t('bankSetup.bank.unlimitedTransactions');

    return {
      value: bank.bankCode,
      label: bank.name,
      description: `${dailyLimitText} • ${transactionCountText}`,
      metadata: {
        bankCode: bank.bankCode,
        slug: bank.slug,
        maxDailyAmount: bank.maxDailyAmount,
        maxDailyCount: bank.maxDailyCount,
      },
    };
  });

  return (
    <FormProvider methods={methods} onSubmit={methods.handleSubmit(handleSubmit)}>
      <div className={className}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('bankSetup.bank.selectLabel')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('bankSetup.bank.description')}
              </p>
            </div>
            <ScrollArea className="h-80 w-full rounded-md border">
              <div className="p-4">
                <RHFRadioGroup
                  name="selectedBankCode"
                  title=""
                  options={bankOptions}
                  required
                  disabled={isLoading}
                />
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onBack}
              className="order-2 sm:order-1"
            >
              {t('actions.back')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !methods.formState.isValid}
              className="order-1 sm:order-2"
            >
              {isLoading ? t('actions.loading') : t('bankSetup.bank.continueToAuthorization')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
