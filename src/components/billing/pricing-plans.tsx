'use client';

import { Check, Crown, Star, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { SetupBankAuthorizationButton } from '@/components/billing/setup-bank-authorization-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Product } from '@/db/validation/billing';
import { cn } from '@/lib/ui/cn';

type PricingPlansProps = {
  products: Product[];
  onPlanSelect: (productId: string) => void;
  className?: string;
  contractStatus?: string;
  contractMessage?: string;
  canMakePayments?: boolean;
};

type ProductCardProps = {
  product: Product;
  onSelect: (productId: string) => void;
  className?: string;
  isRecommended?: boolean;
  contractStatus?: string;
  canMakePayments?: boolean;
  contractMessage?: string;
};

function ProductCard({
  product,
  onSelect,
  className,
  isRecommended = false,
  contractStatus: _contractStatus,
  canMakePayments = false,
  contractMessage,
}: ProductCardProps) {
  const t = useTranslations();

  // Parse metadata with proper typing
  const metadata = useMemo(() => {
    try {
      return product.metadata as {
        popular?: boolean;
        features?: string[];
        tier?: string;
        messagesPerMonth?: number;
        aiModelsLimit?: number;
        conversationsPerMonth?: number;
        badgeText?: string;
      } | null;
    } catch {
      return null;
    }
  }, [product.metadata]);

  const isPopular = metadata?.popular === true || isRecommended;
  const isFree = product.price === 0;
  const isPro = product.name.toLowerCase().includes('pro');
  const isPower = product.name.toLowerCase().includes('power');

  // Get plan-specific features from i18n
  const features = useMemo(() => {
    if (metadata?.features && metadata.features.length > 0) {
      return metadata.features;
    }

    // Use i18n keys for features based on plan type
    const planType = isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter';
    const baseKey = `plans.pricing.${planType}`;

    return [
      t(`${baseKey}.features.messagesPerMonth`),
      t(`${baseKey}.features.aiModels`),
      t(`${baseKey}.features.conversationsPerMonth`),
      ...(isFree ? [t(`${baseKey}.features.basicSupport`)] : [t(`${baseKey}.features.premiumModels`)]),
    ];
  }, [metadata?.features, isFree, isPro, isPower, t]);

  const planIcon = useMemo(() => {
    if (isPower)
      return <Zap className="h-5 w-5" />;
    if (isPro)
      return <Crown className="h-5 w-5" />;
    if (isPopular)
      return <Star className="h-5 w-5" />;
    return null;
  }, [isPower, isPro, isPopular]);

  const getButtonContent = () => {
    if (isFree) {
      return (
        <Button
          disabled
          className="w-full h-11 font-medium"
          variant="outline"
          size="lg"
        >
          {t('status.active')}
        </Button>
      );
    }

    if (!canMakePayments) {
      return (
        <SetupBankAuthorizationButton
          source="plans"
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          variant={isPopular ? 'default' : 'outline'}
          size="lg"
          className="w-full h-11 font-medium"
        />
      );
    }

    return (
      <Button
        onClick={() => onSelect(product.id)}
        className="w-full h-11 font-medium"
        variant={isPopular ? 'default' : 'outline'}
        size="lg"
      >
        {t('actions.choosePlan')}
      </Button>
    );
  };

  return (
    <Card
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 hover:shadow-lg',
        {
          'border-2 border-primary': isPopular,
          'border border-border': !isPopular,
        },
        className,
      )}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="default" className="px-3 py-1 text-xs font-medium">
            {metadata?.badgeText || (isPower ? t('plans.bestValue') : t('plans.mostPopular'))}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 space-y-4 text-center">
        {/* Plan Icon & Name */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {planIcon}
            <h3 className="text-xl font-bold">{product.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {product.description || t(`plans.pricing.${isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter'}.description`)}
          </p>
        </div>

        {/* Pricing */}
        <div className="space-y-1">
          {isFree
            ? (
                <>
                  <div className="text-3xl font-bold">{t('plans.free')}</div>
                  <div className="text-sm text-muted-foreground">{t('time.forever')}</div>
                </>
              )
            : (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">
                      {product.price.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-lg text-muted-foreground">{t('pricing.currency')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('time.perMonth')}
                  </div>
                </>
              )}
        </div>

        {/* CTA Button */}
        {getButtonContent()}

        {/* Contract Status Message */}
        {!canMakePayments && !isFree && contractMessage && (
          <div className="text-xs text-muted-foreground text-center px-2">
            {contractMessage}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Features List */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3 border-b pb-2">
            {t('plans.whatsIncluded')}
          </div>
          <div className="space-y-2">
            {features.map(feature => (
              <div key={`${product.id}-${feature.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}`} className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span className="text-sm text-foreground leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

export function PricingPlans({
  products,
  onPlanSelect,
  className,
  contractStatus,
  contractMessage,
  canMakePayments = false,
}: PricingPlansProps) {
  const t = useTranslations();

  // Sort products: Free first, then by price
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      // Free products first
      if (a.price === 0 && b.price !== 0)
        return -1;
      if (a.price !== 0 && b.price === 0)
        return 1;

      // Then by price
      return a.price - b.price;
    });
  }, [products]);

  // Identify recommended plan (typically Pro)
  const recommendedPlanId = useMemo(() => {
    const proPlan = sortedProducts.find(p => p.name.toLowerCase().includes('pro'));
    return proPlan?.id;
  }, [sortedProducts]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {t('plans.chooseYourPlan')}
          </h2>
          <p className="text-muted-foreground">
            {t('plans.selectPerfectPlanDescription')}
          </p>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {sortedProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onPlanSelect}
            isRecommended={product.id === recommendedPlanId}
            contractStatus={contractStatus}
            canMakePayments={canMakePayments}
            contractMessage={contractMessage}
          />
        ))}
      </div>
    </div>
  );
}
