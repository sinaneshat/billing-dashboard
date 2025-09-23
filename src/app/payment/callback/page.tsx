import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import PaymentCallbackScreen from '@/containers/screens/payment/PaymentCallbackScreen';
import { getQueryClient } from '@/lib/data/query-client';
import { queryKeys } from '@/lib/data/query-keys';
import { getPaymentMethodsService } from '@/services/api';

/**
 * PaymentCallbackPage - Server Component following established patterns
 *
 * Handles ZarinPal Payman direct debit contract callbacks
 * - Server-side prefetching for instant data availability
 * - Passes searchParams as props to screen (not via hooks)
 * - Uses HydrationBoundary for SSR/client state sync
 */
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ payman_authority?: string; status?: string }>;
}) {
  const params = await searchParams;
  const queryClient = getQueryClient();

  // Prefetch payment methods to check if contract was already created
  // This ensures instant loading without client-side fetching
  await queryClient.prefetchQuery({
    queryKey: queryKeys.paymentMethods.list,
    queryFn: getPaymentMethodsService,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PaymentCallbackScreen
        paymanAuthority={params.payman_authority}
        status={params.status}
      />
    </HydrationBoundary>
  );
}
