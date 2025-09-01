'use client';

import { BanknoteIcon, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { PageHeader } from '@/components/dashboard/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDeletePaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';

export default function PaymentMethodsPage() {
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethodsQuery();
  const deletePaymentMethod = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethod = useSetDefaultPaymentMethodMutation();

  const paymentMethodList = paymentMethods?.success && Array.isArray(paymentMethods.data)
    ? paymentMethods.data
    : [];

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethod.mutateAsync({ param: { id: paymentMethodId } });
      toast.success('Default payment method updated');
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      toast.error('Failed to update default payment method');
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    try {
      await deletePaymentMethod.mutateAsync({ param: { id: paymentMethodId } });
      toast.success('Payment method removed');
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      toast.error('Failed to remove payment method');
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
        title="Direct Debit Contracts"
        description="Manage your ZarinPal direct debit contracts for automatic subscription billing"
      />

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Secure Direct Debit Contracts</AlertTitle>
        <AlertDescription>
          Direct debit contracts are securely processed through ZarinPal's Payman (Direct Debit) system.
          Contract signatures are encrypted and stored securely by ZarinPal, enabling automatic billing without storing your banking details.
        </AlertDescription>
      </Alert>

      {/* Existing Direct Debit Contracts */}
      {paymentMethodList.length > 0
        ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BanknoteIcon className="h-5 w-5" />
                    <CardTitle>Your Direct Debit Contracts</CardTitle>
                  </div>
                  <DirectDebitContractSetup
                    onSuccess={(contractId) => {
                      toast.success('Direct debit contract created successfully!');
                      console.warn('New contract ID:', contractId);
                    }}
                  >
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Setup New Contract
                    </Button>
                  </DirectDebitContractSetup>
                </div>
                <CardDescription>
                  Manage your ZarinPal direct debit contracts for automatic subscription billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethodList.map(method => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {method.cardMask || 'Payment Method'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {method.cardType || 'Payment Method'}
                            {method.isPrimary && ' • Primary Method'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isActive && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                        {!method.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={setDefaultPaymentMethod.isPending}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                          disabled={deletePaymentMethod.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                  <BanknoteIcon className="h-5 w-5" />
                  <CardTitle>Setup Your First Direct Debit Contract</CardTitle>
                </div>
                <CardDescription>
                  Create a direct debit contract with ZarinPal to enable automatic billing for your subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BanknoteIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Direct Debit Contracts</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    To enable automatic subscription billing, you need to setup a direct debit contract with ZarinPal.
                    This allows us to automatically charge your subscription renewals directly from your bank account.
                  </p>
                  <DirectDebitContractSetup
                    onSuccess={(contractId) => {
                      toast.success('Direct debit contract created successfully!');
                      console.warn('New contract ID:', contractId);
                    }}
                  >
                    <Button size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Setup Direct Debit Contract
                    </Button>
                  </DirectDebitContractSetup>
                </div>
              </CardContent>
            </Card>
          )}

      {/* How ZarinPal Direct Debit Works */}
      <Card>
        <CardHeader>
          <CardTitle>How ZarinPal Direct Debit Works</CardTitle>
          <CardDescription>
            Learn about automatic billing through secure bank contract signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">1. Create Contract</h4>
              <p className="text-sm text-muted-foreground">
                Setup a secure direct debit contract with your mobile number and national ID
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <BanknoteIcon className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">2. Sign with Bank</h4>
              <p className="text-sm text-muted-foreground">
                Select your bank and sign the contract directly on your bank's secure website
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <h4 className="font-medium mb-2">3. Auto-billing Active</h4>
              <p className="text-sm text-muted-foreground">
                Your subscriptions will automatically renew using the secure signed contract
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h5 className="font-medium mb-2">Contract Limits & Terms</h5>
            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <div>• Duration: 1 Year (renewable)</div>
              <div>• Daily limit: 10 transactions</div>
              <div>• Monthly limit: 100 transactions</div>
              <div>• Maximum amount: 500,000 Toman per transaction</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
