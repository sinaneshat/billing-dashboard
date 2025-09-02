'use client';

import { BanknoteIcon, CheckCircle, CreditCard, Package, Shield, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

function getPopularPlan(products: Array<{ id: string; name: string }>) {
  const proProduct = products.find(p => p.name.toLowerCase().includes('pro'));
  return proProduct?.id || (products.length > 1 ? products[1]?.id : null);
}

export function SubscriptionPlansCoherent() {
  const { data: products, isLoading, error } = useProductsQuery();
  const createSubscriptionMutation = useCreateSubscriptionMutation();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plans');
  const [contractId, setContractId] = useState<string | null>(null);

  const productList = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  const popularPlanId = getPopularPlan(productList);
  const selectedProduct = productList.find(p => p.id === selectedProductId);

  const handlePlanSelection = (productId: string) => {
    setSelectedProductId(productId);
    setActiveTab('payment');
  };

  const handleContractSuccess = async (contractIdValue: string) => {
    setContractId(contractIdValue);
    setActiveTab('confirmation');

    if (!selectedProductId) {
      toast.error('No plan selected');
      return;
    }

    try {
      const result = await createSubscriptionMutation.mutateAsync({
        json: {
          productId: selectedProductId,
          paymentMethod: 'direct-debit-contract',
          contractId: contractIdValue,
          enableAutoRenew: true,
        },
      });

      if (result.success) {
        toast.success('Subscription created with automatic renewal! Welcome aboard!');
        window.location.href = '/dashboard/billing';
      } else {
        toast.error('Failed to create subscription with contract');
        setActiveTab('payment');
      }
    } catch {
      toast.error('Failed to create subscription. Please try again.');
      setActiveTab('payment');
    }
  };

  // Reset flow helper function
  // const resetFlow = () => {
  //   setSelectedProductId(null);
  //   setContractId(null);
  //   setActiveTab('plans');
  // };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-6xl space-y-8">
          <FadeIn delay={0.05}>
            <div className="text-center space-y-4 py-8">
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

  if (error) {
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
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load subscription plans</h3>
                  <p className="text-muted-foreground mb-4">There was an error loading available plans. Please try again.</p>
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

  if (productList.length === 0) {
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
                    No Plans Available
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    There are no subscription plans available at the moment. Please check back later or contact support.
                  </p>
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
        {/* Header - Following dashboard pattern */}
        <FadeIn delay={0.05}>
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your plan and setup automatic billing with ZarinPal direct debit.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Separator />
        </FadeIn>

        {/* Tab-based Layout */}
        <FadeIn delay={0.12}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="plans" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Plans
                </TabsTrigger>
                <TabsTrigger value="payment" disabled={!selectedProductId} className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </TabsTrigger>
                <TabsTrigger value="confirmation" disabled={!contractId} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Plans Tab Content */}
            <TabsContent value="plans" className="space-y-8">
              <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {productList.map((product, index) => {
                  const isPopular = product.id === popularPlanId;
                  const isSelected = selectedProductId === product.id;

                  return (
                    <StaggerItem key={product.id} delay={index * 0.1}>
                      <Card
                        className={`relative h-full transition-all duration-300 hover:shadow-lg border-0 shadow-lg ${
                          isPopular
                            ? 'bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20'
                            : 'bg-gradient-to-br from-card to-card/50'
                        } ${isSelected ? 'ring-2 ring-primary/20' : ''}`}
                      >
                        {/* Popular Badge */}
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                            <Badge variant="secondary" className="gap-1 shadow-lg">
                              <Star className="h-3 w-3" />
                              Most Popular
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="text-center pb-6">
                          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mx-auto mb-4">
                            <Package className="h-8 w-8 text-primary" />
                          </div>

                          <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                            {product.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {product.description}
                          </CardDescription>

                          <div className="mt-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                              {formatTomanCurrency(product.price)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              per
                              {' '}
                              {product.billingPeriod}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <Button
                            className="w-full"
                            variant={isPopular ? 'default' : 'outline'}
                            onClick={() => handlePlanSelection(product.id)}
                            disabled={createSubscriptionMutation.isPending}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Select Plan
                          </Button>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Automatic renewal • Cancel anytime
                          </p>
                        </CardContent>
                      </Card>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </TabsContent>

            {/* Payment Setup Tab Content */}
            <TabsContent value="payment" className="space-y-6">
              {selectedProduct && (
                <FadeIn delay={0.05}>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                      <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mx-auto mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Setup Payment Method</CardTitle>
                      <CardDescription>
                        Selected plan:
                        {' '}
                        <strong>{selectedProduct.name}</strong>
                        {' '}
                        -
                        {' '}
                        {formatTomanCurrency(selectedProduct.price)}
                        {' '}
                        per
                        {' '}
                        {selectedProduct.billingPeriod}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <DirectDebitContractSetup onSuccess={handleContractSuccess}>
                        <Button className="w-full" size="lg">
                          <BanknoteIcon className="h-5 w-5 mr-2" />
                          Setup Direct Debit Contract
                        </Button>
                      </DirectDebitContractSetup>

                      <div className="text-center">
                        <Button variant="ghost" onClick={() => setActiveTab('plans')}>
                          ← Choose Different Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              )}
            </TabsContent>

            {/* Confirmation Tab Content */}
            <TabsContent value="confirmation" className="space-y-6">
              <FadeIn delay={0.05}>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 max-w-md mx-auto">
                  <CardContent className="pt-6 text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl mx-auto mb-4">
                      {createSubscriptionMutation.isPending
                        ? (
                            <LoadingSpinner className="h-8 w-8" />
                          )
                        : (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {createSubscriptionMutation.isPending ? 'Creating Subscription...' : 'Subscription Active!'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {createSubscriptionMutation.isPending
                        ? 'Setting up automatic billing with your contract...'
                        : 'Your subscription is now active with automatic renewal.'}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
