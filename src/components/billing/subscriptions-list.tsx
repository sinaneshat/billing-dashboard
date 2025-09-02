'use client';

import { Calendar, CreditCard, Package } from 'lucide-react';
import { memo, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';
import type { GetSubscriptionsResponse } from '@/services/api/subscriptions';

// Extract subscription type from API response
type Subscription = NonNullable<GetSubscriptionsResponse['data']>[number];

export const SubscriptionsList = memo(() => {
  const { data: subscriptionsData, isLoading, error } = useSubscriptionsQuery();

  // Memoize the subscriptions array to prevent unnecessary re-renders
  const subscriptions = useMemo(() => subscriptionsData?.data || [], [subscriptionsData?.data]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <div className="text-center space-y-4 py-8">
              <div className="flex items-center justify-center">
                <LoadingSpinner className="h-8 w-8 mr-2" />
                <span className="text-xl">Loading subscriptions...</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  if (error || !subscriptionsData?.success) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-destructive/5 to-destructive/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-2xl mx-auto mb-4">
                    <Package className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load subscriptions</h3>
                  <p className="text-muted-foreground mb-4">There was an error loading your subscriptions. Please try again.</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mx-auto mb-6 border-2 border-dashed border-primary/20">
                    <Package className="h-12 w-12 text-primary/70" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    No Active Subscriptions
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    You don't have any active subscriptions yet. Start by choosing a plan that fits your needs.
                  </p>
                  <Button>Browse Plans</Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <FadeIn delay={0.05}>
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Your Subscriptions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Manage your active subscriptions and billing details
            </p>
          </div>
        </FadeIn>

        {/* Subscriptions Table */}
        <FadeIn delay={0.12}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                All Subscriptions
              </CardTitle>
              <CardDescription>
                All your subscriptions in one place - no pagination needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <StaggerContainer>
                      {subscriptions.map((subscription: Subscription, index: number) => (
                        <StaggerItem key={subscription.id} delay={index * 0.05}>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                                  <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{subscription.product?.name || 'Unknown Plan'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {subscription.product?.description || 'No description'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <SubscriptionStatusBadge status={subscription.status} />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatTomanCurrency(subscription.currentPrice)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                per
                                {' '}
                                {subscription.product?.billingPeriod || 'month'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {subscription.nextBillingDate
                                ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">
                                        {new Date(subscription.nextBillingDate).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )
                                : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {subscription.directDebitContractId ? 'Direct Debit' : 'Payment Gateway'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm">
                                  Manage
                                </Button>
                                {subscription.status === 'active' && (
                                  <Button variant="ghost" size="sm">
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
});
