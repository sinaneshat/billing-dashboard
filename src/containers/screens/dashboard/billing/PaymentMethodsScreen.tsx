'use client';

import { CreditCard, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import { SimplifiedPaymentMethodCard } from '@/components/billing/simplified-payment-method-card';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection, EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { useCancelDirectDebitContractMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { toastManager } from '@/lib/toast/toast-manager';

export default function PaymentMethodsScreen() {
  const t = useTranslations();
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

  if (paymentMethodsQuery.isLoading) {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title={t('paymentMethods.title')}
          description={t('paymentMethods.subtitle')}
        />
        <DashboardSection delay={0.1}>
          <LoadingState
            variant="card"
            style="dashed"
            size="lg"
            title={t('states.loading.paymentMethods')}
            message={t('states.loading.please_wait')}
          />
        </DashboardSection>
      </DashboardPage>
    );
  }

  if (paymentMethodsQuery.isError && !paymentMethodsQuery.isLoading) {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title={t('paymentMethods.title')}
          description={t('paymentMethods.subtitle')}
        />
        <DashboardSection delay={0.1}>
          <ErrorState
            variant="card"
            title={t('states.error.loadPaymentMethods')}
            description={t('states.error.loadPaymentMethodsDescription')}
            onRetry={() => {
              paymentMethodsQuery.refetch();
            }}
            retryLabel={t('actions.tryAgain')}
          />
        </DashboardSection>
      </DashboardPage>
    );
  }

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
        {paymentMethodList.length > 0
          ? (
              <div className="grid gap-4">
                {paymentMethodList.map(method => (
                  <SimplifiedPaymentMethodCard
                    key={method.id}
                    paymentMethod={method}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDelete}
                    className="hover:shadow-lg transition-shadow duration-200"
                  />
                ))}
              </div>
            )
          : (
              <EmptyState
                variant="methods"
                style="dashed"
                size="lg"
                title={t('paymentMethods.empty')}
                description={t('paymentMethods.emptyDescription')}
                icon={<CreditCard className="h-12 w-12 text-primary/60" />}
                action={(
                  <Button
                    size="lg"
                    onClick={handleAddPaymentMethod}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t('paymentMethods.createFirstContract')}
                  </Button>
                )}
              />
            )}
      </DashboardSection>
    </DashboardPage>
  );
}
