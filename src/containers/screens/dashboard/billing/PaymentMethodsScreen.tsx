'use client';

import { BanknoteIcon, CheckCircle, Clock, CreditCard, Plus, Shield, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { ApiResponse } from '@/api/core/schemas';
import { ContentCard, DashboardCard, DashboardDataCard } from '@/components/dashboard/dashboard-cards';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection, EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/db/validation/billing';
import { useDeletePaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { staleWhileRevalidate, useMutationUIState, useQueryUIState } from '@/hooks/utils/query-helpers';
import { toastManager } from '@/lib/toast/toast-manager';

export default function PaymentMethodsScreen() {
  const t = useTranslations();
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  // Enhanced query and mutation state management
  const paymentMethodsUIState = useQueryUIState(paymentMethodsQuery);
  const paymentMethodsStaleState = staleWhileRevalidate(paymentMethodsQuery);
  const deleteUIState = useMutationUIState(deletePaymentMethodMutation);
  const setDefaultUIState = useMutationUIState(setDefaultPaymentMethodMutation);

  // Handle mutation feedback with centralized toast management
  React.useEffect(() => {
    if (deleteUIState.showSuccess) {
      toastManager.success(t('paymentMethods.successMessages.paymentMethodRemoved'));
    }
    if (deleteUIState.showError && deleteUIState.error) {
      toastManager.error(deleteUIState.error.message || t('paymentMethods.errorMessages.failedToRemove'));
    }
  }, [deleteUIState.showSuccess, deleteUIState.showError, deleteUIState.error, t]);

  React.useEffect(() => {
    if (setDefaultUIState.showSuccess) {
      toastManager.success(t('paymentMethods.successMessages.defaultPaymentMethodUpdated'));
    }
    if (setDefaultUIState.showError && setDefaultUIState.error) {
      toastManager.error(setDefaultUIState.error.message || t('paymentMethods.errorMessages.failedToUpdateDefault'));
    }
  }, [setDefaultUIState.showSuccess, setDefaultUIState.showError, setDefaultUIState.error, t]);

  const paymentMethodList: PaymentMethod[] = (() => {
    const data = paymentMethodsStaleState.data as ApiResponse<PaymentMethod[]> | undefined;
    return data?.success && Array.isArray(data.data) ? data.data : [];
  })();

  const handleSetDefault = async (paymentMethodId: string) => {
    setDefaultPaymentMethodMutation.mutate({ param: { id: paymentMethodId } });
  };

  const handleDelete = async (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate({ param: { id: paymentMethodId } });
  };

  // Show loading state on initial load
  if (paymentMethodsUIState.showSkeleton) {
    return (
      <LoadingState
        title={t('states.loading.payment_methods')}
        message={t('states.loading.please_wait')}
      />
    );
  }

  // Show error state with improved error handling
  if (paymentMethodsUIState.showError) {
    const isAuthError = paymentMethodsQuery.error?.message?.includes('Authentication')
      || paymentMethodsQuery.error?.message?.includes('401');

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
        <ContentCard
          title={t('directDebit.title')}
          description={t('directDebit.subtitle')}
          icon={<Shield className="h-4 w-4" />}
          primaryContent={(
            <div className="text-sm text-muted-foreground">
              {t('directDebit.contractSetup')}
            </div>
          )}
        />
      </DashboardSection>

      <DashboardSection delay={0.15}>
        {/* Existing Direct Debit Contracts */}
        {paymentMethodList.length > 0
          ? (
              <DashboardCard
                title={t('paymentMethods.title')}
                description={`${paymentMethodList.length} ${paymentMethodList.length === 1 ? t('paymentMethods.activeContract') : t('paymentMethods.activeContracts')}`}
                icon={<BanknoteIcon className="h-5 w-5 text-primary" />}
                headerAction={(
                  <Button asChild size="sm" startIcon={<Plus className="h-4 w-4" />}>
                    <Link href="/dashboard/billing/methods/setup">
                      {t('paymentMethods.addContract')}
                    </Link>
                  </Button>
                )}
              >
                <div className="space-y-4">
                  {paymentMethodList.map((method: PaymentMethod) => (
                    <DashboardDataCard
                      key={method.id}
                      title={method.contractDisplayName || t('paymentMethods.directDebitContract')}
                      subtitle={method.contractMobile || undefined}
                      status={(
                        <>
                          <Badge variant={method.contractStatus === 'active' ? 'success' : 'secondary'} className="gap-1">
                            {method.contractStatus === 'active' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {method.contractStatus === 'active' ? t('status.active') : t('status.pending')}
                          </Badge>
                          {method.isPrimary && (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              {t('paymentMethods.primary')}
                            </Badge>
                          )}
                        </>
                      )}
                      icon={<CreditCard className="h-6 w-6 text-primary" />}
                      primaryInfo={<span className="text-sm text-muted-foreground">{t('paymentMethods.zarinpalDirectDebit')}</span>}
                      actions={(
                        <div className="flex items-center gap-2">
                          {!method.isPrimary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(method.id)}
                              loading={setDefaultUIState.isPending && setDefaultUIState.variables?.param.id === method.id}
                              loadingText={t('paymentMethods.loadingMessages.setting')}
                              startIcon={<Star className="h-3 w-3" />}
                              disabled={
                                // Disable when any operation is running on this payment method
                                (setDefaultUIState.isPending && setDefaultUIState.variables?.param.id === method.id)
                                || (deleteUIState.isPending && deleteUIState.variables?.param.id === method.id)
                              }
                            >
                              {t('paymentMethods.setPrimary')}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(method.id)}
                            loading={deleteUIState.isPending && deleteUIState.variables?.param.id === method.id}
                            loadingText={t('paymentMethods.loadingMessages.deleting')}
                            startIcon={<Trash2 className="h-4 w-4" />}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={t('actions.delete')}
                            disabled={
                              // Disable when any operation is running on this payment method
                              (setDefaultUIState.isPending && setDefaultUIState.variables?.param.id === method.id)
                              || (deleteUIState.isPending && deleteUIState.variables?.param.id === method.id)
                            }
                          />
                        </div>
                      )}
                    />
                  ))}
                </div>
              </DashboardCard>
            )
          : (
              <EmptyState
                title={t('paymentMethods.empty')}
                description={t('paymentMethods.emptyDescription')}
                icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
                action={(
                  <Button asChild size="lg" startIcon={<Plus className="h-5 w-5" />}>
                    <Link href="/dashboard/billing/methods/setup">
                      {t('paymentMethods.createFirstContract')}
                    </Link>
                  </Button>
                )}
              />
            )}
      </DashboardSection>

      <DashboardSection delay={0.2}>
        <DashboardCard
          title={t('directDebit.contractSetup')}
          description={t('directDebit.subtitle')}
        >
          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: t('directDebit.setupSteps.step1.title'),
                  description: t('directDebit.setupSteps.step1.description'),
                  color: 'blue',
                },
                {
                  icon: BanknoteIcon,
                  title: t('directDebit.setupSteps.step2.title'),
                  description: t('directDebit.setupSteps.step2.description'),
                  color: 'green',
                },
                {
                  icon: CheckCircle,
                  title: t('directDebit.setupSteps.step3.title'),
                  description: t('directDebit.setupSteps.step3.description'),
                  color: 'purple',
                },
              ].map(step => (
                <div key={step.title} className="text-center space-y-4 group">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 group-hover:scale-105 transition-transform">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h5 className="font-semibold text-lg">{t('directDebit.contractTermsTitle')}</h5>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                {[
                  { label: t('directDebit.contractTerms.contractDuration'), value: t('directDebit.contractTerms.contractDurationValue') },
                  { label: t('directDebit.contractTerms.dailyTransactionLimit'), value: t('directDebit.contractTerms.dailyTransactionLimitValue') },
                  { label: t('directDebit.contractTerms.monthlyTransactionLimit'), value: t('directDebit.contractTerms.monthlyTransactionLimitValue') },
                  { label: t('directDebit.contractTerms.maxAmountPerTransaction'), value: t('directDebit.contractTerms.maxAmountPerTransactionValue') },
                ].map(term => (
                  <div key={term.label} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                    <span className="text-muted-foreground">
                      {term.label}
                      :
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">{term.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardCard>
      </DashboardSection>
    </DashboardPage>
  );
}
