'use client';

import { CreditCard, Download } from 'lucide-react';

import { BidiText, PersianText } from '@/components/rtl/bidi-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { formatPersianDateTime, formatTomanCurrency } from '@/lib/i18n/currency-utils';

function getSubscriptionStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'canceled':
    case 'expired':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getSubscriptionStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'canceled':
    case 'expired':
      return 'text-red-600';
    case 'pending':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

export function SubscriptionBillingHistory() {
  const { data: subscriptionsData, isPending } = useSubscriptionsQuery();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const subscriptions = subscriptionsData?.data || [];

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription Billing History</CardTitle>
          </div>
          <CardDescription>
            Track your subscription billing cycles and automated charges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subscription billing history</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any active subscriptions yet.
            </p>
            <Button variant="outline" size="sm">
              Browse Subscription Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Subscription Billing History</CardTitle>
        </div>
        <CardDescription>
          Track your subscription billing cycles and automated charges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscription</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Next Billing</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map(subscription => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div className="font-medium">{subscription.product?.name || 'Unknown Product'}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPersianDateTime(subscription.createdAt.toString())}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <BidiText>
                      {subscription.billingPeriod === 'monthly' ? 'ماهانه' : 'یکباره'}
                    </BidiText>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getSubscriptionStatusBadgeVariant(subscription.status)}>
                    <PersianText className={getSubscriptionStatusColor(subscription.status)}>
                      {subscription.status === 'active'
                        ? 'فعال'
                        : subscription.status === 'canceled'
                          ? 'لغو شده'
                          : subscription.status === 'expired'
                            ? 'منقضی شده'
                            : subscription.status === 'pending'
                              ? 'در انتظار'
                              : subscription.status}
                    </PersianText>
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <BidiText className="persian-currency">
                    {formatTomanCurrency(subscription.currentPrice)}
                  </BidiText>
                </TableCell>
                <TableCell>
                  <BidiText>
                    {subscription.nextBillingDate
                      ? formatPersianDateTime(subscription.nextBillingDate.toString())
                      : 'N/A'}
                  </BidiText>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                      Receipt
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
