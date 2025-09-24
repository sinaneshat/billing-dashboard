'use client';

import { CreditCard, Package } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import type { PaymentWithDetails } from '@/api/routes/payments/schema';
// Import Zod-inferred types from backend API schemas
import type { SubscriptionWithProduct } from '@/api/routes/subscriptions/schema';
// Import CurrencyConversionResult for proper typing
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

// Use Zod-inferred types from backend schemas - no custom types needed
type CustomerBillingOverviewProps = {
  subscription: SubscriptionWithProduct | null;
  recentPayments: PaymentWithDetails[];
  paymentMethods: PaymentMethod[];
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
  subscription: SubscriptionWithProduct | null;
  paymentMethods: PaymentMethod[];
  t: (key: string) => string;
  locale: string;
}) {
  if (!subscription && paymentMethods.length === 0)
    return null;

  const items = [];

  // Add subscription if exists
  if (subscription) {
    // Enhanced subscription data with proper paymentMethod integration
    const firstPaymentMethod = paymentMethods[0]; // Safe to access since we check length above
    const subscriptionWithPaymentMethod: SubscriptionData = {
      ...subscription,
      // If subscription has payment method info, use it; otherwise fall back to paymentMethods array
      paymentMethod: subscription.paymentMethod || (paymentMethods.length > 0 && firstPaymentMethod
        ? {
            id: firstPaymentMethod.id,
            contractDisplayName: firstPaymentMethod.contractDisplayName,
            contractMobile: firstPaymentMethod.contractMobile,
            contractStatus: firstPaymentMethod.contractStatus,
            bankCode: null, // This would need to be added to the CustomerPaymentMethod type
            isPrimary: firstPaymentMethod.isPrimary,
            isActive: firstPaymentMethod.isActive,
          }
        : null),
    };

    items.push({
      type: 'subscription' as const,
      data: subscriptionWithPaymentMethod,
    });
  }

  // Only add separate payment method card if no subscription exists
  // When subscription exists, payment method info is shown within the subscription card
  if (!subscription && paymentMethods.length > 0) {
    const primaryMethod = paymentMethods.find(m => m.isPrimary) || paymentMethods[0];
    items.push({
      type: 'paymentMethod' as const,
      data: primaryMethod,
    });
  }

  return (
    <BillingDisplayContainer
      data={items}
      variant="card"
      size="md"
      columns={items.length === 1 ? 1 : 2}
      gap="md"
      mapItem={(item) => {
        if (item.type === 'subscription') {
          return mapSubscriptionToContent(
            item.data as SubscriptionData,
            t,
            locale,
            (_id) => {
              // Handle manage subscription action
              // This would typically navigate to subscription management page
            },
            (_id) => {
              // Handle cancel subscription action
              // This would typically show cancellation dialog
            },
          );
        } else {
          return mapPaymentMethodToContent(
            item.data as PaymentMethodData,
            t,
            locale,
            (_id) => {
              // Handle set primary action
            },
            (_id) => {
              // Handle remove payment method action
            },
          );
        }
      }}
    />
  );
}

// Quick actions section
function QuickActions({ subscription, paymentMethods, _recentPayments, t, router }: {
  subscription: SubscriptionWithProduct | null;
  paymentMethods: PaymentMethod[];
  _recentPayments: PaymentWithDetails[];
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
  payments: PaymentWithDetails[];
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
  const currentLocale = useLocale() as 'en' | 'fa';

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
        locale={currentLocale}
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
