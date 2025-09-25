'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { PricingPlans } from '@/components/billing/pricing-plans';
import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { useCreateSubscriptionMutation, useSwitchSubscriptionMutation } from '@/hooks/mutations/subscriptions';
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
  const switchSubscription = useSwitchSubscriptionMutation();

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

  // eslint-disable-next-line ts/no-explicit-any
  const handleSwitchSubscription = useCallback(async (product: any) => {
    try {
      if (!currentSubscription?.id) {
        toastManager.error(t('subscription.noActiveSubscription'));
        return;
      }

      if (currentSubscription.productId === product.id) {
        toastManager.error(t('subscription.alreadyOnThisPlan'));
        return;
      }

      const result = await switchSubscription.mutateAsync({
        json: {
          newProductId: product.id,
          effectiveDate: 'immediate' as const,
          confirmProration: true,
        },
      } as Parameters<typeof switchSubscription.mutateAsync>[0]);

      if ('success' in result && result.success) {
        const data = 'data' in result ? result.data : null;
        const netAmount = (data && 'netAmount' in data) ? (data as { netAmount: number }).netAmount : 0;
        const isUpgrade = netAmount > 0;
        const isDowngrade = netAmount < 0;
        const isEvenSwitch = netAmount === 0;

        if (isUpgrade) {
          toastManager.success(t('subscription.switchSuccessUpgrade', {
            planName: product.name,
            amount: Math.abs(netAmount).toLocaleString(),
          }));
        } else if (isDowngrade) {
          toastManager.success(t('subscription.switchSuccessDowngrade', {
            planName: product.name,
            creditAmount: Math.abs(netAmount).toLocaleString(),
          }));
        } else if (isEvenSwitch) {
          toastManager.success(t('subscription.switchSuccessEven', {
            planName: product.name,
          }));
        } else {
          toastManager.success(t('subscription.switchSuccess', {
            planName: product.name,
          }));
        }
      } else {
        toastManager.error(t('subscription.switchFailed'));
      }
    } catch (error: unknown) {
      // Enhanced error handling for switch failures
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message).toLowerCase();

        if (errorMessage.includes('payment failed') || errorMessage.includes('insufficient funds')) {
          toastManager.error(t('subscription.switchFailedInsufficientFunds'));
        } else if (errorMessage.includes('already has active subscription')) {
          toastManager.error(t('subscription.alreadyHasActiveSubscription'));
        } else if (errorMessage.includes('same product') || errorMessage.includes('already on')) {
          toastManager.error(t('subscription.alreadyOnThisPlan'));
        } else if (errorMessage.includes('contract') || errorMessage.includes('payment method')) {
          toastManager.error(t('subscription.paymentMethodError'));
        } else {
          toastManager.error(t('subscription.switchFailed'));
        }
      } else {
        toastManager.error(t('subscription.switchFailed'));
      }
    }
  }, [switchSubscription, currentSubscription, t]);

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

    // Determine action based on current subscription status
    const hasActiveSubscription = currentSubscription?.status === 'active';

    if (hasActiveSubscription) {
      // User has active subscription - switch to new plan
      handleSwitchSubscription(product);
    } else {
      // No active subscription - create new subscription
      handleCreateSubscription(product);
    }
  }, [sortedProducts, directDebitContract, currentSubscription, handleCreateSubscription, handleSwitchSubscription, t, router]);

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
