'use client';

import { CreditCard, Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DirectDebitSetup } from '@/components/billing/direct-debit-setup';
import { PageHeader } from '@/components/dashboard/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useInitiateCardAdditionMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';

export default function PaymentMethodsPage() {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethodsQuery();
  const initiateCardAddition = useInitiateCardAdditionMutation();

  const paymentMethodList = paymentMethods?.success && Array.isArray(paymentMethods.data)
    ? paymentMethods.data
    : [];

  const handleAddCard = async () => {
    setIsAddingCard(true);
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await initiateCardAddition.mutateAsync({
        callbackUrl,
        metadata: { source: 'direct-debit-setup' },
      });

      if (result.success && result.data?.verificationUrl) {
        // Redirect to ZarinPal for card verification
        window.location.href = result.data.verificationUrl;
      } else {
        toast.error('Failed to initiate card addition');
        setIsAddingCard(false);
      }
    } catch (error) {
      console.error('Card addition error:', error);
      toast.error('Error starting card addition process');
      setIsAddingCard(false);
    }
  };

  if (paymentMethodsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span className="text-lg">Loading payment methods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Methods"
        description="Manage your payment methods and enable automatic billing for subscriptions"
      />

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Secure Payment Processing</AlertTitle>
        <AlertDescription>
          All payment information is securely processed through ZarinPal's Direct Payment system.
          Your card details are encrypted and stored securely by ZarinPal, not on our servers.
        </AlertDescription>
      </Alert>

      {/* Existing Payment Methods */}
      {paymentMethodList.length > 0
        ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle>Your Payment Methods</CardTitle>
                  </div>
                  <Button
                    onClick={handleAddCard}
                    disabled={isAddingCard}
                    size="sm"
                  >
                    {isAddingCard
                      ? (
                          <>
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                            Adding Card...
                          </>
                        )
                      : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Card
                          </>
                        )}
                  </Button>
                </div>
                <CardDescription>
                  Manage your saved payment methods for automatic billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethodList.map(method => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{method.cardMask || 'Card ending in ****'}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.cardType || 'Credit/Debit Card'}
                            {method.isPrimary && ' • Primary Method'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Auto-pay status placeholder - would be implemented based on actual DB schema */}
                        {method.isActive && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                        <DirectDebitSetup
                          paymentMethodId={method.id}
                          onSuccess={() => {
                            toast.success('Direct debit settings updated!');
                          }}
                        >
                          <Button variant="outline" size="sm">
                            Enable Auto-pay
                          </Button>
                        </DirectDebitSetup>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <CardTitle>Add Your First Payment Method</CardTitle>
                </div>
                <CardDescription>
                  Add a payment method to enable automatic billing for your subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payment Methods Added</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    To enable automatic subscription billing, you need to add a payment method.
                    This will allow us to automatically charge your subscription renewals.
                  </p>
                  <Button
                    onClick={handleAddCard}
                    disabled={isAddingCard}
                    size="lg"
                  >
                    {isAddingCard
                      ? (
                          <>
                            <LoadingSpinner className="h-4 w-4 mr-2" />
                            Adding Card...
                          </>
                        )
                      : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment Method
                          </>
                        )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Direct Debit Works</CardTitle>
          <CardDescription>
            Learn about automatic billing for your subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">1. Add Your Card</h4>
              <p className="text-sm text-muted-foreground">
                Securely add your payment method through ZarinPal's encrypted system
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">2. Enable Auto-pay</h4>
              <p className="text-sm text-muted-foreground">
                Choose which subscriptions to enable automatic billing for
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">3. Stay Active</h4>
              <p className="text-sm text-muted-foreground">
                Your subscriptions will automatically renew without interruption
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
