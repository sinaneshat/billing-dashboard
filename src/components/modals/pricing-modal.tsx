'use client';

import { useTranslations } from 'next-intl';

import { PricingContent } from '@/components/pricing/pricing-content';

import { BaseModal } from './base-modal';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  prices?: Array<{
    id: string;
    currency: string;
    unitAmount: number;
    interval?: string | null;
    trialPeriodDays?: number | null;
  }>;
  features?: string[] | null;
};

type Subscription = {
  id: string;
  status: string;
  priceId: string;
  productId: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
};

type PricingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  subscriptions: Subscription[];
  isLoading?: boolean;
  processingPriceId: string | null;
  cancelingSubscriptionId: string | null;
  isManagingBilling: boolean;
  onSubscribe: (priceId: string) => Promise<void>;
  onCancel: (subscriptionId: string) => Promise<void>;
  onManageBilling: () => void;
};

/**
 * Pricing Modal Component
 *
 * Displays available products with pricing and subscription management in a modal dialog.
 * Uses the shared PricingContent component to ensure consistency with the standalone pricing page.
 *
 * @param props - Component props
 * @param props.open - Controls modal visibility
 * @param props.onOpenChange - Callback when modal visibility changes
 * @param props.products - Array of available products
 * @param props.subscriptions - Array of user subscriptions
 * @param props.isLoading - Loading state for products
 * @param props.processingPriceId - Price ID being processed
 * @param props.onSubscribe - Callback when user subscribes to a product
 * @param props.onCancel - Callback when user cancels a subscription
 * @param props.onManageBilling - Callback to open Stripe customer portal
 */
export function PricingModal({
  open,
  onOpenChange,
  products,
  subscriptions,
  isLoading,
  processingPriceId,
  cancelingSubscriptionId,
  isManagingBilling,
  onSubscribe,
  onCancel,
  onManageBilling,
}: PricingModalProps) {
  const t = useTranslations();

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('pricing.modal.title')}
      description={t('pricing.modal.description')}
      size="xl"
    >
      <PricingContent
        products={products}
        subscriptions={subscriptions}
        isLoading={isLoading}
        error={null}
        processingPriceId={processingPriceId}
        cancelingSubscriptionId={cancelingSubscriptionId}
        isManagingBilling={isManagingBilling}
        onSubscribe={onSubscribe}
        onCancel={onCancel}
        onManageBilling={onManageBilling}
        showSubscriptionBanner={false}
      />
    </BaseModal>
  );
}
