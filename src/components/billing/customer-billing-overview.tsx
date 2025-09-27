'use client';

import { CreditCard, Package } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import type { Payment } from '@/api/routes/payments/schema';
import type { Product } from '@/api/routes/products/schema';
// Import raw Zod-inferred types from backend API schemas
import type { Subscription } from '@/api/routes/subscriptions/schema';
// Import minimal bank contract card
import { BankContractCard } from '@/components/billing/bank-contract-card';
// Import unified billing system
import { BillingDisplayContainer, BillingDisplayItem } from '@/components/billing/unified/billing-display';
import type { SubscriptionData } from '@/components/billing/unified/mappers';
import {
  createWelcomeContent,
  mapSubscriptionToContent,
} from '@/components/billing/unified/mappers';
import { Button } from '@/components/ui/button';
import { useProductsQuery } from '@/hooks/queries/products';
import { cn } from '@/lib/ui/cn';

// Use raw Zod-inferred types from backend schemas - no legacy aliases
type CustomerBillingOverviewProps = {
  subscription: Subscription | null;
  recentPayments: Payment[];
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
function StatusCards({ subscription, paymentMethods, products, t, locale, router }: {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  products: Product[];
  t: (key: string) => string;
  locale: string;
  router: AppRouterInstance;
}) {
  if (!subscription && paymentMethods.length === 0)
    return null;

  const items = [];

  // Enhanced subscription data with proper paymentMethod integration - SOLID-compliant
  const subscriptionPaymentMethod = subscription && subscription.paymentMethodId
    ? paymentMethods.find(pm => pm.id === subscription.paymentMethodId)
    : paymentMethods[0]; // Fallback to first payment method

  const subscriptionWithPaymentMethod: SubscriptionData | null = subscription
    ? {
        ...subscription,
        productId: subscription.productId,
        // Map payment method data to the format expected by SubscriptionData
        paymentMethod: subscriptionPaymentMethod
          ? {
              id: subscriptionPaymentMethod.id,
              contractDisplayName: subscriptionPaymentMethod.contractDisplayName,
              contractMobile: subscriptionPaymentMethod.contractMobile,
              contractStatus: subscriptionPaymentMethod.contractStatus,
              bankCode: subscriptionPaymentMethod.bankCode,
              isPrimary: subscriptionPaymentMethod.isPrimary,
              isActive: subscriptionPaymentMethod.isActive,
            }
          : null,
      }
    : null;

  // Add subscription if exists
  if (subscription && subscriptionWithPaymentMethod) {
    items.push({
      type: 'subscription' as const,
      data: subscriptionWithPaymentMethod,
    });
  }

  // Only add separate payment method card if no subscription exists
  // When subscription exists, payment method info is shown within the subscription card
  const primaryMethod = !subscription && paymentMethods.length > 0
    ? (paymentMethods.find(m => m.isPrimary) || paymentMethods[0])
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Subscription Card */}
      {subscription && (
        <BillingDisplayContainer
          data={[{ type: 'subscription' as const, data: subscriptionWithPaymentMethod }]}
          variant="card"
          size="md"
          gap="md"
          mapItem={(item) => {
            const subscriptionData = item.data as SubscriptionData;
            const product = products.find(p => p.id === subscriptionData.productId) || null;
            return mapSubscriptionToContent(
              subscriptionData,
              product,
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
          }}
        />
      )}

      {/* Payment Method Card - Use new BankContractCard in view-only mode */}
      {primaryMethod && (
        <BankContractCard
          paymentMethod={primaryMethod}
          isViewOnly={true}
          onClick={() => router.push('/dashboard/billing/methods')}
        />
      )}
    </div>
  );
}

// Quick actions section
function QuickActions({ subscription, paymentMethods, _recentPayments, t, router }: {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  _recentPayments: Payment[];
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
  payments: Payment[];
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
  const productsQuery = useProductsQuery();

  // Get current locale for date formatting
  const currentLocale = useLocale() as 'en' | 'fa';

  const products = productsQuery.data?.success && Array.isArray(productsQuery.data.data)
    ? productsQuery.data.data
    : [];

  const hasData = !!subscription || paymentMethods.length > 0;

  if (isLoading || productsQuery.isLoading) {
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
        products={products}
        t={t}
        locale={currentLocale}
        router={router}
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
