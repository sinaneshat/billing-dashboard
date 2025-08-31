'use client';

import { ArrowRight, CreditCard, Package, Plus, TrendingUp, User } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrentUserQuery } from '@/hooks/queries/auth';
import { usePaymentHistoryQuery } from '@/hooks/queries/payments';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';

function formatCurrency(amount: number, currency: string = 'IRR') {
  return new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

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
  const { data: paymentHistory, isLoading: paymentsLoading } = usePaymentHistoryQuery({ query: { limit: '3' } });

  const recentPayments = paymentHistory?.success && Array.isArray(paymentHistory.data)
    ? paymentHistory.data
    : [];

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (userError || !user?.success || !user.data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load user information</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const userData = user.data;
  const hasActiveSubscription = currentSubscription?.status === 'active';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${userData.email ? `, ${userData.email.split('@')[0]}` : ''}!`}
        description="Your dashboard overview and account summary"
        action={
          !hasActiveSubscription
            ? (
                <Button asChild>
                  <Link href="/dashboard/billing/plans">
                    <Plus className="h-4 w-4 mr-2" />
                    Get Started
                  </Link>
                </Button>
              )
            : (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Link>
                </Button>
              )
        }
      />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-2xl font-bold">Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Account verified and ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {subscriptionLoading
              ? (
                  <LoadingSpinner className="h-6 w-6" />
                )
              : currentSubscription
                ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{currentSubscription.product?.name || 'Active'}</span>
                        <Badge variant={getStatusBadgeVariant(currentSubscription.status)} className="text-xs">
                          {currentSubscription.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Next billing:
                        {' '}
                        {currentSubscription.nextBillingDate ? formatDate(currentSubscription.nextBillingDate) : 'N/A'}
                      </p>
                    </div>
                  )
                : (
                    <div>
                      <span className="text-2xl font-bold">No Plan</span>
                      <p className="text-xs text-muted-foreground">
                        Choose a subscription plan
                      </p>
                    </div>
                  )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {subscriptionLoading
              ? (
                  <LoadingSpinner className="h-6 w-6" />
                )
              : currentSubscription
                ? (
                    <div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(currentSubscription.currentPrice)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Current plan pricing
                      </p>
                    </div>
                  )
                : (
                    <div>
                      <span className="text-2xl font-bold">₦0</span>
                      <p className="text-xs text-muted-foreground">
                        No active subscription
                      </p>
                    </div>
                  )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div>
              <span className="text-2xl font-bold">{recentPayments.length}</span>
              <p className="text-xs text-muted-foreground">
                Recent transactions
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
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Next Billing Date</AlertTitle>
          <AlertDescription>
            Your next billing date is
            {' '}
            {formatDate(currentSubscription.nextBillingDate)}
            {' '}
            for
            {' '}
            {formatCurrency(currentSubscription.currentPrice)}
            .
            <Button variant="link" className="h-auto p-0 ml-2" asChild>
              <Link href="/dashboard/billing/methods">
                Manage Payment Methods
                {' '}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest account activity</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading
              ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner className="h-6 w-6 mr-2" />
                    <span>Loading...</span>
                  </div>
                )
              : recentPayments.length > 0
                ? (
                    <div className="space-y-4">
                      {recentPayments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-sm">{payment.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(payment.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatCurrency(payment.amount, payment.currency)}</p>
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/dashboard/billing/payments">
                          View All Payments
                          {' '}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  )
                : (
                    <div className="text-center py-6">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {!hasActiveSubscription
                ? (
                    <>
                      <Button className="justify-start h-12" asChild>
                        <Link href="/dashboard/billing/plans">
                          <Plus className="h-4 w-4 mr-3" />
                          Choose a Plan
                        </Link>
                      </Button>
                      <Button variant="outline" className="justify-start h-12" asChild>
                        <Link href="/dashboard/billing">
                          <CreditCard className="h-4 w-4 mr-3" />
                          View Billing
                        </Link>
                      </Button>
                    </>
                  )
                : (
                    <>
                      <Button variant="outline" className="justify-start h-12" asChild>
                        <Link href="/dashboard/billing/subscriptions">
                          <Package className="h-4 w-4 mr-3" />
                          Manage Subscriptions
                        </Link>
                      </Button>
                      <Button variant="outline" className="justify-start h-12" asChild>
                        <Link href="/dashboard/billing/payments">
                          <CreditCard className="h-4 w-4 mr-3" />
                          Payment History
                        </Link>
                      </Button>
                      <Button variant="outline" className="justify-start h-12" asChild>
                        <Link href="/dashboard/billing/methods">
                          <User className="h-4 w-4 mr-3" />
                          Payment Methods
                        </Link>
                      </Button>
                    </>
                  )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{userData.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm font-mono">{userData.userId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-sm">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
