'use client';

import { CreditCard, Package } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

// Import unified billing system
import { BillingDisplayContainer, BillingDisplayItem } from '@/components/billing/unified/billing-display';
import type { PaymentMethodData, SubscriptionData } from '@/components/billing/unified/mappers';
import {
  createWelcomeContent,
  mapPaymentMethodToContent,
  mapSubscriptionToContent,
} from '@/components/billing/unified/mappers';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

// Types for customer billing overview
type CustomerSubscription = {
  id: string;
  product: {
    name: string;
    description?: string | null;
    billingPeriod?: string;
  } | null;
  status: string;
  currentPrice: number;
  startDate: string;
  nextBillingDate?: string | null;
  endDate?: string | null;
};

type CustomerPayment = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  paymentMethod: string;
};

type CustomerPaymentMethod = {
  id: string;
  contractDisplayName: string;
  contractMobile?: string | null;
  contractStatus: string;
  isPrimary: boolean | null;
  isActive: boolean | null;
  lastUsedAt?: string | null;
};

type CustomerBillingOverviewProps = {
  subscription: CustomerSubscription | null;
  recentPayments: CustomerPayment[];
  paymentMethods: CustomerPaymentMethod[];
  isLoading?: boolean;
  className?: string;
};

// Welcome hero section for new users using unified system
function WelcomeHero({ hasData, t, router }: {
  hasData: boolean;
  t: (key: string) => string;
  router: AppRouterInstance;
}) {
  if (hasData)
    return null;

  const welcomeContent = createWelcomeContent(
    t,
    () => router.push('/dashboard/billing/plans'),
    () => router.push('/dashboard/billing/methods'),
  );

  return (
    <BillingDisplayItem
      variant="hero"
      size="lg"
      dataType="overview"
      content={welcomeContent}
    />
  );
}

// Current status cards for active users using unified system
function StatusCards({ subscription, paymentMethods, t, locale }: {
  subscription: CustomerSubscription | null;
  paymentMethods: CustomerPaymentMethod[];
  t: (key: string) => string;
  locale: string;
}) {
  if (!subscription && paymentMethods.length === 0)
    return null;

  const items = [];

  // Add subscription if exists
  if (subscription) {
    items.push({
      type: 'subscription' as const,
      data: subscription as SubscriptionData,
    });
  }

  // Add primary payment method if exists
  if (paymentMethods.length > 0) {
    const primaryMethod = paymentMethods.find(m => m.isPrimary) || paymentMethods[0];
    items.push({
      type: 'paymentMethod' as const,
      data: primaryMethod as PaymentMethodData,
    });
  }

  return (
    <BillingDisplayContainer
      data={items}
      variant="card"
      size="md"
      columns={2}
      gap="md"
      mapItem={(item) => {
        if (item.type === 'subscription') {
          return mapSubscriptionToContent(item.data as SubscriptionData, t, locale);
        } else {
          return mapPaymentMethodToContent(item.data as PaymentMethodData, t);
        }
      }}
    />
  );
}

// Quick actions section
function QuickActions({ subscription, paymentMethods, _recentPayments, t, router }: {
  subscription: CustomerSubscription | null;
  paymentMethods: CustomerPaymentMethod[];
  _recentPayments: CustomerPayment[];
  t: (key: string) => string;
  router: AppRouterInstance;
}) {
  const hasSubscription = !!subscription;
  const hasPaymentMethod = paymentMethods.length > 0;

  // Don't show for completely new users (WelcomeHero handles that)
  if (!hasSubscription && !hasPaymentMethod)
    return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('billing.quickActions')}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!hasSubscription && (
          <Button
            variant="outline"
            className="justify-start h-auto p-4"
            onClick={() => router.push('/dashboard/billing/plans')}
          >
            <div className="text-left">
              <div className="flex items-center gap-2 font-medium">
                <Package className="h-4 w-4" />
                {t('billing.choosePlan')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('billing.chooseplanDescription')}
              </p>
            </div>
          </Button>
        )}

        {!hasPaymentMethod && (
          <Button
            variant="outline"
            className="justify-start h-auto p-4"
            onClick={() => router.push('/dashboard/billing/methods')}
          >
            <div className="text-left">
              <div className="flex items-center gap-2 font-medium">
                <CreditCard className="h-4 w-4" />
                {t('billing.addPaymentMethod')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('billing.setupDirectDebit')}
              </p>
            </div>
          </Button>
        )}

        {hasSubscription && (
          <Button
            variant="outline"
            className="justify-start h-auto p-4"
            onClick={() => router.push('/dashboard/billing/subscriptions')}
          >
            <div className="text-left">
              <div className="flex items-center gap-2 font-medium">
                <Package className="h-4 w-4" />
                {t('billing.manageSubscription')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('billing.manageSubscriptionDescription')}
              </p>
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}

// Recent activity summary - show important alerts using unified system
function RecentActivity({ payments, t, router }: {
  payments: CustomerPayment[];
  t: (key: string) => string;
  router: AppRouterInstance;
}) {
  const recentFailures = payments.filter(p => p.status === 'failed').slice(0, 1);
  const hasRecentActivity = recentFailures.length > 0;

  if (!hasRecentActivity)
    return null;

  const alertContent = {
    title: t('billing.paymentIssue'),
    description: t('billing.failedPaymentMessage'),
    icon: <CreditCard className="h-5 w-5" />,
    status: {
      variant: 'destructive' as const,
      label: t('status.failed'),
      color: 'error' as const,
    },
    primaryAction: {
      label: t('billing.viewPaymentHistory'),
      variant: 'outline' as const,
      size: 'sm' as const,
      onClick: () => router.push('/dashboard/billing/payments'),
    },
  };

  return (
    <BillingDisplayItem
      variant="card"
      size="md"
      dataType="payment"
      content={alertContent}
      style={{
        borderStyle: 'solid',
        background: 'muted',
        cardClassName: 'border-destructive/20 bg-destructive/5',
      }}
    />
  );
}

export const CustomerBillingOverview = memo(({
  subscription,
  recentPayments,
  paymentMethods,
  isLoading = false,
  className,
}: CustomerBillingOverviewProps) => {
  const t = useTranslations();
  const router = useRouter();

  // Get current locale for date formatting
  const locale = 'fa-IR'; // Default to Persian, could be determined from router or context

  const hasData = !!subscription || paymentMethods.length > 0;

  if (isLoading) {
    return (
      <div className={cn('space-y-8', className)}>
        {/* Loading state for welcome hero */}
        <BillingDisplayContainer
          data={[]}
          isLoading={true}
          variant="hero"
          size="lg"
          dataType="overview"
          mapItem={() => ({ title: '', description: '' })}
        />

        {/* Loading state for status cards */}
        <BillingDisplayContainer
          data={[]}
          isLoading={true}
          variant="card"
          size="md"
          columns={2}
          gap="md"
          dataType="subscription"
          mapItem={() => ({ title: '', description: '' })}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Welcome hero for new users */}
      <WelcomeHero hasData={hasData} t={t} router={router} />

      {/* Current status cards */}
      <StatusCards
        subscription={subscription}
        paymentMethods={paymentMethods}
        t={t}
        locale={locale}
      />

      {/* Quick actions */}
      <QuickActions
        subscription={subscription}
        paymentMethods={paymentMethods}
        _recentPayments={recentPayments}
        t={t}
        router={router}
      />

      {/* Alert for issues - only show if there are problems */}
      <RecentActivity payments={recentPayments} t={t} router={router} />
    </div>
  );
});

CustomerBillingOverview.displayName = 'CustomerBillingOverview';
