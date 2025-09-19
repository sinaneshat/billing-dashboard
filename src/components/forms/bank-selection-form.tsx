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

  // Transform banks into options for the radio group
  const bankOptions = banks.map(bank => ({
    value: bank.bankCode,
    label: bank.name,
    description: `${formatTomanCurrency(bank.maxDailyAmount)} ${t('bankSetup.bank.dailyLimit').toLowerCase()}${
      bank.maxDailyCount ? ` • ${bank.maxDailyCount} ${t('bankSetup.bank.dailyCount').toLowerCase()}` : ''
    }`,
  }));

  return (
    <FormProvider methods={methods} onSubmit={methods.handleSubmit(handleSubmit)}>
      <div className={className}>
        <div className="space-y-6">
          <div className="space-y-4">
            <ScrollArea className="h-64 w-full">
              <RHFRadioGroup
                name="selectedBankCode"
                title={t('bankSetup.bank.selectLabel')}
                options={bankOptions}
                required
                disabled={isLoading}
              />
            </ScrollArea>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onBack}
            >
              {t('actions.back')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !methods.formState.isValid}
            >
              {isLoading ? t('actions.loading') : t('bankSetup.bank.continueToAuthorization')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
