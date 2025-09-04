'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { CompactProductionPricing } from '@/components/pricing/compact-production-pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardSection, EmptyState, ErrorState } from '@/components/ui/dashboard-states';
import { DashboardSuccess } from '@/components/ui/dashboard-success';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { formatTomanCurrency } from '@/lib';

import { toast } from '../ui/use-toast';

export function ProductionSubscriptionPlans() {
  const t = useTranslations();
  const { data: products, isLoading, error, refetch } = useProductsQuery();
  const createSubscriptionMutation = useCreateSubscriptionMutation();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plans');
  const [contractId, setContractId] = useState<string | null>(null);

  const productList = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  // Products are already in the correct format from the API
  // API returns products with metadata.pricing containing USD/Toman/Rial prices

  const selectedProduct = productList.find(p => p.id === selectedProductId);

  const handleDirectSubscription = async (productId: string) => {
    try {
      const result = await createSubscriptionMutation.mutateAsync({
        json: {
          productId,
        },
      });

      if (result.success) {
        toast({ title: t('subscription.activationSuccess') });
        window.location.href = '/dashboard/billing';
      } else {
        toast({ title: t('subscription.activationFailed') });
      }
    } catch (error) {
      toast({ title: t('subscription.activationError') });
      console.error('Free subscription error:', error);
    }
  };

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
        toast({ title: 'Your subscription has been created successfully!' });
        window.location.href = '/dashboard/billing';
      } else {
        toast({ title: 'Failed to create subscription' });
        setActiveTab('payment');
      }
    } catch (error) {
      toast({ title: 'Failed to create subscription' });
      console.error('Paid subscription error:', error);
    }
  };

  // Return early states without wrappers (parent screen handles structure)
  if (error) {
    return (
      <>
        <DashboardPageHeader
          title="Subscription Plans"
          description="Choose the perfect plan for your needs"
        />
        <DashboardSection delay={0.1}>
          <ErrorState
            title="Failed to load plans"
            description="There was an error loading subscription plans. Please try again."
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
          title="Subscription Plans"
          description="Choose the perfect plan for your needs"
        />
        <DashboardSection delay={0.1}>
          <div className="text-center py-12">
            <div className="flex items-center justify-center">
              <LoadingSpinner className="h-8 w-8 me-2" />
              <span className="text-xl">Loading subscription plans...</span>
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
          title="Subscription Plans"
          description="Choose the perfect plan for your needs"
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
        title="Subscription Plans"
        description="Choose the perfect plan for your needs"
      />

      <DashboardSection delay={0.1}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="plans" className="flex items-center gap-2">
                Plans
              </TabsTrigger>
              <TabsTrigger value="payment" disabled={!selectedProductId} className="flex items-center gap-2">
                Payment
              </TabsTrigger>
              <TabsTrigger value="confirmation" disabled={!contractId} className="flex items-center gap-2">
                Confirm
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="plans" className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-muted-foreground">
                All prices calculated with live exchange rates
              </p>
            </div>

            <CompactProductionPricing
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
                    <CardTitle>Confirm Selected Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{selectedProduct.name}</span>
                        <div className="text-start">
                          <div className="font-bold text-lg">
                            {formatTomanCurrency(selectedProduct.price)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            per month
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedProduct.description}
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
              title="Congratulations!"
              description="Your subscription has been activated successfully."
              actionText="Go to Dashboard"
              actionHref="/dashboard"
            />
          </TabsContent>
        </Tabs>
      </DashboardSection>
    </>
  );
}
