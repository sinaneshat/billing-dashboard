'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import { BillingDisplayContainer, mapPaymentMethodToContent } from '@/components/billing/unified';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { useCancelDirectDebitContractMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { toastManager } from '@/lib/toast/toast-manager';

export default function PaymentMethodsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const cancelContractMutation = useCancelDirectDebitContractMutation();
  const setDefaultMutation = useSetDefaultPaymentMethodMutation();

  // Handle mutation feedback with direct mutation state
  React.useEffect(() => {
    if (cancelContractMutation.isSuccess && !cancelContractMutation.isPending) {
      toastManager.success(t('paymentMethods.successMessages.contractCancelled'));
    }
    if (cancelContractMutation.isError && !cancelContractMutation.isPending && cancelContractMutation.error) {
      const errorMessage = cancelContractMutation.error instanceof Error
        ? cancelContractMutation.error.message
        : t('paymentMethods.errorMessages.failedToCancelContract');
      toastManager.error(errorMessage);
    }
  }, [cancelContractMutation.isSuccess, cancelContractMutation.isError, cancelContractMutation.isPending, cancelContractMutation.error, t]);

  // Handle set default payment method feedback
  React.useEffect(() => {
    if (setDefaultMutation.isSuccess && !setDefaultMutation.isPending) {
      toastManager.success(t('paymentMethods.successMessages.defaultMethodSet'));
    }
    if (setDefaultMutation.isError && !setDefaultMutation.isPending && setDefaultMutation.error) {
      const errorMessage = setDefaultMutation.error instanceof Error
        ? setDefaultMutation.error.message
        : t('paymentMethods.errorMessages.failedToSetDefault');
      toastManager.error(errorMessage);
    }
  }, [setDefaultMutation.isSuccess, setDefaultMutation.isError, setDefaultMutation.isPending, setDefaultMutation.error, t]);

  const paymentMethodList: PaymentMethod[] = (() => {
    const data = paymentMethodsQuery.data as ApiResponse<PaymentMethod[]> | undefined;
    return data?.success && Array.isArray(data.data) ? data.data : [];
  })();

  const handleDelete = async (paymentMethodId: string) => {
    cancelContractMutation.mutate(paymentMethodId);
  };

  const handleSetPrimary = (paymentMethodId: string) => {
    setDefaultMutation.mutate({
      param: { id: paymentMethodId },
    });
  };

  const handleAddPaymentMethod = () => {
    router.push('/dashboard/billing/methods/setup');
  };

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('paymentMethods.title')}
        description={t('paymentMethods.subtitle')}
        action={paymentMethodList.length > 0
          ? (
              <Button onClick={handleAddPaymentMethod} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('paymentMethods.addPaymentMethod')}
              </Button>
            )
          : undefined}
      />

      <DashboardSection delay={0.1}>
        <BillingDisplayContainer
          data={paymentMethodList}
          isLoading={paymentMethodsQuery.isLoading}
          isError={paymentMethodsQuery.isError}
          error={paymentMethodsQuery.error}
          onRetry={() => paymentMethodsQuery.refetch()}
          dataType="paymentMethod"
          variant="card"
          size="md"
          columns="auto"
          gap="lg"
          emptyTitle={t('paymentMethods.empty')}
          emptyDescription={t('paymentMethods.emptyDescription')}
          emptyAction={(
            <Button
              size="lg"
              onClick={handleAddPaymentMethod}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('paymentMethods.createFirstContract')}
            </Button>
          )}
          mapItem={(paymentMethod: PaymentMethod) =>
            mapPaymentMethodToContent(
              paymentMethod,
              t,
              locale,
              handleSetPrimary,
              handleDelete,
            )}
        />
      </DashboardSection>
    </DashboardPage>
  );
}
