'use client';

import { CreditCard, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import type { PaymentMethodData } from '@/components/billing/unified';
import { BillingDisplayContainer, mapPaymentMethodToContent } from '@/components/billing/unified';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection, EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/db/validation/billing';
import { useCancelDirectDebitContractMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { toastManager } from '@/lib/toast/toast-manager';

export default function PaymentMethodsScreen() {
  const t = useTranslations();
  const router = useRouter();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const cancelContractMutation = useCancelDirectDebitContractMutation();

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

  const paymentMethodList: PaymentMethod[] = (() => {
    const data = paymentMethodsQuery.data as ApiResponse<PaymentMethod[]> | undefined;
    return data?.success && Array.isArray(data.data) ? data.data : [];
  })();

  const handleDelete = async (paymentMethodId: string) => {
    cancelContractMutation.mutate(paymentMethodId);
  };

  // Convert PaymentMethod to PaymentMethodData for the unified mapper
  const mapPaymentMethodToData = (method: PaymentMethod): PaymentMethodData => ({
    id: method.id,
    contractDisplayName: method.contractDisplayName || t('paymentMethods.directDebitContract'),
    contractMobile: method.contractMobile,
    contractStatus: method.contractStatus,
    isPrimary: method.isPrimary,
    isActive: method.contractStatus === 'active',
    lastUsedAt: method.lastUsedAt ? method.lastUsedAt.toISOString() : null,
  });

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
      />

      <DashboardSection delay={0.1}>
        {paymentMethodList.length > 0
          ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    {t('paymentMethods.activeContracts')}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {paymentMethodList.length}
                    {' '}
                    {paymentMethodList.length === 1 ? t('paymentMethods.contract') : t('paymentMethods.contracts')}
                  </span>
                </div>
                <BillingDisplayContainer
                  data={paymentMethodList}
                  isLoading={false}
                  dataType="paymentMethod"
                  variant="card"
                  size="md"
                  columns="auto"
                  gap="md"
                  mapItem={(method: PaymentMethod) =>
                    mapPaymentMethodToContent(
                      mapPaymentMethodToData(method),
                      t,
                      undefined, // onSetPrimary - not implemented yet
                      handleDelete,
                    )}
                />
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
                    onClick={() => router.push('/dashboard/billing/methods/setup')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('paymentMethods.createFirstContract')}
                  </Button>
                )}
              />
            )}
      </DashboardSection>
    </DashboardPage>
  );
}
