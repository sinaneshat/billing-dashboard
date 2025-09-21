'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { SetupBankAuthorizationButton } from '@/components/billing/setup-bank-authorization-button';
import type { Product } from '@/db/validation/billing';
import { cn } from '@/lib/ui/cn';

import type { PlanData } from './unified';
import { BillingDisplayContainer, mapPlanToContent } from './unified';

type PricingPlansProps = {
  products: Product[];
  onPlanSelect: (productId: string) => void;
  className?: string;
  contractStatus?: string;
  contractMessage?: string;
  canMakePayments?: boolean;
};

export function PricingPlans({
  products,
  onPlanSelect,
  className,
  contractStatus: _contractStatus,
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

  // Handle plan selection with custom logic for non-payment cases
  const handlePlanSelect = (product: Product) => {
    const isFree = product.price === 0;

    if (isFree) {
      // Free plans are already "active", no action needed
      return;
    }

    if (!canMakePayments) {
      // This will be handled by the SetupBankAuthorizationButton within the content
      return;
    }

    // Normal plan selection
    onPlanSelect(product.id);
  };

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
      <BillingDisplayContainer
        data={sortedProducts}
        isLoading={false}
        dataType="plan"
        variant="card"
        size="md"
        columns="auto"
        gap="md"
        mapItem={(product: Product) => {
          const isRecommended = product.id === recommendedPlanId;
          const isFree = product.price === 0;

          // For non-payment cases, inject the SetupBankAuthorizationButton
          let primaryAction: import('./unified').ActionConfig | undefined;
          if (isFree) {
            primaryAction = {
              label: t('status.active'),
              variant: 'outline',
              disabled: true,
            };
          } else if (!canMakePayments) {
            // We'll handle this with a custom button in contentExtra
            primaryAction = undefined;
          } else {
            primaryAction = {
              label: t('actions.choosePlan'),
              variant: isRecommended ? 'default' : 'outline',
              onClick: () => handlePlanSelect(product),
            };
          }

          const content = mapPlanToContent(
            product as PlanData,
            t,
            primaryAction ? () => handlePlanSelect(product) : undefined,
            canMakePayments,
            contractMessage,
          );

          // Override the primary action
          content.primaryAction = primaryAction;

          // Add SetupBankAuthorizationButton for non-payment cases
          if (!canMakePayments && !isFree) {
            content.contentExtra = (
              <div className="pt-4">
                <SetupBankAuthorizationButton
                  source="plans"
                  productId={product.id}
                  productName={product.name}
                  productPrice={product.price}
                  variant={isRecommended ? 'default' : 'outline'}
                  size="lg"
                  className="w-full h-11 font-medium shadow-sm transition-all"
                  hideIcon={true}
                />
              </div>
            );
          }

          // Add popular badge for recommended plans
          if (isRecommended) {
            content.badge = {
              variant: 'default',
              label: typeof product.metadata === 'object' && product.metadata && 'badgeText' in product.metadata
                ? (product.metadata.badgeText as string)
                : t('plans.mostPopular'),
            };
          }

          return content;
        }}
        onItemClick={product => handlePlanSelect(product)}
      />
    </div>
  );
}
