'use client';

import { CheckCircle, CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection, EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentMethod } from '@/db/validation/billing';
import { useCancelDirectDebitContractMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { toastManager } from '@/lib/toast/toast-manager';

// Simple PaymentMethodCard component
function PaymentMethodCard({
  method,
  t,
  onSetDefault,
  onDelete,
  setDefaultMutation,
  cancelContractMutation,
}: {
  method: PaymentMethod;
  t: (key: string) => string;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  setDefaultMutation: ReturnType<typeof useSetDefaultPaymentMethodMutation>;
  cancelContractMutation: ReturnType<typeof useCancelDirectDebitContractMutation>;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                {method.contractDisplayName || t('paymentMethods.directDebitContract')}
              </CardTitle>
              {method.contractMobile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {method.contractMobile}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={method.contractStatus === 'active' ? 'default' : 'secondary'}
              className="gap-1"
            >
              {method.contractStatus === 'active'
                ? (
                    <CheckCircle className="h-3 w-3" />
                  )
                : null}
              {method.contractStatus === 'active' ? t('status.active') : t('status.pending')}
            </Badge>
            {method.isPrimary && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                {t('paymentMethods.primary')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('paymentMethods.zarinpalDirectDebit')}
          </span>
          <div className="flex items-center gap-2">
            {!method.isPrimary && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(method.id)}
                disabled={
                  (setDefaultMutation.isPending && (setDefaultMutation.variables as { param: { id: string } })?.param.id === method.id)
                  || (cancelContractMutation.isPending && (cancelContractMutation.variables as { param: { contractId: string } })?.param.contractId === method.id)
                }
                className="gap-1"
              >
                <Star className="h-3 w-3" />
                {t('paymentMethods.setPrimary')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(method.id)}
              disabled={
                (setDefaultMutation.isPending && (setDefaultMutation.variables as { param: { id: string } })?.param.id === method.id)
                || (cancelContractMutation.isPending && (cancelContractMutation.variables as { param: { contractId: string } })?.param.contractId === method.id)
              }
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
            >
              <Trash2 className="h-3 w-3" />
              {t('paymentMethods.cancelContract')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentMethodsScreen() {
  const t = useTranslations();
  const router = useRouter();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const cancelContractMutation = useCancelDirectDebitContractMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  // Direct TanStack Query state management

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

  React.useEffect(() => {
    if (setDefaultPaymentMethodMutation.isSuccess && !setDefaultPaymentMethodMutation.isPending) {
      toastManager.success(t('paymentMethods.successMessages.defaultPaymentMethodUpdated'));
    }
    if (setDefaultPaymentMethodMutation.isError && !setDefaultPaymentMethodMutation.isPending && setDefaultPaymentMethodMutation.error) {
      const errorMessage = setDefaultPaymentMethodMutation.error instanceof Error
        ? setDefaultPaymentMethodMutation.error.message
        : t('paymentMethods.errorMessages.failedToUpdateDefault');
      toastManager.error(errorMessage);
    }
  }, [setDefaultPaymentMethodMutation.isSuccess, setDefaultPaymentMethodMutation.isError, setDefaultPaymentMethodMutation.isPending, setDefaultPaymentMethodMutation.error, t]);

  const paymentMethodList: PaymentMethod[] = (() => {
    const data = paymentMethodsQuery.data as ApiResponse<PaymentMethod[]> | undefined;
    return data?.success && Array.isArray(data.data) ? data.data : [];
  })();

  const handleSetDefault = async (paymentMethodId: string) => {
    setDefaultPaymentMethodMutation.mutate({ param: { id: paymentMethodId } });
  };

  const handleDelete = async (paymentMethodId: string) => {
    cancelContractMutation.mutate({ param: { contractId: paymentMethodId } });
  };

  // Show loading state on initial load
  if (paymentMethodsQuery.isLoading && !paymentMethodsQuery.data) {
    return (
      <LoadingState
        title={t('states.loading.payment_methods')}
        message={t('states.loading.please_wait')}
      />
    );
  }

  // Show error state with improved error handling
  if (paymentMethodsQuery.isError && !paymentMethodsQuery.isLoading) {
    const errorMessage = paymentMethodsQuery.error instanceof Error
      ? paymentMethodsQuery.error.message
      : 'An error occurred';
    const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('401');

    return (
      <ErrorState
        title={isAuthError ? t('states.error.authenticationRequired') : t('states.error.default')}
        description={isAuthError
          ? t('states.error.authenticationDescription')
          : t('states.error.networkDescription')}
        onRetry={() => {
          if (isAuthError) {
            // For auth errors, don't retry automatically - user needs to refresh or sign in again
            window.location.reload();
          } else {
            paymentMethodsQuery.refetch();
          }
        }}
        icon={<CreditCard className="h-8 w-8 text-destructive" />}
      />
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
                <div className="grid gap-4">
                  {paymentMethodList.map(method => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      t={t}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                      setDefaultMutation={setDefaultPaymentMethodMutation}
                      cancelContractMutation={cancelContractMutation}
                    />
                  ))}
                </div>
              </div>
            )
          : (
              <EmptyState
                title={t('paymentMethods.empty')}
                description={t('paymentMethods.emptyDescription')}
                icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
                action={(
                  <Button
                    size="lg"
                    startIcon={<Plus className="h-4 w-4" />}
                    onClick={() => router.push('/dashboard/billing/methods/setup')}
                  >
                    {t('paymentMethods.createFirstContract')}
                  </Button>
                )}
              />
            )}
      </DashboardSection>
    </DashboardPage>
  );
}
