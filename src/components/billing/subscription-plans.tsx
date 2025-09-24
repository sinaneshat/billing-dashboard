'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { PricingPlans } from '@/components/billing/pricing-plans';
import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { useCreateSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { useDirectDebitContract } from '@/hooks/queries/direct-debit';
import { useProductsQuery } from '@/hooks/queries/products';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { toastManager } from '@/lib/toast/toast-manager';

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
  const { data: currentSubscription } = useCurrentSubscriptionQuery();

  // Extract and sort products by price
  const sortedProducts = useMemo(() => {
    return [...(products?.data || [])].sort((a, b) => a.price - b.price);
  }, [products]);

  const createSubscription = useCreateSubscriptionMutation();

  // eslint-disable-next-line ts/no-explicit-any
  const handleCreateSubscription = useCallback(async (product: any) => {
    try {
      if (!directDebitContract.data?.contractId) {
        toastManager.error(t('subscription.noValidContract'));
        return;
      }

      const result = await createSubscription.mutateAsync({
        json: {
          productId: product.id,
          contractId: directDebitContract.data.contractId,
          paymentMethod: 'direct-debit-contract' as const,
          enableAutoRenew: true,
        },
      });

      if (result.success) {
        if (result.data.immediateBilling && result.data.paymentProcessed) {
          toastManager.success(t('subscription.createSuccessWithPayment', {
            amount: result.data.chargedAmount?.toLocaleString() || '0',
            refId: result.data.zarinpalRefId || '',
          }));
        } else {
          toastManager.success(t('subscription.createSuccess'));
        }
      } else {
        toastManager.error(t('subscription.createFailed'));
      }
    } catch (error: unknown) {
      // Enhanced error handling for payment failures
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message).toLowerCase();

        if (errorMessage.includes('payment failed') || errorMessage.includes('insufficient funds')) {
          toastManager.error(t('subscription.paymentFailedInsufficientFunds'));
        } else if (errorMessage.includes('payment method') || errorMessage.includes('contract')) {
          toastManager.error(t('subscription.paymentMethodError'));
        } else if (errorMessage.includes('payment')) {
          toastManager.error(t('subscription.paymentFailed'));
        } else {
          toastManager.error(t('subscription.createFailed'));
        }
      } else {
        toastManager.error(t('subscription.createFailed'));
      }
    }
  }, [createSubscription, directDebitContract.data?.contractId, t]);

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
        products={sortedProducts as any} // eslint-disable-line ts/no-explicit-any
        onPlanSelect={handlePlanSelect}
        contractStatus={directDebitContract.data?.status}
        contractMessage={directDebitContract.data?.message}
        canMakePayments={directDebitContract.data?.canMakePayments}
        currentSubscription={currentSubscription}
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
