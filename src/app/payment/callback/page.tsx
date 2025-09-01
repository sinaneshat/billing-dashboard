'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
// Payment callback service removed - using subscription-specific callback handling

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
        const authority = searchParams.get('Authority');
        const status = searchParams.get('Status');

        if (!authority || !status) {
          setResult({
            success: false,
            error: 'Invalid payment parameters',
          });
          return;
        }

        // Mock callback handling for subscription payments
        // In a real implementation, this would validate with ZarinPal and update subscription status
        const response = {
          success: true,
          data: {
            success: status === 'OK',
            subscriptionId: 'sub_example',
            refId: authority,
          },
        };

        if (response.success && response.data) {
          setResult({
            success: response.data.success,
            subscriptionId: response.data.subscriptionId!,
            refId: response.data.refId,
          });
        } else {
          setResult({
            success: false,
            error: 'Payment processing error',
          });
        }
      } catch (error) {
        console.error('Payment callback error:', error);
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
              ? 'Your payment was successful and your subscription has been activated.'
              : result?.error || 'Unfortunately your payment was not completed.'}
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
