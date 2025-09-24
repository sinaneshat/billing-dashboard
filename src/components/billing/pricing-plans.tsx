'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { Product } from '@/api/routes/products/schema';
import type { SubscriptionWithProduct } from '@/api/routes/subscriptions/schema';
import { SetupBankAuthorizationButton } from '@/components/billing/setup-bank-authorization-button';
import { Button } from '@/components/ui/button';
import { useCancelSubscriptionMutation, useChangePlanMutation } from '@/hooks/mutations/subscriptions';
import { toastManager } from '@/lib/toast/toast-manager';
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
  currentSubscription?: SubscriptionWithProduct | null;
};

export function PricingPlans({
  products,
  onPlanSelect,
  className,
  contractStatus: _contractStatus,
  contractMessage,
  canMakePayments = false,
  currentSubscription,
}: PricingPlansProps) {
  const t = useTranslations();
  const locale = useLocale();
  const cancelSubscription = useCancelSubscriptionMutation();
  const changePlan = useChangePlanMutation();

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

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!currentSubscription?.id) {
      toastManager.error(t('subscription.noActiveSubscription'));
      return;
    }

    try {
      await cancelSubscription.mutateAsync({
        param: { id: currentSubscription.id },
        json: { reason: t('subscription.cancelledByUser') },
      });
      toastManager.success(t('subscription.cancelSuccess'));
    } catch {
      toastManager.error(t('subscription.cancelFailed'));
    }
  };

  // Handle plan upgrade/downgrade
  const handleChangePlan = async (productId: string) => {
    if (!currentSubscription?.id) {
      toastManager.error(t('subscription.noActiveSubscription'));
      return;
    }

    try {
      await changePlan.mutateAsync({
        param: { id: currentSubscription.id },
        json: { productId },
      });
      toastManager.success(t('subscription.planChangeSuccess'));
    } catch {
      toastManager.error(t('subscription.planChangeFailed'));
    }
  };

  // Handle plan selection - simplified with free plan logic removed
  const handlePlanSelect = (product: Product) => {
    const isFree = product.price === 0;
    const hasActiveSubscription = currentSubscription?.status === 'active';

    // Free plans never trigger actions - always just show "Active"
    if (isFree) {
      return;
    }

    if (!canMakePayments) {
      // This will be handled by the SetupBankAuthorizationButton within the content
      return;
    }

    if (hasActiveSubscription) {
      // User has active subscription - upgrade/downgrade
      handleChangePlan(product.id);
    } else {
      // New subscription creation
      onPlanSelect(product.id);
    }
  };

  return (
    <div className={cn('space-y-12', className)}>
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
        columns={2}
        gap="lg"
        mapItem={(product: Product) => {
          const isRecommended = product.id === recommendedPlanId;
          const isFree = product.price === 0;
          // Fix: Current subscription has nested product object, compare with product.id
          const isCurrentPlan = currentSubscription?.product?.id === product.id || currentSubscription?.productId === product.id;
          const hasActiveSubscription = currentSubscription?.status === 'active';

          // Determine the primary action based on current subscription status
          let primaryAction: import('./unified').ActionConfig | undefined;

          if (isCurrentPlan && hasActiveSubscription) {
            // User is on this plan - show "Current Plan"
            primaryAction = {
              label: t('status.currentPlan'),
              variant: 'default',
              disabled: true,
            };
          } else if (isFree) {
            // Free plans are always "Active" and never clickable - simplifies logic significantly
            primaryAction = {
              label: t('status.active'),
              variant: 'outline',
              disabled: true,
              onClick: undefined,
            };
          } else if (!canMakePayments) {
            // We'll handle this with a custom button in contentExtra
            primaryAction = undefined;
          } else if (hasActiveSubscription) {
            // User has a subscription - show upgrade/downgrade
            const currentProductId = currentSubscription?.product?.id || currentSubscription?.productId;
            const currentPrice = products.find(p => p.id === currentProductId)?.price || 0;
            const isUpgrade = product.price > currentPrice;
            primaryAction = {
              label: isUpgrade ? t('actions.upgrade') : t('actions.downgrade'),
              variant: isUpgrade ? 'default' : 'outline',
              onClick: () => handlePlanSelect(product),
            };
          } else {
            // No subscription - show choose plan
            primaryAction = {
              label: t('actions.choosePlan'),
              variant: isRecommended ? 'default' : 'outline',
              onClick: () => handlePlanSelect(product),
            };
          }

          const content = mapPlanToContent(
            product as PlanData,
            t,
            locale,
            undefined, // Remove click handler - only buttons should be clickable
            canMakePayments,
            contractMessage,
          );

          // Override the primary action
          content.primaryAction = primaryAction;

          // Handle content extra based on priority
          if (isCurrentPlan && hasActiveSubscription && !isFree) {
            // Priority 1: Cancel button for current active plan
            content.contentExtra = (
              <div className="pt-4">
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full h-11 font-medium shadow-sm transition-all"
                  onClick={handleCancelSubscription}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending ? t('actions.cancelling') : t('actions.cancel')}
                </Button>
              </div>
            );
          } else if (!canMakePayments && !isFree && !hasActiveSubscription) {
            // Priority 2: Setup button only if no active subscription and can't make payments
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

          // Add badge - current plan takes priority over popular
          if (isCurrentPlan && hasActiveSubscription) {
            content.badge = {
              variant: 'secondary',
              label: t('status.current'),
            };
          } else if (isRecommended && !isCurrentPlan) {
            // Only show popular badge if it's not the current plan
            content.badge = {
              variant: 'default',
              label: typeof product.metadata === 'object' && product.metadata && 'badgeText' in product.metadata
                ? (product.metadata.badgeText as string)
                : t('plans.mostPopular'),
            };
          }

          return content;
        }}
      />
    </div>
  );
}
