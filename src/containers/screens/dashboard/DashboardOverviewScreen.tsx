'use client';

import { ArrowRight, BarChart3, Calendar, CheckCircle, Clock, CreditCard, Package, Plus, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataStateIndicator, ErrorFallback, NetworkError } from '@/components/ui/error-states';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { useQueryUIState, useStaleWhileRevalidate } from '@/hooks/utils/query-helpers';
import { useSession } from '@/lib/auth/client';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

// Dashboard skeleton components
function DashboardSkeleton() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-8">
        <FadeIn delay={0.05}>
          <div className="text-center space-y-4 py-8">
            <Skeleton className="h-10 w-96 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
        </FadeIn>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <Card className="h-full">
              <CardHeader className="text-center pb-6">
                <Skeleton className="w-20 h-20 rounded-full mx-auto mb-6" />
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-5 w-64 mx-auto mt-3" />
                <Skeleton className="h-8 w-32 mx-auto mt-2" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }, (_, i) => i).map(index => (
                    <Skeleton key={`skeleton-${index}`} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default function DashboardOverviewScreen() {
  // Get session from Better Auth client (uses cached server data)
  const { data: session } = useSession();

  // Use server-prefetched data - no additional loading states needed
  const currentSubscriptionQuery = useCurrentSubscriptionQuery();
  const paymentMethodsQuery = usePaymentMethodsQuery();

  // Enhanced query state management
  const subscriptionUIState = useQueryUIState(currentSubscriptionQuery);
  const paymentMethodsUIState = useQueryUIState(paymentMethodsQuery);
  const subscriptionStaleState = useStaleWhileRevalidate(currentSubscriptionQuery);

  const user = session?.user;
  const currentSubscription = subscriptionStaleState.data;

  // Show skeleton only for subscription data (user data is already available server-side)
  if (subscriptionUIState.showSkeleton) {
    return <DashboardSkeleton />;
  }

  // User should be available from server-side session
  if (!user) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl">
          <ErrorFallback
            error={new Error('Session not found')}
            resetError={() => window.location.reload()}
            className="mt-8"
          />
        </div>
      </PageTransition>
    );
  }

  const hasActiveSubscription = currentSubscription?.status === 'active';
  const paymentMethodsList = paymentMethodsQuery.data?.success && Array.isArray(paymentMethodsQuery.data.data)
    ? paymentMethodsQuery.data.data
    : [];

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Enhanced data state indicators */}
        {subscriptionStaleState.showUpdating && (
          <DataStateIndicator
            variant="updating"
            title="Refreshing Data"
            description="Updating subscription information in background..."
          />
        )}

        {subscriptionStaleState.showStaleWarning && (
          <DataStateIndicator
            variant="stale"
            title="Data May Be Outdated"
            description="Subscription information may not be current."
            showRetry={true}
            onRetry={() => currentSubscriptionQuery.refetch()}
          />
        )}

        {/* Enhanced network error states */}
        {subscriptionUIState.showError && (
          <NetworkError
            variant="connection"
            title="Unable to Load Subscription Data"
            description="There was a problem connecting to our servers. Please check your connection and try again."
            showRetry={subscriptionUIState.showRetry}
            onRetry={() => currentSubscriptionQuery.refetch()}
          />
        )}

        {/* Welcome Header */}
        <FadeIn delay={0.05}>
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back,
              {' '}
              {user?.name || user?.email?.split('@')[0] || 'User'}
              !
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Manage your billing and subscriptions
            </p>
            {subscriptionStaleState.showStaleWarning && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Subscription data may be outdated
              </p>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Separator />
        </FadeIn>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Primary Card - Takes up most space on desktop */}
          <div className="lg:col-span-8">
            <FadeIn delay={0.12}>
              {hasActiveSubscription
                ? (
              /* Active Subscription View */
                    <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
                      <CardHeader className="text-center pb-6 relative">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        </div>

                        <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mx-auto mb-6 relative overflow-hidden">
                          <Package className="h-12 w-12 text-primary" />
                          {subscriptionStaleState.showUpdating && (
                            <div className="absolute -top-1 -right-1">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                            </div>
                          )}
                          {/* Subtle animation ring */}
                          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-pulse" />
                        </div>

                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                          {currentSubscription.product?.name}
                        </CardTitle>

                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <CardDescription className="text-base">
                            Next billing:
                            {' '}
                            {currentSubscription.nextBillingDate
                              ? new Date(currentSubscription.nextBillingDate).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'N/A'}
                          </CardDescription>
                        </div>

                        <div className="text-4xl font-bold text-primary mt-4 tracking-tight">
                          {formatTomanCurrency(currentSubscription.currentPrice)}
                          <span className="text-sm text-muted-foreground font-normal ml-2">/month</span>
                        </div>

                        {/* Billing cycle progress - Dynamic calculation */}
                        {currentSubscription?.nextBillingDate && (() => {
                          const now = new Date();
                          const nextBilling = new Date(currentSubscription.nextBillingDate);
                          const startOfCycle = new Date(currentSubscription.startDate || now);
                          const totalCycleDays = Math.ceil((nextBilling.getTime() - startOfCycle.getTime()) / (1000 * 60 * 60 * 24));
                          const remainingDays = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          const progressPercentage = Math.max(0, Math.min(100, ((totalCycleDays - remainingDays) / totalCycleDays) * 100));

                          return (
                            <div className="mt-6 space-y-2">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Billing cycle progress</span>
                                <span>
                                  {remainingDays > 0
                                    ? `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} remaining`
                                    : 'Due now'}
                                </span>
                              </div>
                              <Progress value={progressPercentage} className="h-2" />
                            </div>
                          );
                        })()}
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Button
                            asChild
                            className="h-12 text-base font-medium"
                            startIcon={<Settings className="h-5 w-5" />}
                          >
                            <Link href="/dashboard/billing/subscriptions">
                              Manage Plan
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="h-12 text-base font-medium"
                            startIcon={<CreditCard className="h-5 w-5" />}
                          >
                            <Link href="/dashboard/billing/methods">
                              {paymentMethodsList.length > 0 ? 'Payment Methods' : 'Setup Payment'}
                            </Link>
                          </Button>
                        </div>

                        {/* Plan features - More relevant for billing dashboard */}
                        <div className="mt-6 pt-6 border-t border-border/50">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Plan Benefits</span>
                              <span className="font-medium">Active</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Unlimited API Access</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>24/7 Support</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Priority Processing</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Advanced Analytics</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                : (
              /* No Subscription View */
                    <Card className="h-full border-dashed border-2 bg-gradient-to-br from-muted/30 to-background">
                      <CardHeader className="text-center pb-6">
                        <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl mx-auto mb-6 border-2 border-dashed border-primary/20">
                          <Plus className="h-12 w-12 text-primary/70" />
                        </div>
                        <CardTitle className="text-3xl font-bold">Get Started</CardTitle>
                        <CardDescription className="text-lg mt-3 max-w-md mx-auto">
                          Choose a subscription plan to unlock premium features and start building amazing things
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center pt-0 space-y-6">
                        <Button
                          asChild
                          size="lg"
                          className="text-lg px-12 h-14 rounded-xl font-semibold"
                          endIcon={<ArrowRight className="h-5 w-5" />}
                        >
                          <Link href="/dashboard/billing/plans">
                            Browse Plans
                          </Link>
                        </Button>

                        {/* Features preview */}
                        <div className="grid grid-cols-2 gap-4 mt-8 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Unlimited API calls
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            24/7 Support
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Advanced Analytics
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Priority Access
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
            </FadeIn>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-4">
            <FadeIn delay={0.16}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-4">Quick Actions</h3>
                  <StaggerContainer className="space-y-4">
                    <StaggerItem>
                      <Button asChild variant="outline" className="w-full h-16 justify-start gap-4 text-base">
                        <Link href="/dashboard/billing/plans">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                            <Plus className="h-5 w-5 text-primary" />
                          </div>
                          <span className="flex-1 text-left">Browse Plans</span>
                        </Link>
                      </Button>
                    </StaggerItem>
                    <StaggerItem>
                      <Button asChild variant="outline" className="w-full h-16 justify-start gap-4 text-base">
                        <Link href="/dashboard/billing/payments">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <span className="flex-1 text-left">Payment History</span>
                        </Link>
                      </Button>
                    </StaggerItem>
                    <StaggerItem>
                      <Button asChild variant="outline" className="w-full h-16 justify-start gap-4 text-base">
                        <Link href="/dashboard/billing/methods">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <span className="flex-1 text-left">Payment Methods</span>
                        </Link>
                      </Button>
                    </StaggerItem>
                  </StaggerContainer>
                </div>

                {/* Enhanced Stats Cards for Desktop */}
                <div className="hidden lg:block space-y-4">
                  <FadeIn delay={0.2}>
                    <Card className="border-0 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Account Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={hasActiveSubscription ? 'success' : 'secondary'} className="gap-1">
                              {hasActiveSubscription ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {hasActiveSubscription ? 'Active' : 'Inactive'}
                            </Badge>
                            {subscriptionStaleState.showUpdating && (
                              <LoadingSpinner className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Plan</span>
                          <Badge variant="outline" className="font-medium">
                            {currentSubscription?.product?.name || 'Free Trial'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Methods</span>
                          <div className="flex items-center gap-2">
                            {paymentMethodsUIState.isLoading
                              ? (
                                  <Skeleton className="h-4 w-8" />
                                )
                              : (
                                  <Badge variant="secondary" className="gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {paymentMethodsList.length}
                                  </Badge>
                                )}
                          </div>
                        </div>
                        {hasActiveSubscription && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Next Billing</span>
                            <Badge variant="outline" className="gap-1 font-mono text-xs">
                              <Calendar className="h-3 w-3" />
                              {currentSubscription?.nextBillingDate
                                ? new Date(currentSubscription.nextBillingDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'N/A'}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </FadeIn>

                  {/* Billing Summary Card */}
                  <FadeIn delay={0.25}>
                    <Card className="border-0 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          Billing Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {hasActiveSubscription
                          ? (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Current Plan</span>
                                  <span className="text-sm font-medium">{currentSubscription?.product?.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Monthly Cost</span>
                                  <span className="text-sm font-medium">{formatTomanCurrency(currentSubscription?.currentPrice || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">Status</span>
                                  <Badge variant="outline" className="text-xs">
                                    Active
                                  </Badge>
                                </div>
                                {currentSubscription?.nextBillingDate && (
                                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                    <span className="text-sm text-muted-foreground">Next Payment</span>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">{formatTomanCurrency(currentSubscription.currentPrice)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(currentSubscription.nextBillingDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          : (
                              <div className="text-center py-4">
                                <div className="text-sm text-muted-foreground mb-2">
                                  No active subscription
                                </div>
                                <Button size="sm" asChild>
                                  <a href="/dashboard/billing/plans">Browse Plans</a>
                                </Button>
                              </div>
                            )}
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
