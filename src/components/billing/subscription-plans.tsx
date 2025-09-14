'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSection, EmptyState, ErrorState } from '@/components/dashboard/dashboard-states';
import { DashboardSuccess } from '@/components/dashboard/dashboard-success';
import { PricingCards } from '@/components/pricing/pricing-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { getEnvironmentVariables } from '@/utils';

import { toast } from '../ui/use-toast';

type SubscriptionPlansProps = {
  ssoFlowData?: {
    priceId?: string;
    productId?: string;
    step?: string;
  };
};

// Database-driven translation key extraction from product name
function getProductTranslationKey(productName: string): string {
  // Use product name from database to determine translation key
  const normalizedName = productName.toLowerCase().trim();

  // Map database product names to translation keys
  if (normalizedName.includes('free'))
    return 'free';
  if (normalizedName.includes('starter'))
    return 'starter';
  if (normalizedName.includes('pro'))
    return 'pro';
  if (normalizedName.includes('power'))
    return 'power';

  // Fallback to starter if no match found
  return 'starter';
}

export function SubscriptionPlans({ ssoFlowData }: SubscriptionPlansProps) {
  const t = useTranslations();
  const { data: products, isLoading, error, refetch } = useProductsQuery();
  const createSubscriptionMutation = useCreateSubscriptionMutation();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plans');
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);

  const productList = useMemo(() => {
    return products?.success && Array.isArray(products.data)
      ? products.data.filter(product => product.isActive)
      : [];
  }, [products]);

  // Find product by price ID or product ID
  const preSelectedProduct = useMemo(() => {
    if (productList.length === 0) {
      return null;
    }

    // First try to match by price ID
    if (ssoFlowData?.priceId) {
      const foundByPrice = productList.find(p => p.stripePriceId === ssoFlowData.priceId);
      if (foundByPrice)
        return foundByPrice;
    }

    // Fallback to matching by product ID
    if (ssoFlowData?.productId) {
      const foundByProduct = productList.find(p => p.id === ssoFlowData.productId);
      if (foundByProduct)
        return foundByProduct;
    }

    return null;
  }, [ssoFlowData?.priceId, ssoFlowData?.productId, productList]);

  // Products are already in the correct format from the API
  // API returns products with metadata.pricing containing USD/Toman/Rial prices

  const selectedProduct = productList.find(p => p.id === selectedProductId);

  const handleDirectSubscription = useCallback(async (productId: string) => {
    try {
      const result = await createSubscriptionMutation.mutateAsync({
        json: { productId },
      });

      if (result.success) {
        toast({ title: t('subscription.activationSuccess') });

        // Redirect back to roundtable after successful subscription
        setTimeout(() => {
          window.location.href = `${getEnvironmentVariables().ROUNDTABLE_APP_URL}/dashboard/plans`;
        }, 1500);
      } else {
        toast({ title: t('subscription.activationFailed') });
      }
    } catch (error) {
      toast({ title: t('subscription.activationError') });
      console.error('Free subscription error:', error);
    }
  }, [createSubscriptionMutation, t]);

  const handlePlanSelect = (planId: string) => {
    const product = productList.find(p => p.id === planId);
    if (!product)
      return;

    setSelectedProductId(planId);

    // Free plan - direct subscription without payment
    if (product.price === 0) {
      void handleDirectSubscription(planId);
      return;
    }

    // Paid plans - go to payment setup
    setActiveTab('payment');
  };

  const handleContractSuccess = async (contractId: string) => {
    setContractId(contractId);
    setActiveTab('confirmation');

    if (!selectedProductId)
      return;

    try {
      const result = await createSubscriptionMutation.mutateAsync({
        json: {
          productId: selectedProductId,
          paymentMethod: 'direct-debit-contract',
          contractId,
        },
      });

      if (result.success) {
        toast({ title: t('subscription.createSuccess') });

        // Redirect back to roundtable after successful subscription
        setTimeout(() => {
          window.location.href = `${getEnvironmentVariables().ROUNDTABLE_APP_URL}/dashboard/plans`;
        }, 1500);
      } else {
        toast({ title: t('subscription.createFailed') });
        setActiveTab('payment');
      }
    } catch (error) {
      toast({ title: t('subscription.createFailed') });
      console.error('Paid subscription error:', error);
    }
  };

  // Handle client mount and SSO flow data
  const handleClientMount = React.useCallback(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setIsClientMounted(true);
  }, []);

  const handleTabChange = React.useCallback((step: string) => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setActiveTab(step);
  }, []);

  const handleProductSelection = React.useCallback((productId: string) => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setSelectedProductId(productId);
  }, []);

  const handlePaymentTabChange = React.useCallback(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setActiveTab('payment');
  }, []);

  React.useEffect(() => {
    handleClientMount();
  }, [handleClientMount]);

  React.useEffect(() => {
    // Set initial tab based on SSO data after client mount
    if (ssoFlowData?.step) {
      handleTabChange(ssoFlowData.step);
    }
  }, [ssoFlowData?.step, handleTabChange]);

  // Handle pre-selected product from SSO
  React.useEffect(() => {
    if (!isClientMounted) {
      return;
    }

    if (preSelectedProduct && !selectedProductId) {
      handleProductSelection(preSelectedProduct.id);

      // If step is payment and it's a free plan, auto-subscribe
      if (preSelectedProduct.price === 0 && ssoFlowData?.step === 'payment') {
        void handleDirectSubscription(preSelectedProduct.id);
      } else if (preSelectedProduct.price > 0 && ssoFlowData?.step === 'payment') {
        handlePaymentTabChange();
      }
    }
  }, [preSelectedProduct, selectedProductId, ssoFlowData, handleDirectSubscription, isClientMounted, handleProductSelection, handlePaymentTabChange]);

  // Return early states without wrappers (parent screen handles structure)
  if (error) {
    return (
      <>
        <DashboardPageHeader
          title={t('plans.subscriptionPlans')}
          description={t('plans.choosePerfectPlan')}
        />
        <DashboardSection delay={0.1}>
          <ErrorState
            title={t('plans.failedToLoad')}
            description={t('plans.errorDescription')}
            onRetry={() => window.location.reload()}
          />
        </DashboardSection>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <DashboardPageHeader
          title={t('plans.subscriptionPlans')}
          description={t('plans.choosePerfectPlan')}
        />
        <DashboardSection delay={0.1}>
          <div className="text-center py-12">
            <div className="flex items-center justify-center">
              <LoadingSpinner className="h-8 w-8 me-2" />
              <span className="text-xl">{t('plans.loadingMessage')}</span>
            </div>
          </div>
        </DashboardSection>
      </>
    );
  }

  if (productList.length === 0) {
    return (
      <>
        <DashboardPageHeader
          title={t('plans.subscriptionPlans')}
          description={t('plans.choosePerfectPlan')}
        />
        <DashboardSection delay={0.1}>
          <EmptyState
            variant="plans"
            action={(
              <Button variant="outline" onClick={() => refetch()}>
                {t('actions.refresh')}
              </Button>
            )}
          />
        </DashboardSection>
      </>
    );
  }

  return (
    <>
      <DashboardPageHeader
        title={t('plans.subscriptionPlans')}
        description={t('plans.choosePerfectPlan')}
      />

      <DashboardSection delay={0.1}>
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'plans' | 'payment' | 'confirmation')}
          className="space-y-8"
          suppressHydrationWarning
        >
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="plans" className="flex items-center gap-2">
                {t('plans.plans')}
              </TabsTrigger>
              <TabsTrigger value="payment" disabled={!selectedProductId} className="flex items-center gap-2">
                {t('plans.payment')}
              </TabsTrigger>
              <TabsTrigger value="confirmation" disabled={!contractId} className="flex items-center gap-2">
                {t('plans.confirm')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="plans" className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-muted-foreground">
                {t('plans.liveRatesNote')}
              </p>
            </div>

            <PricingCards
              products={productList}
              onPlanSelect={handlePlanSelect}
              className="space-y-6"
            />
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            {selectedProduct && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('plans.confirmSelectedPlan')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {t(`plans.pricing.${getProductTranslationKey(selectedProduct.name)}.name`)}
                        </span>
                        <div className="text-start">
                          <div className="font-bold text-lg">
                            {selectedProduct.formattedPrice || `${selectedProduct.price} Toman`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('plans.perMonth')}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t(`plans.pricing.${getProductTranslationKey(selectedProduct.name)}.description`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <DirectDebitContractSetup
                  onSuccess={handleContractSuccess}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmation" className="space-y-6">
            <DashboardSuccess
              title={t('plans.congratulations')}
              description={t('plans.subscriptionActivated')}
              actionText={t('plans.goToDashboard')}
              actionHref={`${getEnvironmentVariables().ROUNDTABLE_APP_URL}/dashboard/plans`}
            />
          </TabsContent>
        </Tabs>
      </DashboardSection>
    </>
  );
}
