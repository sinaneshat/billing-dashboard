'use client';

import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import { DashboardCard, EmptyCard, LoadingCard } from '@/components/dashboard/dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/motion';
import { formatTomanCurrency } from '@/lib/format';

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

function getBillStatusInfo(status: string, dueDate: string, t: (key: string) => string) {
  const due = new Date(dueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  switch (status) {
    case 'overdue':
      return {
        badge: { variant: 'destructive' as const, label: t('status.overdue') },
        icon: AlertTriangle,
        iconColor: 'text-destructive',
        bgColor: 'bg-destructive/10',
      };
    case 'processing':
      return {
        badge: { variant: 'secondary' as const, label: t('status.processing') },
        icon: Clock,
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      };
    default:
      if (daysUntilDue <= 3) {
        return {
          badge: { variant: 'outline' as const, label: t('status.due') },
          icon: Calendar,
          iconColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        };
      }
      return {
        badge: { variant: 'outline' as const, label: t('status.upcoming') },
        icon: Calendar,
        iconColor: 'text-primary',
        bgColor: 'bg-primary/10',
      };
  }
}

export const UpcomingBills = memo(({
  bills,
  isLoading = false,
  className,
}: UpcomingBillsProps) => {
  const t = useTranslations();
  const locale = useLocale();

  if (isLoading) {
    return (
      <FadeIn className={className}>
        <LoadingCard title={t('states.loading.upcomingBills')} rows={3} variant="status" />
      </FadeIn>
    );
  }

  if (bills.length === 0) {
    return (
      <FadeIn className={className}>
        <EmptyCard
          title={t('billing.upcomingBillsEmpty')}
          description={t('billing.upcomingBillsEmptyDescription')}
          icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <DashboardCard
        title={t('billing.upcomingBills')}
        description={t('billing.subtitle')}
      >
        <div className="space-y-3">
          {bills.map((bill) => {
            const statusInfo = getBillStatusInfo(bill.status, bill.dueDate, t);
            const dueDate = new Date(bill.dueDate);
            const isToday = dueDate.toDateString() === new Date().toDateString();

            return (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors min-h-[4rem]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg ${statusInfo.bgColor} shrink-0`}>
                    <statusInfo.icon className={`h-4 w-4 ${statusInfo.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm line-clamp-1">{bill.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {isToday
                        ? t('time.today')
                        : dueDate.toLocaleDateString(locale, {
                            month: 'short',
                            day: 'numeric',
                          })}
                    </p>
                  </div>
                </div>
                <div className="text-end shrink-0 ms-3">
                  <p className="font-semibold text-sm whitespace-nowrap">{formatTomanCurrency(bill.amount)}</p>
                  <Badge variant={statusInfo.badge.variant} className="text-xs">
                    {statusInfo.badge.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>
    </FadeIn>
  );
});

UpcomingBills.displayName = 'UpcomingBills';
