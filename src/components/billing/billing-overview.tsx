'use client';

import { Calendar, Package, Plus } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { useProductsQuery } from '@/hooks/queries/products';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import {
  formatTomanCurrency,
} from '@/lib/i18n/currency-utils';

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

export default function BillingOverviewPage() {
  const { data: currentSubscription, isLoading: subscriptionLoading, error: subscriptionError } = useCurrentSubscriptionQuery();
  const { data: products } = useProductsQuery({ query: { limit: '10' } });

  const availableProducts = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Subscription</AlertTitle>
          <AlertDescription>
            Unable to load your subscription information. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const subscription = currentSubscription || null;

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Current Subscription</CardTitle>
            </div>
            {!subscription && (
              <Button asChild>
                <Link href="/dashboard/billing/plans">
                  <Plus className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Link>
              </Button>
            )}
          </div>
          <CardDescription>
            Your subscription status and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription
            ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{subscription.product?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.billingPeriod === 'monthly' ? 'Monthly Subscription' : 'One-time Purchase'}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(subscription.status)}>
                      {subscription.status === 'active' && 'Active'}
                      {subscription.status === 'canceled' && 'Canceled'}
                      {subscription.status === 'expired' && 'Expired'}
                      {subscription.status === 'pending' && 'Pending'}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Amount</p>
                      <p className="text-lg">{formatTomanCurrency(subscription.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Next Billing</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.nextBillingDate
                          ? new Date(subscription.nextBillingDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href="/dashboard/billing/subscriptions">
                        Manage Subscription
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/billing/methods">
                        Setup Direct Debit
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            : (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your subscription journey by choosing a plan that works for you.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/billing/plans">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Plans
                    </Link>
                  </Button>
                </div>
              )}
        </CardContent>
      </Card>

      {/* Available Subscription Plans */}
      {availableProducts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Available Plans</CardTitle>
            </div>
            <CardDescription>
              Explore our subscription plans and find the perfect fit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableProducts.slice(0, 3).map(product => (
                <div key={product.id} className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">
                      {formatTomanCurrency(product.price)}
                    </span>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/billing/plans/${product.id}`}>
                        Select Plan
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {availableProducts.length > 3 && (
              <div className="text-center mt-4">
                <Button asChild variant="outline">
                  <Link href="/dashboard/billing/plans">
                    View All Plans
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
