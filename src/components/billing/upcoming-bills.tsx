'use client';

import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import { FadeIn } from '@/components/ui/motion';

import type { UpcomingBillData } from './unified';
import { BillingDisplayContainer, mapUpcomingBillToContent } from './unified';

type UpcomingBill = {
  id: string;
  productName: string;
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'processing';
  subscriptionId: string;
};

type UpcomingBillsProps = {
  bills: UpcomingBill[];
  isLoading?: boolean;
  className?: string;
};

export const UpcomingBills = memo(({
  bills,
  isLoading = false,
  className,
}: UpcomingBillsProps) => {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <FadeIn className={className}>
      <BillingDisplayContainer
        data={bills}
        isLoading={isLoading}
        dataType="bill"
        variant="card"
        size="md"
        columns="auto"
        gap="md"
        title={t('billing.upcomingBills')}
        subtitle={t('billing.subtitle')}
        emptyTitle={t('billing.upcomingBillsEmpty')}
        emptyDescription={t('billing.upcomingBillsEmptyDescription')}
        mapItem={(bill: UpcomingBill) =>
          mapUpcomingBillToContent(
            bill as UpcomingBillData,
            t,
            locale,
          )}
      />
    </FadeIn>
  );
});

UpcomingBills.displayName = 'UpcomingBills';
