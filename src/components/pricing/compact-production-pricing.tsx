'use client';

import { Check } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatTomanCurrency } from '@/lib/utils/currency';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  metadata: unknown;
  isActive: boolean;
};

type ProductCardProps = {
  product: Product;
  onSelect: (productId: string) => void;
  className?: string;
};

type CompactProductionPricingProps = {
  products: Product[];
  onPlanSelect: (productId: string) => void;
  className?: string;
};

function CompactProductCard({
  product,
  onSelect,
  className,
}: ProductCardProps) {
  const metadata = product.metadata as {
    pricing?: {
      usdPrice: number;
      tomanPrice: number;
      rialPrice: number;
      formattedPrice: string;
    };
    popular?: boolean;
    features?: string[];
    tier?: string;
    messagesPerMonth?: number;
    aiModelsLimit?: number;
    conversationsPerMonth?: number;
    badgeText?: string;
  } | null;

  const pricing = metadata?.pricing;
  const isPopular = metadata?.popular === true;
  const features = metadata?.features || [];
  const isFree = product.price === 0;

  // Enhanced features for better display
  const displayFeatures = features.length > 0
    ? features
    : [
        isFree ? 'Basic features' : 'All features included',
        isFree ? 'Community support' : 'Priority support',
        isFree ? 'Limited usage' : 'Advanced analytics',
        'API access',
        'Regular updates',
      ];

  return (
    <Card
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 hover:shadow-lg',
        isPopular && 'border-primary shadow-md ring-2 ring-primary/20 scale-105',
        className,
      )}
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="default" className="bg-primary text-primary-foreground px-3 py-1">
            {metadata?.badgeText || 'Most Popular'}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 space-y-3 px-4 pt-5">
        <div className="space-y-1.5">
          <CardTitle className="text-base font-semibold text-center">
            {product.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground text-center line-clamp-2">
            {product.description || `Perfect ${product.name.toLowerCase()} solution for your needs`}
          </p>
        </div>

        {/* Pricing Display */}
        <div className="text-center space-y-1">
          {isFree
            ? (
                <div>
                  <div className="text-xl font-bold">Free</div>
                  <div className="text-xs text-muted-foreground">Forever</div>
                </div>
              )
            : pricing?.tomanPrice
              ? (
                  <div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl font-bold">
                        {pricing.tomanPrice.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-muted-foreground">Toman</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per month ($
                      {pricing.usdPrice || 0}
                      {' '}
                      USD)
                    </div>
                  </div>
                )
              : (
                  <div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl font-bold">
                        {formatTomanCurrency(product.price)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">per month</div>
                  </div>
                )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 px-4 pb-4">
        {/* CTA Button */}
        <Button
          onClick={() => onSelect(product.id)}
          className={cn(
            'w-full h-8 text-xs',
            isPopular && 'bg-primary hover:bg-primary/90',
          )}
          variant={isPopular ? 'default' : 'outline'}
        >
          {isFree ? 'Get Started Free' : 'Choose Plan'}
        </Button>

        {/* Features List - Compact */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground border-b border-border pb-1">
            What's included:
          </div>
          <div className="space-y-1.5">
            {displayFeatures.slice(0, 4).map(feature => (
              <div key={feature} className="flex items-start gap-1.5">
                <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-foreground">
                  {feature}
                </span>
              </div>
            ))}
            {displayFeatures.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +
                {displayFeatures.length - 4}
                {' '}
                more features
              </div>
            )}
          </div>
        </div>

        {/* Usage Metrics - Ultra Compact */}
        {(metadata?.messagesPerMonth || metadata?.aiModelsLimit || metadata?.conversationsPerMonth) && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground">Limits:</div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              {metadata?.messagesPerMonth && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-muted-foreground/40 rounded-full flex-shrink-0" />
                  <span>
                    {metadata.messagesPerMonth.toLocaleString()}
                    /mo
                  </span>
                </div>
              )}
              {metadata?.aiModelsLimit && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-muted-foreground/40 rounded-full flex-shrink-0" />
                  <span>
                    {metadata.aiModelsLimit}
                    {' '}
                    models
                  </span>
                </div>
              )}
              {metadata?.conversationsPerMonth && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-muted-foreground/40 rounded-full flex-shrink-0" />
                  <span>
                    {metadata.conversationsPerMonth}
                    /mo
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CompactProductionPricing({
  products,
  onPlanSelect,
  className,
}: CompactProductionPricingProps) {
  // Sort products: free first, then by price, with popular plans getting priority
  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => {
      const aMetadata = a.metadata as { popular?: boolean } | null;
      const bMetadata = b.metadata as { popular?: boolean } | null;

      // Free products first
      if (a.price === 0 && b.price !== 0)
        return -1;
      if (a.price !== 0 && b.price === 0)
        return 1;

      // Popular products get priority
      if (aMetadata?.popular && !bMetadata?.popular)
        return -1;
      if (!aMetadata?.popular && bMetadata?.popular)
        return 1;

      // Then by price
      return a.price - b.price;
    });
  }, [products]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <h3 className="text-3xl font-bold text-foreground">
          Choose your plan
        </h3>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          All prices calculated with live exchange rates. Start free and upgrade as you grow.
        </p>
      </div>

      {/* 4-Column Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-6xl mx-auto px-4">
        {sortedProducts.map(product => (
          <CompactProductCard
            key={product.id}
            product={product}
            onSelect={onPlanSelect}
            className="max-w-none"
          />
        ))}
      </div>
    </div>
  );
}
