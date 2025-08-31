'use client';

import { Package, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
  // Note: API doesn't support query parameters yet
  const { data: products, isLoading, error } = useProductsQuery();
  const createSubscriptionMutation = useCreateSubscriptionMutation();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const productList = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  const popularPlanId = getPopularPlan(productList);

  const handleSubscribe = async (productId: string) => {
    setSelectedProductId(productId);

    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await createSubscriptionMutation.mutateAsync({
        json: {
          productId,
          paymentMethod: 'zarinpal',
          callbackUrl,
        },
      });

      if (result.success && result.data?.paymentUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.data.paymentUrl;
      } else {
        toast.error('Failed to create subscription');
        setSelectedProductId(null);
      }
    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error('Failed to create subscription. Please try again.');
      setSelectedProductId(null);
    }
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
          Select the perfect plan for your needs. All plans include our core features with varying limits and support levels.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {productList.map((product) => {
          const isPopular = product.id === popularPlanId;
          const isLoading = selectedProductId === product.id && createSubscriptionMutation.isPending;

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
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(product.id)}
                  disabled={isLoading || createSubscriptionMutation.isPending}
                >
                  {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
                  {isLoading ? 'Creating Subscription...' : 'Subscribe Now'}
                </Button>

                {isLoading && (
                  <p className="text-xs text-muted-foreground text-center">
                    Redirecting to ZarinPal for secure payment...
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Cancel anytime • No setup fees • Secure payment
                </p>
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
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We accept all major Iranian bank cards through ZarinPal secure payment gateway.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is there a free trial?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Currently, we don't offer a free trial, but you can cancel your subscription anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens if I cancel?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You'll continue to have access to your subscription until the end of your current billing period.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
