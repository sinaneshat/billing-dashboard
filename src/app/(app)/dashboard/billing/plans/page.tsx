import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import { SubscriptionPlansScreen } from '@/containers/screens/dashboard/billing';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import {
  getProductsService,
  getSubscriptionsService,
} from '@/services/api';

type PlansPageProps = {
  searchParams: {
    product?: string;
    price?: string;
    billing?: string;
    step?: string;
  };
};

/**
 * Server-side product resolution using database data
 * No hardcoding - always queries the real product data from API
 */
async function resolveProductFromParams(
  productParam?: string,
  priceParam?: string,
): Promise<string | null> {
  if (!productParam && !priceParam)
    return null;

  try {
    // Get products from API (which queries the database)
    const productsResponse = await getProductsService();

    if (!productsResponse.success || !Array.isArray(productsResponse.data)) {
      return null;
    }

    // Extract products from API response - they include serialized dates as strings
    const products = productsResponse.data;

    // First, check if the product parameter is a direct product ID
    if (productParam) {
      const directMatch = products.find(p => p.id === productParam);
      if (directMatch) {
        return directMatch.id;
      }
    }

    // Then, check if the price parameter is a Stripe price ID
    if (priceParam) {
      const priceMatch = products.find(p => p.stripePriceId === priceParam);
      if (priceMatch) {
        return priceMatch.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to resolve product from params:', error);
    return null;
  }
}

/**
 * Subscription Plans Page - Server Component
 * Database-driven SSO flow with no hardcoded product data
 * All product resolution happens server-side using real database data
 */
export default async function PlansPage(props: PlansPageProps) {
  const searchParams = await props.searchParams;
  const { product, price, billing, step } = searchParams;

  const queryClient = getQueryClient();

  // Resolve product ID using database data (server-side)
  const resolvedProductId = await resolveProductFromParams(product, price);

  // Prefetch products and subscriptions with resolved data
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list,
      queryFn: getProductsService,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscriptions.list,
      queryFn: getSubscriptionsService,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
  ]);

  // Auto-advance to payment step if valid product is resolved
  if (resolvedProductId && !step) {
    const paymentParams = new URLSearchParams();
    paymentParams.set('product', resolvedProductId);
    paymentParams.set('step', 'payment');

    if (price)
      paymentParams.set('price', price);
    if (billing)
      paymentParams.set('billing', billing);

    redirect(`/dashboard/billing/plans?${paymentParams.toString()}`);
  }

  // Determine flow state based on resolved data
  const initialStep = resolvedProductId && step === 'payment'
    ? 'payment'
    : step === 'confirmation' ? 'confirmation' : 'plans';

  const ssoFlowData = {
    initialStep,
    selectedProductId: resolvedProductId,
    billingMethod: billing,
    priceId: price,
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionPlansScreen ssoFlowData={ssoFlowData} />
    </HydrationBoundary>
  );
}
