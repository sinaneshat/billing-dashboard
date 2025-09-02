'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { PageHeader } from '@/components/dashboard/page-header';
import { CompactProductionPricing } from '@/components/pricing/compact-production-pricing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition } from '@/components/ui/motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { formatTomanCurrency } from '@/lib/utils/currency';

type ProductionSubscriptionPlansProps = {
  className?: string;
};

export function ProductionSubscriptionPlans({
  className,
}: ProductionSubscriptionPlansProps) {
  const { data: products, isLoading, error } = useProductsQuery();
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
        toast.success('Your free subscription has been activated successfully!');
        window.location.href = '/dashboard/billing';
      } else {
        toast.error('Failed to activate free subscription');
      }
    } catch (error) {
      toast.error('Failed to activate subscription');
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
        toast.success('Your subscription has been created successfully!');
        window.location.href = '/dashboard/billing';
      } else {
        toast.error('Failed to create subscription');
        setActiveTab('payment');
      }
    } catch (error) {
      toast.error('Failed to create subscription');
      console.error('Paid subscription error:', error);
    }
  };

  if (error) {
    return (
      <PageTransition>
        <div className={className}>
          <PageHeader
            title="Subscription Plans"
            description="Choose the perfect plan for your needs"
          />
          <FadeIn delay={0.05}>
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to load plans. Please refresh the page.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className={className}>
          <PageHeader
            title="Subscription Plans"
            description="Choose the perfect plan for your needs"
          />
          <FadeIn delay={0.05}>
            <div className="text-center py-12">
              <div className="flex items-center justify-center">
                <LoadingSpinner className="h-8 w-8 mr-2" />
                <span className="text-xl">Loading subscription plans...</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    );
  }

  if (productList.length === 0) {
    return (
      <PageTransition>
        <div className={className}>
          <PageHeader
            title="Subscription Plans"
            description="Choose the perfect plan for your needs"
          />
          <FadeIn delay={0.05}>
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-muted-foreground mb-4">
                    No plans available
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    No subscription plans are currently available.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh page
                  </Button>
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
      <div className={className}>
        <PageHeader
          title="Subscription Plans"
          description="Choose the perfect plan for your needs"
        />

        <FadeIn delay={0.05}>
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
                          <div className="text-left">
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
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">✓</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                      <p className="text-muted-foreground mb-6">
                        Your subscription has been activated successfully.
                      </p>
                      <Button onClick={() => window.location.href = '/dashboard'}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
