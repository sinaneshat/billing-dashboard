'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
          // Clean up localStorage if it exists
          try {
            localStorage.removeItem('bank-authorization-contract');
          } catch {
            // Ignore errors when cleaning up localStorage
          }

          // Check if the callback indicates success
          if (status === 'OK') {
            try {
              // Call the backend contract callback handler to verify and create payment method
              const response = await fetch(`/api/v1/payment-methods/contracts/callback?payman_authority=${encodeURIComponent(paymanAuthority)}&status=${encodeURIComponent(status)}`, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
                credentials: 'include', // Include session cookies
              });

              const data = await response.json() as {
                success: boolean;
                paymentMethodId?: string;
                message?: string;
              };

              if (data.success) {
                // Contract verified and payment method created successfully
                setResult({
                  success: true,
                  paymentId: data.paymentMethodId || 'callback-received',
                  refId: paymanAuthority.slice(-8), // Show last 8 chars of payman authority
                });
              } else {
                // Verification failed
                setResult({
                  success: false,
                  error: data.message || t('payment.callback.setupNotCompleted'),
                });
              }
            } catch (apiError) {
              console.error('Failed to verify contract:', apiError);
              // Even if API call fails, show partial success if status is OK
              // This allows user to retry from dashboard
              setResult({
                success: true,
                paymentId: 'callback-received',
                refId: paymanAuthority.slice(-8),
              });
            }
          } else {
            // Callback indicates failure
            setResult({
              success: false,
              error: t('payment.callback.setupNotCompleted'),
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
              ? `${t('payment.callback.directDebitSuccess')} Please return to your dashboard to continue.`
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
