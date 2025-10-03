'use client';

import { CreditCard, ExternalLink, Loader2, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardContainer } from '@/components/dashboard/dashboard-layout';
import { DashboardPage } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateCustomerPortalSessionMutation, useCurrentSubscriptionQuery, useSyncAfterCheckoutMutation } from '@/hooks';

export default function BillingOverviewScreen() {
  const t = useTranslations();
  const { data: currentSubscription, isLoading } = useCurrentSubscriptionQuery();
  const portalMutation = useCreateCustomerPortalSessionMutation();
  const syncMutation = useSyncAfterCheckoutMutation();

  const handleManageSubscription = async () => {
    const result = await portalMutation.mutateAsync({
      json: {
        returnUrl: window.location.href,
      },
    });

    if (result.data.url) {
      window.location.href = result.data.url;
    }
  };

  const handleSync = async () => {
    await syncMutation.mutateAsync({});
  };

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('billing.overview.title')}
        description={t('billing.overview.description')}
      />

      <DashboardContainer>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                {t('billing.currentSubscription.title')}
              </CardTitle>
              <CardDescription>{t('billing.currentSubscription.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading
                ? (
                    <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                  )
                : currentSubscription
                  ? (
                      <div className="space-y-3">
                        <p className="text-sm">
                          <span className="font-medium">
                            {t('billing.status')}
                            :
                          </span>
                          {' '}
                          <span className="capitalize">{currentSubscription.status}</span>
                        </p>
                        <div className="space-y-2">
                          <Button
                            onClick={handleManageSubscription}
                            disabled={portalMutation.isPending}
                            className="w-full"
                          >
                            {portalMutation.isPending
                              ? (
                                  <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    {t('common.loading')}
                                  </>
                                )
                              : (
                                  <>
                                    <ExternalLink className="mr-2 size-4" />
                                    {t('billing.manageSubscription')}
                                  </>
                                )}
                          </Button>
                          <Button
                            onClick={handleSync}
                            disabled={syncMutation.isPending}
                            variant="outline"
                            className="w-full"
                          >
                            {syncMutation.isPending
                              ? (
                                  <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    {t('billing.syncing')}
                                  </>
                                )
                              : (
                                  <>
                                    <RefreshCw className="mr-2 size-4" />
                                    {t('billing.syncSubscription')}
                                  </>
                                )}
                          </Button>
                        </div>
                      </div>
                    )
                  : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t('billing.noSubscription')}</p>
                        <Button asChild className="w-full">
                          <Link href="/dashboard/pricing">{t('billing.viewPlans')}</Link>
                        </Button>
                      </div>
                    )}
            </CardContent>
          </Card>

          {/* Available Products Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                {t('billing.products.title')}
              </CardTitle>
              <CardDescription>{t('billing.products.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/pricing">{t('billing.browseProducts')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardContainer>
    </DashboardPage>
  );
}
