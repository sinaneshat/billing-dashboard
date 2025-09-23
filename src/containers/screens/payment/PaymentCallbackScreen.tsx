'use client';

import { CheckCircle2, CreditCard, Shield, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPage, DashboardSection, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/motion';
import { Separator } from '@/components/ui/separator';
import { useRecoverContractMutation } from '@/hooks/mutations/contract-recovery';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { toastManager } from '@/lib/toast/toast-manager';

/**
 * PaymentCallbackScreen - ZarinPal Payman Direct Debit Contract Callback Handler
 *
 * Follows established patterns:
 * - Receives searchParams as props from server component (not via hooks)
 * - Data is prefetched server-side and hydrated
 * - Proper loading states with dashboard components
 * - NO LEGACY PAYMENT FLOWS - Only ZarinPal Payman is supported
 */

type PaymentCallbackScreenProps = {
  paymanAuthority?: string;
  status?: string;
};

type PaymanCallbackStatus = 'processing' | 'success' | 'failed' | 'invalid';

type PaymanCallbackResult = {
  status: PaymanCallbackStatus;
  paymanAuthority?: string;
  paymentMethodId?: string;
  errorMessage?: string;
  isRecovered?: boolean;
};

export default function PaymentCallbackScreen({ paymanAuthority, status }: PaymentCallbackScreenProps) {
  const t = useTranslations();
  const router = useRouter();
  const hasAttemptedRecovery = useRef(false);

  // React Query hooks - data is already prefetched server-side
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const recoverContractMutation = useRecoverContractMutation();

  // Parse callback parameters from props
  const callbackParams = useMemo(() => {
    return {
      paymanAuthority,
      status,
      isValid: !!paymanAuthority && !!status,
      isSuccessful: status === 'OK',
    };
  }, [paymanAuthority, status]);

  // Process the Payman contract callback result
  const callbackResult = useMemo((): PaymanCallbackResult => {
    // Validate callback parameters
    if (!callbackParams.isValid) {
      return {
        status: 'invalid',
        errorMessage: t('paymentMethods.errors.invalidCallbackParameters'),
      };
    }

    // Check if contract signing was successful
    if (!callbackParams.isSuccessful) {
      return {
        status: 'failed',
        paymanAuthority: callbackParams.paymanAuthority,
        errorMessage: t('paymentMethods.errors.contractSigningCancelled'),
      };
    }

    // Check if payment method exists (contract was verified and saved)
    const paymentMethods = paymentMethodsQuery.data?.success && Array.isArray(paymentMethodsQuery.data.data)
      ? paymentMethodsQuery.data.data
      : [];

    // Look for a payment method with direct debit contract
    const directDebitMethod = paymentMethods.find(
      method => method.contractType === 'direct_debit_contract' && method.contractStatus === 'active',
    );

    if (directDebitMethod) {
      return {
        status: 'success',
        paymanAuthority: callbackParams.paymanAuthority,
        paymentMethodId: directDebitMethod.id,
      };
    }

    // Check if recovery was attempted and succeeded
    if (recoverContractMutation.isSuccess && recoverContractMutation.data?.success) {
      return {
        status: 'success',
        paymanAuthority: callbackParams.paymanAuthority,
        paymentMethodId: recoverContractMutation.data.paymentMethod?.id,
        isRecovered: true,
      };
    }

    // Recovery failed
    if (recoverContractMutation.isError) {
      return {
        status: 'failed',
        paymanAuthority: callbackParams.paymanAuthority,
        errorMessage: t('paymentMethods.errors.contractVerificationFailed'),
      };
    }

    // Need to attempt recovery or recovery in progress
    if (recoverContractMutation.isIdle || recoverContractMutation.isPending) {
      return {
        status: 'processing',
        paymanAuthority: callbackParams.paymanAuthority,
      };
    }

    // Unknown state
    return {
      status: 'failed',
      paymanAuthority: callbackParams.paymanAuthority,
      errorMessage: t('paymentMethods.errors.unexpectedError'),
    };
  }, [
    callbackParams,
    paymentMethodsQuery.data,
    recoverContractMutation.isSuccess,
    recoverContractMutation.isError,
    recoverContractMutation.isIdle,
    recoverContractMutation.isPending,
    recoverContractMutation.data,
    t,
  ]);

  // Attempt contract recovery if needed
  useEffect(() => {
    if (
      !hasAttemptedRecovery.current
      && callbackResult.status === 'processing'
      && callbackParams.isValid
      && callbackParams.isSuccessful
      && callbackParams.paymanAuthority
      && recoverContractMutation.isIdle
    ) {
      hasAttemptedRecovery.current = true;
      recoverContractMutation.mutate(callbackParams.paymanAuthority);
    }
  }, [
    callbackResult.status,
    callbackParams,
    recoverContractMutation,
  ]);

  // Show toast notifications
  useEffect(() => {
    if (callbackResult.status === 'success' && callbackResult.isRecovered) {
      toastManager.success(t('paymentMethods.success.contractRecovered'));
    }
  }, [callbackResult.status, callbackResult.isRecovered, t]);

  // Clean up any temporary storage
  useEffect(() => {
    try {
      // Remove any temporary data from previous attempts
      localStorage.removeItem('bank-authorization-contract');
      localStorage.removeItem('pending-payman-authority');
      sessionStorage.removeItem('payman-setup-state');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Navigation handlers
  const handleViewPaymentMethods = () => {
    router.push('/dashboard/billing/methods');
  };

  const handleSetupNewContract = () => {
    router.push('/dashboard/billing/methods/setup');
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  // Show loading state while processing
  if (callbackResult.status === 'processing') {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title={t('paymentMethods.directDebit.title')}
          description={t('paymentMethods.directDebit.processingContract')}
        />
        <DashboardSection delay={0.1}>
          <LoadingState
            variant="card"
            style="dashed"
            size="lg"
            title={t('paymentMethods.directDebit.verifyingContract')}
            message={t('paymentMethods.directDebit.pleaseWait')}
          />
        </DashboardSection>
      </DashboardPage>
    );
  }

  // Show error state for invalid parameters
  if (callbackResult.status === 'invalid') {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title={t('paymentMethods.directDebit.title')}
          description={t('paymentMethods.directDebit.subtitle')}
        />
        <DashboardSection delay={0.1}>
          <ErrorState
            variant="card"
            title={t('paymentMethods.errors.invalidRequest')}
            description={callbackResult.errorMessage}
            onRetry={handleSetupNewContract}
            retryLabel={t('paymentMethods.actions.setupNewContract')}
          />
        </DashboardSection>
      </DashboardPage>
    );
  }

  // Show success state
  if (callbackResult.status === 'success') {
    return (
      <DashboardPage>
        <DashboardPageHeader
          title={t('paymentMethods.directDebit.title')}
          description={t('paymentMethods.directDebit.subtitle')}
        />
        <DashboardSection delay={0.1}>
          <FadeIn delay={0.2}>
            <Card className="max-w-2xl mx-auto border-emerald-200 dark:border-emerald-800">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-10 w-10 text-emerald-700 dark:text-emerald-300" />
                </div>
                <CardTitle className="text-2xl">
                  {t('paymentMethods.directDebit.contractActivated')}
                </CardTitle>
                <CardDescription className="text-base">
                  {t('paymentMethods.directDebit.contractActivatedDescription')}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                      {t('paymentMethods.directDebit.contractDetails')}
                    </span>
                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                      {t('paymentMethods.status.active')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{t('paymentMethods.directDebit.bankVerified')}</span>
                    </div>
                    <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{t('paymentMethods.directDebit.signatureStored')}</span>
                    </div>
                    <div className="flex items-center text-sm text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{t('paymentMethods.directDebit.readyForPayments')}</span>
                    </div>
                  </div>
                </div>

                {callbackResult.paymanAuthority && (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('paymentMethods.directDebit.referenceCode')}
                    </p>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {callbackResult.paymanAuthority.slice(-8)}
                    </code>
                  </div>
                )}
              </CardContent>

              <Separator />

              <CardFooter className="pt-6">
                <Button
                  onClick={handleViewPaymentMethods}
                  size="lg"
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('paymentMethods.actions.viewPaymentMethods')}
                </Button>
              </CardFooter>
            </Card>
          </FadeIn>
        </DashboardSection>
      </DashboardPage>
    );
  }

  // Show failed state
  return (
    <DashboardPage>
      <DashboardPageHeader
        title={t('paymentMethods.directDebit.title')}
        description={t('paymentMethods.directDebit.subtitle')}
      />
      <DashboardSection delay={0.1}>
        <FadeIn delay={0.2}>
          <Card className="max-w-2xl mx-auto border-destructive/20">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                {t('paymentMethods.directDebit.contractFailed')}
              </CardTitle>
              <CardDescription className="text-base">
                {callbackResult.errorMessage || t('paymentMethods.directDebit.contractFailedDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  {t('paymentMethods.directDebit.contractFailedHelp')}
                </p>
              </div>
            </CardContent>

            <Separator />

            <CardFooter className="pt-6 space-y-3 flex-col">
              <Button
                onClick={handleSetupNewContract}
                size="lg"
                className="w-full"
              >
                {t('paymentMethods.actions.tryAgain')}
              </Button>
              <Button
                onClick={handleReturnToDashboard}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {t('paymentMethods.actions.returnToDashboard')}
              </Button>
            </CardFooter>
          </Card>
        </FadeIn>
      </DashboardSection>
    </DashboardPage>
  );
}
