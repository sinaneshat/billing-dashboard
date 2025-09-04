'use client';

import {
  Calendar,
  CreditCard,
  Download,
  FileText,
  Package,
  Settings,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useMemo } from 'react';

import { UpcomingBills } from '@/components/billing/upcoming-bills';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MetricCard } from '@/components/ui/dashboard-cards';
import {
  DashboardContentGrid,
  DashboardMetricGrid,
  DashboardSection,
  DashboardThreeColumnGrid,
} from '@/components/ui/dashboard-layout';
import { FadeIn } from '@/components/ui/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge, SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib';

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

// Loading skeletons
function BillingSummarySkeleton() {
  return (
    <DashboardMetricGrid>
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="h-full flex flex-col" data-slot="card">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 mt-auto">
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </DashboardMetricGrid>
  );
}

function SubscriptionOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced billing summary cards with better data handling
function BillingSummaryCards({ subscription, recentPayments, paymentMethods: _paymentMethods, locale, t }: {
  subscription: CustomerSubscription | null;
  recentPayments: CustomerPayment[];
  paymentMethods: CustomerPaymentMethod[];
  locale: string;
  t: (key: string) => string;
}) {
  // Calculate next billing date with better formatting
  const nextBilling = useMemo(() => {
    if (!subscription?.nextBillingDate)
      return null;
    const date = new Date(subscription.nextBillingDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0)
      return 'Overdue';
    if (diffDays === 1)
      return 'Tomorrow';
    if (diffDays <= 7)
      return `${diffDays} days`;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }, [subscription?.nextBillingDate, locale]);

  // Count active and primary payment methods

  // Calculate success rate from recent payments
  const paymentSuccessRate = useMemo(() => {
    if (recentPayments.length === 0)
      return 100;
    const successful = recentPayments.filter(
      payment => payment.status === 'paid' || payment.status === 'completed',
    ).length;
    return Math.round((successful / recentPayments.length) * 100);
  }, [recentPayments]);

  const summaryCards = [
    {
      title: 'Current Plan',
      value: subscription?.product?.name || 'No Plan',
      subtitle: undefined,
      icon: Package,
      color: subscription?.status === 'active' ? 'text-blue-600' : 'text-gray-500',
      bgColor: subscription?.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-900/30',
    },
    {
      title: 'Monthly Cost',
      value: subscription?.currentPrice ? formatTomanCurrency(subscription.currentPrice) : '—',
      subtitle: undefined,
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      title: t('billing.nextBilling'),
      value: nextBilling || 'Not scheduled',
      subtitle: undefined,
      icon: Calendar,
      color: nextBilling === 'Overdue' ? 'text-red-600' : nextBilling === 'Tomorrow' ? 'text-orange-600' : 'text-purple-600',
      bgColor: nextBilling === 'Overdue' ? 'bg-red-50 dark:bg-red-900/30' : nextBilling === 'Tomorrow' ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      title: t('billing.paymentSuccess'),
      value: `${paymentSuccessRate}%`,
      subtitle: `${recentPayments.length} transactions`,
      icon: CreditCard,
      color: paymentSuccessRate >= 95 ? 'text-green-600' : paymentSuccessRate >= 80 ? 'text-orange-600' : 'text-red-600',
      bgColor: paymentSuccessRate >= 95 ? 'bg-green-50 dark:bg-green-900/30' : paymentSuccessRate >= 80 ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-red-50 dark:bg-red-900/30',
    },
  ];

  return (
    <DashboardMetricGrid>
      {summaryCards.map(card => (
        <MetricCard
          key={card.title}
          title={card.title}
          value={card.value}
          footer={card.subtitle}
          badge={card.subtitle
            ? {
                variant: 'outline',
                label: card.subtitle.split(' ')[0] || '',
              }
            : undefined}
          trend={card.title === t('billing.paymentSuccess') && paymentSuccessRate >= 95 && card.subtitle
            ? {
                value: card.subtitle,
                direction: 'up' as const,
                icon: TrendingUp,
              }
            : undefined}
        />
      ))}
    </DashboardMetricGrid>
  );
}

// Current subscription overview
function CurrentSubscriptionOverview({ subscription, locale, t }: { subscription: CustomerSubscription | null; locale: string; t: (key: string) => string }) {
  if (!subscription) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="p-8 text-center flex-1 flex items-center justify-center">
          <div>
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('subscription.noActive')}</h3>
            <p className="text-muted-foreground mb-4">
              You don't have an active subscription. Browse our plans to get started.
            </p>
            <Button>View Plans</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isActive = subscription.status === 'active';
  const nextBillingDate = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {subscription.product?.name || 'Unknown Plan'}
              <SubscriptionStatusBadge status={subscription.status} size="sm" />
            </CardTitle>
            {subscription.product?.description && (
              <CardDescription>
                {subscription.product.description}
              </CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 me-2" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">
                {formatTomanCurrency(subscription.currentPrice)}
              </span>
            </div>
            {isActive && (
              <div className="text-end">
                <p className="text-sm text-muted-foreground">Next billing</p>
                <p className="font-medium">{nextBillingDate || 'TBD'}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Started</p>
            <p className="font-medium">
              {new Date(subscription.startDate).toLocaleDateString(locale, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

// Recent payment history
function RecentPaymentHistory({ payments, locale }: { payments: CustomerPayment[]; locale: string }) {
  if (payments.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your recent billing transactions</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-muted-foreground">No payment history found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent billing transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {payments.slice(0, 5).map(payment => (
            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30 shrink-0">
                  <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{payment.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.paidAt || payment.createdAt).toLocaleDateString(locale, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="text-end shrink-0 ms-3 space-y-1">
                <p className="font-semibold text-sm">{formatTomanCurrency(payment.amount)}</p>
                <PaymentStatusBadge status={payment.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Payment methods summary
function PaymentMethodsSummary({ paymentMethods }: { paymentMethods: CustomerPaymentMethod[] }) {
  const primaryMethod = paymentMethods.find(method => method.isPrimary);
  const activeMethodsCount = paymentMethods.filter(method => method.isActive).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your billing information</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 me-2" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {paymentMethods.length === 0
          ? (
              <div className="text-center py-8 flex-1 flex items-center justify-center">
                <div>
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground mb-4">No payment methods added</p>
                  <Button size="sm">Add Payment Method</Button>
                </div>
              </div>
            )
          : (
              <div className="space-y-4 flex-1">
                {primaryMethod && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30 shrink-0">
                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{primaryMethod.contractDisplayName}</p>
                        <p className="text-xs text-muted-foreground">Primary • Direct Debit</p>
                      </div>
                    </div>
                    <div className="text-xs text-primary shrink-0 ms-3">Default</div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 mt-auto">
                  <span className="text-xs">
                    {activeMethodsCount}
                    {' '}
                    active method
                    {activeMethodsCount !== 1 ? 's' : ''}
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs h-8">View All</Button>
                </div>
              </div>
            )}
      </CardContent>
    </Card>
  );
}

// Upcoming bills section with generated bills from subscription
function UpcomingBillsSection({ subscription, t }: { subscription: CustomerSubscription | null; t: (key: string) => string }) {
  // Generate upcoming bills from active subscription
  const upcomingBills = useMemo(() => {
    if (!subscription || subscription.status !== 'active' || !subscription.nextBillingDate) {
      return [];
    }

    const nextBilling = new Date(subscription.nextBillingDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'upcoming' | 'overdue' | 'processing' = 'upcoming';
    if (daysUntilDue < 0) {
      status = 'overdue';
    } else if (daysUntilDue <= 1) {
      status = 'processing'; // Due today or tomorrow
    }

    return [{
      id: `upcoming_${subscription.id}`,
      productName: subscription.product?.name || t('subscription.default'),
      amount: subscription.currentPrice,
      dueDate: subscription.nextBillingDate,
      status,
      subscriptionId: subscription.id,
    }];
  }, [subscription, t]);

  return (
    <UpcomingBills bills={upcomingBills} isLoading={false} />
  );
}

// Quick actions panel
function QuickActions({ subscription, t }: { subscription: CustomerSubscription | null; t: (key: string) => string }) {
  const actions = [
    {
      label: 'Change Plan',
      description: 'Upgrade or downgrade your subscription',
      icon: Package,
      variant: 'default' as const,
      disabled: !subscription,
    },
    {
      label: t('actions.updatePayment'),
      description: 'Manage your payment methods',
      icon: CreditCard,
      variant: 'outline' as const,
      disabled: false,
    },
    {
      label: t('actions.downloadInvoice'),
      description: 'Get your latest billing statements',
      icon: Download,
      variant: 'outline' as const,
      disabled: false,
    },
    {
      label: t('actions.billingSettings'),
      description: 'Configure your billing preferences',
      icon: Settings,
      variant: 'outline' as const,
      disabled: false,
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common billing tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-1">
        {actions.map(action => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            className="w-full justify-start p-3 h-auto"
            disabled={action.disabled}
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <div className="flex flex-col items-start text-start flex-1 overflow-hidden ms-2">
              <span className="font-medium text-sm leading-tight">{action.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-start">{action.description}</span>
            </div>
          </Button>
        ))}
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
  const locale = useLocale();
  const t = useTranslations();

  if (isLoading) {
    return (
      <FadeIn className={className}>
        <DashboardSection spacing="default">
          <BillingSummarySkeleton />
          <DashboardContentGrid
            layout="main-sidebar"
            className="lg:grid-cols-[2fr_1fr]"
          >
            <SubscriptionOverviewSkeleton />
            <PaymentHistorySkeleton />
          </DashboardContentGrid>
        </DashboardSection>
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <DashboardSection spacing="default">
        {/* Billing Summary Cards - Using consistent spacing */}
        <BillingSummaryCards
          subscription={subscription}
          recentPayments={recentPayments}
          paymentMethods={paymentMethods}
          locale={locale}
          t={t}
        />

        {/* Main Content Grid - Subscription Overview & Quick Actions */}
        <DashboardContentGrid
          layout="main-sidebar"
          className="lg:grid-cols-[2fr_1fr]"
        >
          <CurrentSubscriptionOverview subscription={subscription} locale={locale} t={t} />
          <QuickActions subscription={subscription} t={t} />
        </DashboardContentGrid>

        {/* Payment History, Methods, and Upcoming Bills */}
        <DashboardThreeColumnGrid>
          <RecentPaymentHistory payments={recentPayments} locale={locale} />
          <PaymentMethodsSummary paymentMethods={paymentMethods} />
          <UpcomingBillsSection subscription={subscription} t={t} />
        </DashboardThreeColumnGrid>
      </DashboardSection>
    </FadeIn>
  );
});

CustomerBillingOverview.displayName = 'CustomerBillingOverview';
