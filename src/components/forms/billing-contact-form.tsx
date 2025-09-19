'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';

import FormProvider from './form-provider';
import RHFTextField from './rhf-text-field';

// Schema using established validation patterns from @/db/validation/
const BillingContactFormSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, 'validation.iranianMobile'),
  nationalCode: z.string().regex(/^\d{10}$/, 'validation.iranianNationalCode').optional(),
});

export type BillingContactFormData = z.infer<typeof BillingContactFormSchema>;

type BillingContactFormProps = {
  onSubmit: (data: BillingContactFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
  initialValues?: Partial<BillingContactFormData>;
};

export function BillingContactForm({
  onSubmit,
  onCancel,
  isLoading = false,
  className,
  initialValues,
}: BillingContactFormProps) {
  const t = useTranslations();

  const methods = useForm<BillingContactFormData>({
    resolver: zodResolver(BillingContactFormSchema),
    defaultValues: {
      mobile: '',
      nationalCode: '',
      ...initialValues,
    },
  });

  const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string | number | boolean | null | undefined } }) => {
    const rawValue = String(event.target.value || '');
    // Keep only digits and limit to 11 characters (Iranian mobile format)
    const cleanValue = rawValue.replace(/\D/g, '').slice(0, 11);

    // Set the clean value for validation and trigger revalidation
    methods.setValue('mobile', cleanValue, { shouldValidate: true });

    // Update the input display value
    if ('target' in event && event.target instanceof HTMLInputElement) {
      event.target.value = cleanValue;
    }
  };

  const handleNationalCodeChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string | number | boolean | null | undefined } }) => {
    const value = String(event.target.value || '').replace(/\D/g, '').slice(0, 10);
    methods.setValue('nationalCode', value, { shouldValidate: true });
    if ('target' in event && event.target instanceof HTMLInputElement) {
      event.target.value = value;
    }
  };

  const handleSubmit = async (data: BillingContactFormData) => {
    await onSubmit(data);
  };

  return (
    <FormProvider methods={methods} onSubmit={methods.handleSubmit(handleSubmit)}>
      <div className={className}>
        <div className="space-y-4">
          <RHFTextField
            name="mobile"
            title={t('bankSetup.contact.mobileLabel')}
            placeholder="09123456789"
            required
            disabled={isLoading}
            onChange={handleMobileChange}
            description={t('bankSetup.contact.mobileHelper')}
            fieldType="text"
          />

          <RHFTextField
            name="nationalCode"
            title={`${t('bankSetup.contact.nationalCodeLabel')} (${t('common.optional')})`}
            placeholder="1234567890"
            disabled={isLoading}
            onChange={handleNationalCodeChange}
            description={t('bankSetup.contact.nationalCodeHelper')}
            fieldType="text"
          />

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onCancel}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !methods.formState.isValid}
            >
              {isLoading ? t('actions.loading') : t('actions.continue')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
