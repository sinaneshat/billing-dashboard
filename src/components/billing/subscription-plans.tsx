'use client';

import { BanknoteIcon, Package, Shield, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

function getPopularPlan(products: Array<{ id: string; name: string }>) {
  // Mark the middle-tier plan as popular, or the one with "pro" in the name
  const proProduct = products.find(p => p.name.toLowerCase().includes('pro'));
  return proProduct?.id || (products.length > 1 ? products[1]?.id : null);
}

export function SubscriptionPlans() {
  const { data: products, isLoading, error } = useProductsQuery();
  const createSubscriptionMutation = useCreateSubscriptionMutation();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [contractSetupStep, setContractSetupStep] = useState<'select-plan' | 'setup-contract' | 'confirming'>('select-plan');

  const productList = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  const popularPlanId = getPopularPlan(productList);

  const handlePlanSelection = (productId: string) => {
    setSelectedProductId(productId);
    setContractSetupStep('setup-contract');
  };

  const handleContractSuccess = async (contractId: string) => {
    if (!selectedProductId) {
      toast.error('No plan selected');
      return;
    }

    setContractSetupStep('confirming');

    try {
      // Create subscription with direct debit contract
      const result = await createSubscriptionMutation.mutateAsync({
        json: {
          productId: selectedProductId,
          paymentMethod: 'direct-debit-contract',
          contractId,
          enableAutoRenew: true,
        },
      });

      if (result.success) {
        toast.success('Subscription created with automatic renewal! Welcome aboard!');
        // Redirect to dashboard instead of payment gateway
        window.location.href = '/dashboard/billing';
      } else {
        toast.error('Failed to create subscription with contract');
        setContractSetupStep('setup-contract');
      }
    } catch (error) {
      console.error('Failed to create subscription with contract:', error);
      toast.error('Failed to create subscription. Please try again.');
      setContractSetupStep('setup-contract');
    }
  };

  const resetFlow = () => {
    setSelectedProductId(null);
    setContractSetupStep('select-plan');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading subscription plans...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-destructive mb-2">Failed to load subscription plans</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productList.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Plans Available</h3>
            <p className="text-muted-foreground">
              There are no subscription plans available at the moment. Please check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select your plan and setup automatic billing with ZarinPal direct debit. All subscriptions renew automatically with your signed bank contract.
        </p>

        {contractSetupStep !== 'select-plan' && (
          <div className="max-w-md mx-auto mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-900 text-sm font-medium mb-1">
              <Shield className="h-4 w-4" />
              Contract-Based Subscription Setup
            </div>
            <p className="text-xs text-blue-700">
              {contractSetupStep === 'setup-contract' && 'Complete direct debit contract setup to activate your subscription'}
              {contractSetupStep === 'confirming' && 'Finalizing subscription with your signed contract'}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {productList.map((product) => {
          const isPopular = product.id === popularPlanId;

          return (
            <Card
              key={product.id}
              className={`relative ${isPopular ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <CardDescription className="text-base">
                  {product.description}
                </CardDescription>
                <div className="mt-4">
                  <div className="text-4xl font-bold">
                    {formatTomanCurrency(product.price)}
                  </div>
                  <div className="text-muted-foreground">
                    per
                    {' '}
                    {product.billingPeriod}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {contractSetupStep === 'select-plan'
                  ? (
                      <>
                        <Button
                          className="w-full"
                          variant={isPopular ? 'default' : 'outline'}
                          onClick={() => handlePlanSelection(product.id)}
                          disabled={createSubscriptionMutation.isPending}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Setup Direct Debit & Subscribe
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Automatic renewal • Cancel anytime • Bank-level security
                        </p>
                      </>
                    )
                  : selectedProductId === product.id
                    ? (
                        <div className="space-y-4">
                          {contractSetupStep === 'setup-contract' && (
                            <>
                              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                <h4 className="font-medium text-blue-900">
                                  Selected:
                                  {product.name}
                                </h4>
                                <p className="text-sm text-blue-700">Now setup your direct debit contract</p>
                              </div>
                              <DirectDebitContractSetup onSuccess={handleContractSuccess}>
                                <Button className="w-full" variant="default">
                                  <BanknoteIcon className="h-4 w-4 mr-2" />
                                  Setup Contract & Subscribe
                                </Button>
                              </DirectDebitContractSetup>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFlow}
                                className="w-full"
                              >
                                ← Choose Different Plan
                              </Button>
                            </>
                          )}
                          {contractSetupStep === 'confirming' && (
                            <div className="text-center p-6">
                              <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
                              <h4 className="font-medium mb-2">Creating Your Subscription</h4>
                              <p className="text-sm text-muted-foreground">
                                Setting up automatic billing with your signed contract...
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    : (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          Complete other subscription first
                        </Button>
                      )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto pt-12">
        <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change my plan later?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time from your billing dashboard.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How does billing work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All subscriptions use ZarinPal's secure direct debit contracts. You sign a contract with your bank once, then all renewals are automatic - no manual payments needed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What is a direct debit contract?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                It's a secure agreement between you, your bank, and ZarinPal that allows automatic subscription billing. You sign it once with your bank's authentication, then all renewals happen automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens if I cancel?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cancelling stops future automatic renewals immediately. You keep access until your current billing period ends. Your direct debit contract remains available for future subscriptions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Direct Debit Information */}
      <div className="max-w-4xl mx-auto pt-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-900">Enable Automatic Renewal</CardTitle>
            </div>
            <p className="text-blue-700 text-sm">
              Setup a ZarinPal direct debit contract for hassle-free automatic subscription renewals
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-medium text-blue-900 mb-2">Benefits:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Never miss a subscription renewal</li>
                  <li>✓ Secure bank-level authentication</li>
                  <li>✓ Cancel or modify anytime</li>
                  <li>✓ No interrupted service</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-900 mb-2">How it works:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Create contract with mobile & national ID</li>
                  <li>2. Sign securely with your bank</li>
                  <li>3. Subscribe with automatic renewal</li>
                </ul>
              </div>
            </div>
            <DirectDebitContractSetup onSuccess={() => toast.success('Direct debit contract created!')}>
              <Button className="w-full sm:w-auto">
                <BanknoteIcon className="h-4 w-4 mr-2" />
                Setup Direct Debit Contract
              </Button>
            </DirectDebitContractSetup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
