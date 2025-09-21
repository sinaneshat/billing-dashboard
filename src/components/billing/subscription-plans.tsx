'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo } from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import { PricingPlans } from '@/components/billing/pricing-plans';
import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import type { Product } from '@/db/validation/billing';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useDirectDebitContract } from '@/hooks/queries/direct-debit';
import { useProductsQuery } from '@/hooks/queries/products';
import { toastManager } from '@/lib/toast/toast-manager';
import { getEnvironmentVariables } from '@/utils';

/**
 * Subscription Plans Component
 *
 * Displays available subscription plans with proper ZarinPal direct debit flow.
 * Key features:
 * - Validates direct debit contract before allowing plan selection
 * - Guides users through contract setup if needed
 * - Only allows subscription creation with valid contracts
 * - Provides clear messaging about contract requirements
 *
 * @returns JSX element containing the subscription plans interface
 */
export function SubscriptionPlans() {
  const t = useTranslations();
  const router = useRouter();
  const { data: products, isLoading, error, refetch } = useProductsQuery();
  const directDebitContract = useDirectDebitContract();

  // Extract and sort products by price
  const sortedProducts = useMemo(() => {
    const data = products as ApiResponse<Product[]> | undefined;
    const productList = data?.success && Array.isArray(data.data) ? data.data : [];
    return [...productList].sort((a, b) => a.price - b.price);
  }, [products]);

  const createSubscription = useCreateSubscriptionMutation();

  const handleCreateSubscription = useCallback(async (product: Product) => {
    const { callbackUrl } = getEnvironmentVariables();

    try {
      const result = await createSubscription.mutateAsync({
        json: {
          productId: product.id,
          callbackUrl: callbackUrl || `${window.location.origin}/payment/callback`,
        },
      });

      if (result.success) {
        toastManager.success(t('subscription.createSuccess'));
      } else {
        toastManager.error(t('subscription.createFailed'));
      }
    } catch {
      toastManager.error(t('subscription.createFailed'));
    }
  }, [createSubscription, t]);

  const handlePlanSelect = useCallback((productId: string) => {
    const product = sortedProducts.find(p => p.id === productId);
    if (!product) {
      toastManager.error(t('subscription.productNotFound'));
      return;
    }

    // Check if user has valid direct debit contract
    if (!directDebitContract.data?.canMakePayments) {
      // Navigate to intercepted route for bank setup with product context
      const params = new URLSearchParams({
        productId: product.id,
        productName: product.name,
        productPrice: product.price.toString(),
      });
      router.push(`/dashboard/billing/plans/setup?${params.toString()}`);
      return;
    }

    // Contract is valid, proceed with subscription creation
    handleCreateSubscription(product);
  }, [sortedProducts, directDebitContract, handleCreateSubscription, t, router]);

  if (isLoading) {
    return (
      <LoadingState
        variant="card"
        style="dashed"
        size="lg"
        title={t('states.loading.products')}
        message={t('states.loading.please_wait')}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('states.error.default')}
        description={t('states.error.networkDescription')}
        onRetry={() => refetch()}
        variant="card"
      />
    );
  }

  if (sortedProducts.length > 0) {
    return (
      <PricingPlans
        products={sortedProducts}
        onPlanSelect={handlePlanSelect}
        contractStatus={directDebitContract.data?.status}
        contractMessage={directDebitContract.data?.message}
        canMakePayments={directDebitContract.data?.canMakePayments}
      />
    );
  }

  return (
    <EmptyState
      title={t('subscription.noPlans')}
      description={t('empty.plansDescription')}
      variant="plans"
      size="lg"
      style="gradient"
    />
  );
}
