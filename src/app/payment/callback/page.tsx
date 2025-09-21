'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { verifyDirectDebitContractService } from '@/services/api/payment-methods';

type PaymentResult = {
  success: boolean;
  paymentId?: string;
  subscriptionId?: string;
  refId?: string;
  error?: string;
};

function PaymentCallbackContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is a direct debit contract callback or regular payment callback
        const authority = searchParams.get('Authority'); // Regular payment
        const paymanAuthority = searchParams.get('payman_authority'); // Direct debit contract
        const status = searchParams.get('status'); // ZarinPal docs: lowercase 'status'

        if (!authority && !paymanAuthority) {
          setResult({
            success: false,
            error: t('payment.callback.invalidPaymentParameters'),
          });
          return;
        }

        if (!status) {
          setResult({
            success: false,
            error: t('payment.callback.missingPaymentStatus'),
          });
          return;
        }

        // Handle direct debit contract callback
        if (paymanAuthority) {
          // Get stored contract information from localStorage
          const storedContract = localStorage.getItem('bank-authorization-contract');
          if (!storedContract) {
            setResult({
              success: false,
              error: t('payment.callback.contractInfoNotFound'),
            });
            return;
          }

          // Parse stored contract to get contract ID
          let contractId: string;
          try {
            const parsedContract = JSON.parse(storedContract);
            contractId = parsedContract.contractId;
            if (!contractId) {
              throw new Error('Contract ID not found in stored contract');
            }
          } catch {
            setResult({
              success: false,
              error: t('payment.callback.contractInfoNotFound'),
            });
            return;
          }

          // Verify the contract using contract parameters (following new schema-first patterns)
          try {
            const contractResult = await verifyDirectDebitContractService({
              param: { id: contractId },
              json: {
                paymanAuthority,
                status: status.toUpperCase() as 'OK' | 'NOK',
              },
            });

            // Clean up localStorage
            localStorage.removeItem('bank-authorization-contract');

            if (contractResult.success && contractResult.data) {
              // Contract verified successfully if we get signature and paymentMethod
              if (contractResult.data.signature && contractResult.data.paymentMethod) {
                setResult({
                  success: true,
                  paymentId: contractResult.data.paymentMethod.id,
                  refId: contractResult.data.signature.substring(0, 10), // Show first 10 chars of signature
                });
              } else {
                setResult({
                  success: false,
                  error: t('payment.callback.contractVerificationFailed'),
                });
              }
            } else {
              setResult({
                success: false,
                error: t('payment.callback.failedToVerifyContract'),
              });
            }
          } catch (contractError) {
            setResult({
              success: false,
              error: contractError instanceof Error ? contractError.message : t('payment.callback.contractVerificationFailed'),
            });
          }

          return;
        }

        // Handle regular payment callback (legacy) - DISABLED: service removed
        if (authority) {
          setResult({
            success: false,
            error: t('payment.callback.legacyPaymentNotSupported'),
          });
        }
      } catch {
        setResult({
          success: false,
          error: t('payment.callback.paymentProcessingError'),
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, t]);

  const handleGoToDashboard = () => {
    window.location.href = result?.success ? '/dashboard/billing' : '/dashboard';
  };

  const handleRetry = () => {
    window.location.href = '/dashboard/billing/plans';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
            <span className="me-3 text-lg">{t('payment.callback.processingPayment')}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {result?.success
              ? (
                  <CheckCircle className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                )
              : (
                  <XCircle className="h-16 w-16 text-destructive" />
                )}
          </div>
          <CardTitle className="text-2xl">
            {result?.success ? t('payment.callback.paymentSuccessful') : t('payment.callback.paymentFailed')}
          </CardTitle>
          <CardDescription>
            {result?.success
              ? t('payment.callback.directDebitSuccess')
              : result?.error || t('payment.callback.setupNotCompleted')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && result.refId && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('payment.callback.referenceId')}</p>
              <code className="text-sm bg-muted px-3 py-1 rounded">
                {result.refId}
              </code>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {result?.success
              ? (
                  <Button onClick={handleGoToDashboard} size="lg" className="w-full">
                    {t('payment.callback.viewBillingDashboard')}
                  </Button>
                )
              : (
                  <>
                    <Button onClick={handleRetry} size="lg" className="w-full">
                      {t('payment.callback.chooseAnotherPlan')}
                    </Button>
                    <Button
                      onClick={handleGoToDashboard}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      {t('payment.callback.returnToDashboard')}
                    </Button>
                  </>
                )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentCallbackFallback() {
  const t = useTranslations();
  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner className="h-8 w-8" />
          <span className="me-3 text-lg">{t('payment.callback.loading')}</span>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentCallbackFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
