'use client';

import { CreditCard, Package, TrendingUp } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib/format';
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

// Welcome hero section for new users
function WelcomeHero({ hasData, t, router }: {
  hasData: boolean;
  t: (key: string) => string;
  router: AppRouterInstance;
}) {
  if (hasData)
    return null;

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 shadow-lg border-dashed border-2">
      <CardContent className="text-center py-12 space-y-6">
        <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
          <TrendingUp className="h-12 w-12 text-primary/60" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">{t('billing.welcome.title')}</h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {t('billing.welcome.description')}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button size="lg" onClick={() => router.push('/dashboard/billing/plans')}>
            <Package className="h-4 w-4 mr-2" />
            {t('billing.choosePlan')}
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/billing/methods')}>
            <CreditCard className="h-4 w-4 mr-2" />
            {t('billing.setupPayment')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Current status cards for active users
function StatusCards({ subscription, paymentMethods, t }: {
  subscription: CustomerSubscription | null;
  paymentMethods: CustomerPaymentMethod[];
  t: (key: string) => string;
}) {
  if (!subscription && paymentMethods.length === 0)
    return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {subscription && (
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{t('billing.currentPlan')}</CardTitle>
                  <CardDescription>{subscription.product?.name}</CardDescription>
                </div>
              </div>
              <SubscriptionStatusBadge status={subscription.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('billing.monthlyPrice')}</span>
              <span className="font-medium">{formatTomanCurrency(subscription.currentPrice)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentMethods.length > 0 && (
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">{t('billing.paymentMethod')}</CardTitle>
                <CardDescription>
                  {paymentMethods.find(m => m.isPrimary)?.contractDisplayName || t('billing.configured')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('paymentMethods.contracts')}</span>
              <span className="font-medium">{paymentMethods.length}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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

// Recent activity summary - show important alerts
function RecentActivity({ payments, t, router }: {
  payments: CustomerPayment[];
  t: (key: string) => string;
  router: AppRouterInstance;
}) {
  const recentFailures = payments.filter(p => p.status === 'failed').slice(0, 1);
  const hasRecentActivity = recentFailures.length > 0;

  if (!hasRecentActivity)
    return null;

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-destructive">{t('billing.paymentIssue')}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('billing.failedPaymentMessage')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/billing/payments')}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {t('billing.viewPaymentHistory')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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

  const hasData = !!subscription || paymentMethods.length > 0;

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
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
