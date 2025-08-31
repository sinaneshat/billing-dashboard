'use client';

import { Calendar, CreditCard, Package, Plus, Settings, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { usePaymentHistoryQuery } from '@/hooks/queries/payments';
import { useProductsQuery } from '@/hooks/queries/products';
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

export function BillingOverviewPage() {
  const { data: currentSubscription, isLoading: subscriptionLoading, error: subscriptionError } = useCurrentSubscriptionQuery();
  const { data: paymentHistory, isLoading: paymentsLoading } = usePaymentHistoryQuery({ query: { limit: '5' } });
  const { data: products } = useProductsQuery({ query: { limit: '10' } });

  const recentPayments = paymentHistory?.success && Array.isArray(paymentHistory.data)
    ? paymentHistory.data.slice(0, 3)
    : [];

  const availableProducts = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading billing overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Overview"
        description="Manage your subscriptions, payments, and billing settings"
        action={
          !currentSubscription || currentSubscription.status !== 'active'
            ? (
                <Button asChild>
                  <Link href="/dashboard/billing/plans">
                    <Plus className="h-4 w-4 mr-2" />
                    Choose Plan
                  </Link>
                </Button>
              )
            : (
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/billing/subscriptions">
                      Manage Subscriptions
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/dashboard/billing/plans">
                      <Plus className="h-4 w-4 mr-2" />
                      Upgrade
                    </Link>
                  </Button>
                </div>
              )
        }
      />

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionError || !currentSubscription
            ? (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have an active subscription. Choose a plan to get started.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/billing/plans">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Plans
                    </Link>
                  </Button>
                </div>
              )
            : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{currentSubscription.product?.name}</h3>
                      <p className="text-muted-foreground">{currentSubscription.product?.description}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(currentSubscription.status)}>
                      {currentSubscription.status}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Price</p>
                      <p className="text-2xl font-bold">{formatCurrency(currentSubscription.currentPrice)}</p>
                      <p className="text-sm text-muted-foreground">
                        per
                        {currentSubscription.billingPeriod}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                      <p className="text-lg">{formatDate(currentSubscription.startDate)}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Next Billing</p>
                      <p className="text-lg">
                        {currentSubscription.nextBillingDate
                          ? formatDate(currentSubscription.nextBillingDate)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/billing/subscriptions">Manage Subscription</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/billing/methods">Payment Methods</Link>
                    </Button>
                  </div>
                </div>
              )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>Your latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading
            ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner className="h-6 w-6 mr-2" />
                  <span>Loading payments...</span>
                </div>
              )
            : recentPayments.length === 0
              ? (
                  <div className="text-center py-6">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment history found</p>
                  </div>
                )
              : (
                  <div className="space-y-4">
                    {recentPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{payment.product?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.createdAt)}
                            {' '}
                            •
                            {payment.paymentMethod}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/dashboard/billing/payments">View All Payments</Link>
                    </Button>
                  </div>
                )}
        </CardContent>
      </Card>

      {/* Available Plans (if no active subscription) */}
      {(!currentSubscription || currentSubscription.status !== 'active') && availableProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose a subscription plan that fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableProducts.slice(0, 3).map(product => (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      per
                      {product.billingPeriod}
                    </p>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/billing/plans?product=${product.id}`}>
                      Subscribe Now
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {availableProducts.length > 3 && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/billing/plans">View All Plans</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common billing and subscription tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/dashboard/billing/subscriptions">
                <Package className="h-6 w-6" />
                <span>Subscriptions</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/dashboard/billing/payments">
                <CreditCard className="h-6 w-6" />
                <span>Payment History</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/dashboard/billing/methods">
                <Settings className="h-6 w-6" />
                <span>Payment Methods</span>
              </Link>
            </Button>

            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/dashboard/billing/plans">
                <ShoppingCart className="h-6 w-6" />
                <span>Browse Plans</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Alert */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>Automatic Payments</AlertTitle>
        <AlertDescription>
          Set up automatic payments to ensure uninterrupted service. Your subscription will renew automatically using your selected payment method.
        </AlertDescription>
      </Alert>
    </div>
  );
}
