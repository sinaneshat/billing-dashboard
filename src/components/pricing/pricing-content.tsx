'use client';

import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PricingCard } from '@/components/ui/pricing-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BillingInterval = 'month' | 'year';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  features?: string[] | null;
  prices?: Array<{
    id: string;
    interval?: string | null;
    currency: string;
    unitAmount: number;
    trialPeriodDays?: number | null;
  }>;
};

type Subscription = {
  id: string;
  status: string;
  productId: string;
  currentPeriodEnd?: string | null;
};

type PricingContentProps = {
  products: Product[];
  subscriptions: Subscription[];
  isLoading?: boolean;
  error?: Error | null;
  processingPriceId: string | null;
  onSubscribe: (priceId: string) => void | Promise<void>;
  onCancel: (subscriptionId: string) => void | Promise<void>;
  onManageBilling: () => void;
  isProcessing?: boolean;
  showSubscriptionBanner?: boolean;
};

/**
 * Shared Pricing Content Component
 *
 * Used by both the standalone pricing page and the pricing modal
 * to ensure consistent display and behavior across both contexts.
 */
export function PricingContent({
  products,
  subscriptions,
  isLoading = false,
  error = null,
  processingPriceId,
  onSubscribe,
  onCancel,
  onManageBilling,
  isProcessing = false,
  showSubscriptionBanner = false,
}: PricingContentProps) {
  const t = useTranslations();
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('month');

  // Get active subscription
  const activeSubscription = subscriptions.find(
    sub => sub.status === 'active' || sub.status === 'trialing',
  );

  // Check if user has ANY active subscription
  const hasAnyActiveSubscription = subscriptions.some(
    sub => sub.status === 'active' || sub.status === 'trialing',
  );

  // Get subscription for a specific product
  const getSubscriptionForProduct = (productId: string) => {
    return subscriptions.find(
      sub => sub.productId === productId && (sub.status === 'active' || sub.status === 'trialing'),
    );
  };

  // Check if user has active subscription for a specific product
  const hasActiveSubscription = (productId: string): boolean => {
    return !!getSubscriptionForProduct(productId);
  };

  // Filter products by interval
  const getProductsForInterval = (interval: BillingInterval) => {
    return products
      .map((product) => {
        const filteredPrices = product.prices?.filter(price => price.interval === interval) || [];
        return { ...product, prices: filteredPrices };
      })
      .filter(product => product.prices && product.prices.length > 0);
  };

  // Calculate annual savings percentage for a product
  const calculateAnnualSavings = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.prices)
      return 0;

    const monthlyPrice = product.prices.find(p => p.interval === 'month');
    const yearlyPrice = product.prices.find(p => p.interval === 'year');

    if (!monthlyPrice || !yearlyPrice)
      return 0;

    const monthlyYearlyCost = monthlyPrice.unitAmount * 12;
    const yearlyCost = yearlyPrice.unitAmount;
    const savings = ((monthlyYearlyCost - yearlyCost) / monthlyYearlyCost) * 100;

    return Math.round(savings);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-destructive">{t('common.error')}</p>
          <p className="text-xs text-muted-foreground">{t('plans.errorDescription')}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t('states.error.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscription Banner */}
      {showSubscriptionBanner && activeSubscription && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center gap-3 py-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{t('billing.currentPlan')}</p>
              <p className="text-xs text-muted-foreground">
                {activeSubscription.currentPeriodEnd
                  && `${t('billing.renewsOn')} ${new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase">
                {activeSubscription.status}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onManageBilling}
                className="gap-2"
              >
                {t('billing.manageBilling')}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Content */}
      <Tabs
        value={selectedInterval}
        onValueChange={value => setSelectedInterval(value as BillingInterval)}
        className="space-y-8"
      >
        {/* Billing Interval Toggle */}
        <div className="flex justify-center">
          <TabsList>
            <TabsTrigger value="month">
              {t('billing.interval.monthly')}
            </TabsTrigger>
            <TabsTrigger value="year">
              {t('billing.interval.annual')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Monthly Plans */}
        <TabsContent value="month">
          <ProductGrid
            products={getProductsForInterval('month')}
            interval="month"
            hasActiveSubscription={hasActiveSubscription}
            getSubscriptionForProduct={getSubscriptionForProduct}
            hasAnyActiveSubscription={hasAnyActiveSubscription}
            processingPriceId={processingPriceId}
            onSubscribe={onSubscribe}
            onCancel={onCancel}
            isProcessing={isProcessing}
            calculateAnnualSavings={calculateAnnualSavings}
            t={t}
          />
        </TabsContent>

        {/* Annual Plans */}
        <TabsContent value="year">
          <ProductGrid
            products={getProductsForInterval('year')}
            interval="year"
            hasActiveSubscription={hasActiveSubscription}
            getSubscriptionForProduct={getSubscriptionForProduct}
            hasAnyActiveSubscription={hasAnyActiveSubscription}
            processingPriceId={processingPriceId}
            onSubscribe={onSubscribe}
            onCancel={onCancel}
            isProcessing={isProcessing}
            calculateAnnualSavings={calculateAnnualSavings}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Product Grid Component
type ProductGridProps = {
  products: Product[];
  interval: BillingInterval;
  hasActiveSubscription: (productId: string) => boolean;
  getSubscriptionForProduct: (productId: string) => Subscription | undefined;
  hasAnyActiveSubscription: boolean;
  processingPriceId: string | null;
  onSubscribe: (priceId: string) => void | Promise<void>;
  onCancel: (subscriptionId: string) => void | Promise<void>;
  isProcessing: boolean;
  calculateAnnualSavings: (productId: string) => number;
  t: (key: string) => string;
};

function ProductGrid({
  products,
  interval,
  hasActiveSubscription,
  getSubscriptionForProduct,
  hasAnyActiveSubscription,
  processingPriceId,
  onSubscribe,
  onCancel,
  isProcessing: _isProcessing,
  calculateAnnualSavings,
  t,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <p className="text-sm text-muted-foreground">
          {t('billing.noPlansForInterval')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => {
        const subscription = getSubscriptionForProduct(product.id);
        const hasSubscription = hasActiveSubscription(product.id);
        const price = product.prices?.[0]; // Get first price for this interval

        if (!price) {
          return null; // Skip products without prices for this interval
        }

        // Determine if this is the most popular plan (middle card for 3 plans)
        const isMostPopular = products.length === 3 && index === 1;

        return (
          <PricingCard
            key={product.id}
            name={product.name}
            description={product.description}
            price={{
              amount: price.unitAmount,
              currency: price.currency,
              interval,
              trialDays: price.trialPeriodDays,
            }}
            features={product.features}
            isCurrentPlan={hasSubscription}
            isMostPopular={isMostPopular}
            isProcessing={processingPriceId === price.id}
            hasOtherSubscription={hasAnyActiveSubscription && !hasSubscription}
            onSubscribe={() => onSubscribe(price.id)}
            onCancel={subscription ? () => onCancel(subscription.id) : undefined}
            delay={index * 0.1}
            annualSavingsPercent={interval === 'year' ? calculateAnnualSavings(product.id) : undefined}
          />
        );
      })}
    </div>
  );
}
