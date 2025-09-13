'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { cn } from '@/lib';

import { ShadcnPricingCard } from './shadcn-pricing-card';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  metadata: unknown; // Database JSON metadata - can be any structure
};

type ShadcnPricingTableProps = {
  products: Product[];
  onPlanSelect: (productId: string) => void;
  className?: string;
};

export function ShadcnPricingTable({
  products,
  onPlanSelect,
  className,
}: ShadcnPricingTableProps) {
  const t = useTranslations();
  // Sort products by price (USD) - free first, then ascending
  const sortedProducts = [...products].sort((a, b) => {
    const metaA = a.metadata as { pricing?: { usdPrice: number } } | null;
    const metaB = b.metadata as { pricing?: { usdPrice: number } } | null;
    const priceA = metaA?.pricing?.usdPrice || 0;
    const priceB = metaB?.pricing?.usdPrice || 0;
    return priceA - priceB;
  });

  if (products.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <h3 className="text-xl font-semibold text-muted-foreground mb-4">
          {t('plans.noPlansAvailable')}
        </h3>
        <p className="text-muted-foreground">
          {t('plans.checkBackLater')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('plans.choosePlanTitle')}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('plans.selectPerfectPlanDescription')}
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {sortedProducts.map((product, index) => (
          <ShadcnPricingCard
            key={product.id}
            product={product}
            onSelect={onPlanSelect}
            className={cn(
              'h-full',
              // Add slight delay for animation
              `animate-fade-in-up`,
              `delay-${index * 100}`,
            )}
          />
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          {t('plans.allPlansInclude')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('plans.pricesInToman')}
        </p>
      </div>
    </div>
  );
}
