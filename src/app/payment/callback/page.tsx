'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { processPaymentCallbackService } from '@/services/api';
import { verifyDirectDebitContractService } from '@/services/api/payment-methods';

type PaymentResult = {
  success: boolean;
  paymentId?: string;
  subscriptionId?: string;
  refId?: string;
  error?: string;
};

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is a direct debit contract callback or regular payment callback
        const authority = searchParams.get('Authority'); // Regular payment
        const paymanAuthority = searchParams.get('payman_authority'); // Direct debit contract
        const status = searchParams.get('Status') || searchParams.get('status'); // Both formats

        if (!authority && !paymanAuthority) {
          setResult({
            success: false,
            error: 'Invalid payment parameters',
          });
          return;
        }

        if (!status) {
          setResult({
            success: false,
            error: 'Missing payment status',
          });
          return;
        }

        // Handle direct debit contract callback
        if (paymanAuthority) {
          // Get stored contract information from localStorage
          const storedContract = localStorage.getItem('direct-debit-contract');
          if (!storedContract) {
            setResult({
              success: false,
              error: 'Contract information not found. Please try setting up direct debit again.',
            });
            return;
          }

          let contractInfo;
          try {
            contractInfo = JSON.parse(storedContract);
          } catch {
            setResult({
              success: false,
              error: 'Invalid contract information. Please try setting up direct debit again.',
            });
            return;
          }

          // Verify the contract
          try {
            const contractResult = await verifyDirectDebitContractService({
              json: {
                paymanAuthority,
                status: status.toUpperCase() as 'OK' | 'NOK',
                contractId: contractInfo.contractId,
              },
            });

            // Clean up localStorage
            localStorage.removeItem('direct-debit-contract');

            if (contractResult.success && contractResult.data) {
              if (contractResult.data.contractVerified) {
                setResult({
                  success: true,
                  paymentId: contractResult.data.paymentMethodId,
                  refId: contractResult.data.signature?.substring(0, 10), // Show first 10 chars of signature
                });
              } else {
                setResult({
                  success: false,
                  error: contractResult.data.error?.message || 'Contract verification failed',
                });
              }
            } else {
              setResult({
                success: false,
                error: 'Failed to verify direct debit contract',
              });
            }
          } catch (contractError) {
            setResult({
              success: false,
              error: contractError instanceof Error ? contractError.message : 'Contract verification failed',
            });
          }

          return;
        }

        // Handle regular payment callback (legacy)
        if (authority) {
          const data = await processPaymentCallbackService({
            Authority: authority,
            Status: status as 'OK' | 'NOK',
          });

          // The API returns { success: boolean, paymentId?, subscriptionId?, refId? }
          // But the inferred type shows different structure, so cast it properly
          const result = data as unknown as {
            success: boolean;
            paymentId?: string;
            subscriptionId?: string;
            refId?: string;
          };

          if (result.success) {
            setResult({
              success: true,
              paymentId: result.paymentId,
              subscriptionId: result.subscriptionId,
              refId: result.refId,
            });
          } else {
            setResult({
              success: false,
              paymentId: result.paymentId,
              subscriptionId: result.subscriptionId,
              error: 'Payment was not completed successfully',
            });
          }
        }
      } catch {
        setResult({
          success: false,
          error: 'Payment processing error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams]);

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
            <span className="mr-3 text-lg">Processing payment...</span>
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
                  <CheckCircle className="h-16 w-16 text-green-500" />
                )
              : (
                  <XCircle className="h-16 w-16 text-red-500" />
                )}
          </div>
          <CardTitle className="text-2xl">
            {result?.success ? 'Payment Successful' : 'Payment Failed'}
          </CardTitle>
          <CardDescription>
            {result?.success
              ? 'Your direct debit contract has been successfully set up and your payment method is now active.'
              : result?.error || 'Unfortunately the setup was not completed.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && result.refId && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Reference ID:</p>
              <code className="text-sm bg-muted px-3 py-1 rounded">
                {result.refId}
              </code>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {result?.success
              ? (
                  <Button onClick={handleGoToDashboard} size="lg" className="w-full">
                    View Billing Dashboard
                  </Button>
                )
              : (
                  <>
                    <Button onClick={handleRetry} size="lg" className="w-full">
                      Choose Another Plan
                    </Button>
                    <Button
                      onClick={handleGoToDashboard}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      Return to Dashboard
                    </Button>
                  </>
                )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={(
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
            <span className="mr-3 text-lg">Loading...</span>
          </CardContent>
        </Card>
      </div>
    )}
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
