'use client';

import { ArrowRight, Package, Plus, TrendingUp, User } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrentUserQuery } from '@/hooks/queries/auth';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { formatPersianDate, formatTomanCurrency } from '@/lib/i18n/currency-utils';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'canceled':
      return 'secondary';
    case 'expired':
      return 'destructive';
    case 'pending':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function DashboardOverviewPage() {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUserQuery();
  const { data: currentSubscription, isLoading: subscriptionLoading } = useCurrentSubscriptionQuery();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span className="text-lg">Loading dashboard...</span>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's an overview of your account."
        />
        <Alert variant="destructive">
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            Unable to load your account information. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasActiveSubscription = currentSubscription?.status === 'active';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.data?.email || 'User'}!`}
        description="Here's an overview of your subscription and account activity."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-2xl font-bold">{user?.data?.email ? 'Active' : 'Inactive'}</span>
              <p className="text-xs text-muted-foreground">
                Email verification status
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Status</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-2xl font-bold">{hasActiveSubscription ? 'Active' : 'None'}</span>
              <p className="text-xs text-muted-foreground">
                Current subscription
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-2xl font-bold">
                {currentSubscription?.product?.name || 'None'}
              </span>
              <p className="text-xs text-muted-foreground">
                {hasActiveSubscription ? 'Active plan' : 'No active plan'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-2xl font-bold">
                {hasActiveSubscription ? formatTomanCurrency(currentSubscription.currentPrice) : '0 ﷼'}
              </span>
              <p className="text-xs text-muted-foreground">
                {hasActiveSubscription && currentSubscription.billingPeriod === 'monthly'
                  ? 'Per month'
                  : hasActiveSubscription
                    ? 'One-time'
                    : 'No charges'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status Alert */}
      {!hasActiveSubscription && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <Plus className="h-4 w-4" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Get Started with a Subscription</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Choose a subscription plan to unlock premium features and start managing your billing.
            <Button variant="link" className="h-auto p-0 ml-2 text-blue-600 dark:text-blue-400" asChild>
              <Link href="/dashboard/billing/plans">
                Browse Plans
                {' '}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {currentSubscription?.status === 'active' && currentSubscription.nextBillingDate && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertTitle>Next Billing Date</AlertTitle>
          <AlertDescription>
            Your next billing date is
            {' '}
            {formatPersianDate(currentSubscription.nextBillingDate)}
            {' '}
            for
            {' '}
            {formatTomanCurrency(currentSubscription.currentPrice)}
            .
            <Button variant="link" className="h-auto p-0 ml-2" asChild>
              <Link href="/dashboard/billing/methods">
                Setup Direct Debit
                {' '}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Overview</CardTitle>
            <CardDescription>Your subscription details and status</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionLoading
              ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner className="h-6 w-6 mr-2" />
                    <span>Loading subscription...</span>
                  </div>
                )
              : hasActiveSubscription && currentSubscription
                ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">{currentSubscription.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Next billing:
                              {' '}
                              {currentSubscription.nextBillingDate ? formatPersianDate(currentSubscription.nextBillingDate) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatTomanCurrency(currentSubscription.currentPrice)}</p>
                          <Badge variant={getStatusBadgeVariant(currentSubscription.status)} className="text-xs">
                            {currentSubscription.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/dashboard/billing/subscriptions">
                          Manage Subscription
                          {' '}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )
                : (
                    <div className="text-center py-6">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active subscription</p>
                      <Button asChild className="mt-2" size="sm">
                        <Link href="/dashboard/billing/plans">Browse Plans</Link>
                      </Button>
                    </div>
                  )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/billing/plans">
                  <Plus className="h-4 w-4 mr-2" />
                  {hasActiveSubscription ? 'Change Plan' : 'Choose Plan'}
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/billing/methods">
                  <Package className="h-4 w-4 mr-2" />
                  Setup Direct Debit
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/billing/payments">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Billing History
                </Link>
              </Button>
              {hasActiveSubscription && (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/dashboard/billing/subscriptions">
                    <Package className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
