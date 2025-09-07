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
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter } from 'next/navigation';
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
import { cn, formatTomanCurrency, showSuccessToast } from '@/lib';

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
      return t('overdue');
    if (diffDays === 1)
      return t('tomorrow');
    if (diffDays <= 7)
      return diffDays === 1 ? `1 day` : `${diffDays} days`;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }, [subscription?.nextBillingDate, locale, t]);

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
      title: t('billing.currentPlan'),
      value: subscription?.product?.name || t('billing.noPlan'),
      subtitle: undefined,
      icon: Package,
      color: subscription?.status === 'active' ? 'text-primary' : 'text-muted-foreground',
      bgColor: subscription?.status === 'active' ? 'bg-primary/10' : 'bg-muted',
    },
    {
      title: t('billing.monthlyCost'),
      value: subscription?.currentPrice ? formatTomanCurrency(subscription.currentPrice) : '—',
      subtitle: undefined,
      icon: Wallet,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      title: t('billing.nextBilling'),
      value: nextBilling || t('billing.notScheduled'),
      subtitle: undefined,
      icon: Calendar,
      color: nextBilling === t('status.overdue') ? 'text-destructive' : nextBilling === t('time.tomorrow') ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400',
      bgColor: nextBilling === t('status.overdue') ? 'bg-destructive/10' : nextBilling === t('time.tomorrow') ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: t('billing.paymentSuccess'),
      value: `${paymentSuccessRate}%`,
      subtitle: `${recentPayments.length} transactions`,
      icon: CreditCard,
      color: paymentSuccessRate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : paymentSuccessRate >= 80 ? 'text-orange-600 dark:text-orange-400' : 'text-destructive',
      bgColor: paymentSuccessRate >= 95 ? 'bg-emerald-50 dark:bg-emerald-950/20' : paymentSuccessRate >= 80 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-destructive/10',
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
function CurrentSubscriptionOverview({ subscription, locale, t, router }: { subscription: CustomerSubscription | null; locale: string; t: (key: string) => string; router: AppRouterInstance }) {
  if (!subscription) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="p-8 text-center flex-1 flex items-center justify-center">
          <div>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('subscription.noActive')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('billing.noActiveSubscription')}
            </p>
            <Button onClick={() => router.push('/dashboard/billing/plans')}>
              {t('billing.viewPlans')}
            </Button>
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
              {subscription.product?.name || t('subscription.unknownPlan')}
              <SubscriptionStatusBadge status={subscription.status} size="sm" />
            </CardTitle>
            {subscription.product?.description && (
              <CardDescription>
                {subscription.product.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/billing/subscriptions')}
          >
            <Settings className="h-4 w-4 me-2" />
            {t('actions.manage')}
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
                <p className="text-sm text-muted-foreground">{t('billing.nextBilling')}</p>
                <p className="font-medium">{nextBillingDate || t('subscription.toBeDecided')}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('billing.started')}</p>
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
function RecentPaymentHistory({ payments, locale, t, router }: { payments: CustomerPayment[]; locale: string; t: (key: string) => string; router: AppRouterInstance }) {
  if (payments.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>{t('billing.paymentHistory')}</CardTitle>
          <CardDescription>{t('billing.recentTransactions')}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('states.empty.payments')}</p>
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
            <CardTitle>{t('billing.paymentHistory')}</CardTitle>
            <CardDescription>{t('billing.recentTransactions')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/billing/payments')}
          >
            {t('actions.viewAll')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {payments.slice(0, 5).map(payment => (
            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Package className="h-4 w-4 text-primary" />
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
              <div className="text-end shrink-0 space-y-1 ms-3">
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
function PaymentMethodsSummary({ paymentMethods, t, router }: { paymentMethods: CustomerPaymentMethod[]; t: (key: string) => string; router: AppRouterInstance }) {
  const primaryMethod = paymentMethods.find(method => method.isPrimary);
  const activeMethodsCount = paymentMethods.filter(method => method.isActive).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('billing.paymentMethods')}</CardTitle>
            <CardDescription>{t('billing.manageBillingInfo')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/billing/methods')}
          >
            <CreditCard className="h-4 w-4 me-2" />
            {t('actions.manage')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {paymentMethods.length === 0
          ? (
              <div className="text-center py-8 flex-1 flex items-center justify-center">
                <div>
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">{t('billing.noPaymentMethods')}</p>
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/billing/methods')}
                  >
                    {t('actions.addPaymentMethod')}
                  </Button>
                </div>
              </div>
            )
          : (
              <div className="space-y-4 flex-1">
                {primaryMethod && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{primaryMethod.contractDisplayName}</p>
                        <p className="text-xs text-muted-foreground">{t('billing.primaryDirectDebit')}</p>
                      </div>
                    </div>
                    <div className="text-xs text-primary shrink-0 ms-3">{t('billing.default')}</div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 mt-auto">
                  <span className="text-xs">
                    {activeMethodsCount}
                    {' '}
                    {activeMethodsCount === 1 ? t('billing.activeMethod') : t('billing.activeMethods')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => router.push('/dashboard/billing/methods')}
                  >
                    {t('actions.viewAll')}
                  </Button>
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
function QuickActions({
  subscription,
  t,
  onChangePlan,
  onUpdatePayment,
  onDownloadInvoice,
  onBillingSettings,
}: {
  subscription: CustomerSubscription | null;
  t: (key: string) => string;
  onChangePlan: () => void;
  onUpdatePayment: () => void;
  onDownloadInvoice: () => void;
  onBillingSettings: () => void;
}) {
  const actions = [
    {
      label: t('actions.changePlan'),
      description: t('billing.changePlanDescription'),
      icon: Package,
      variant: 'default' as const,
      disabled: !subscription,
      onClick: onChangePlan,
    },
    {
      label: t('actions.updatePayment'),
      description: t('billing.updatePaymentDescription'),
      icon: CreditCard,
      variant: 'outline' as const,
      disabled: false,
      onClick: onUpdatePayment,
    },
    {
      label: t('actions.downloadInvoice'),
      description: t('billing.downloadInvoiceDescription'),
      icon: Download,
      variant: 'outline' as const,
      disabled: false,
      onClick: onDownloadInvoice,
    },
    {
      label: t('actions.billingSettings'),
      description: t('billing.billingSettingsDescription'),
      icon: Settings,
      variant: 'outline' as const,
      disabled: false,
      onClick: onBillingSettings,
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('billing.quickActions')}</CardTitle>
        <CardDescription>{t('billing.commonBillingTasks')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-1">
        {actions.map(action => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            className="w-full justify-start p-3 h-auto"
            disabled={action.disabled}
            onClick={action.onClick}
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
  const router = useRouter();

  // Handler functions for quick actions
  const handleChangePlan = () => {
    if (subscription) {
      router.push('/dashboard/billing/plans');
    } else {
      showSuccessToast(t('subscription.noActive'));
    }
  };

  const handleUpdatePayment = () => {
    router.push('/dashboard/billing/methods');
  };

  const handleDownloadInvoice = () => {
    if (subscription) {
      // In a real app, this would download the latest invoice
      showSuccessToast(t('actions.downloadInvoice'));
    } else {
      showSuccessToast(t('subscription.noActive'));
    }
  };

  const handleBillingSettings = () => {
    router.push('/dashboard/billing');
  };

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
    <FadeIn className={cn('w-full', className)}>
      <DashboardSection spacing="default" className="w-full">
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
          className="lg:grid-cols-[2fr_1fr] w-full"
        >
          <CurrentSubscriptionOverview subscription={subscription} locale={locale} t={t} router={router} />
          <QuickActions
            subscription={subscription}
            t={t}
            onChangePlan={handleChangePlan}
            onUpdatePayment={handleUpdatePayment}
            onDownloadInvoice={handleDownloadInvoice}
            onBillingSettings={handleBillingSettings}
          />
        </DashboardContentGrid>

        {/* Payment History, Methods, and Upcoming Bills */}
        <DashboardThreeColumnGrid className="w-full">
          <RecentPaymentHistory payments={recentPayments} locale={locale} t={t} router={router} />
          <PaymentMethodsSummary paymentMethods={paymentMethods} t={t} router={router} />
          <UpcomingBillsSection subscription={subscription} t={t} />
        </DashboardThreeColumnGrid>
      </DashboardSection>
    </FadeIn>
  );
});

CustomerBillingOverview.displayName = 'CustomerBillingOverview';
