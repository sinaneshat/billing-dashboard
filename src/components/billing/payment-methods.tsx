'use client';

import { Calendar, Check, CreditCard, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CardAdditionDialog } from '@/components/billing/card-addition-dialog';
import { DirectDebitSetup } from '@/components/billing/direct-debit-setup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  useDeletePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
} from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';

function formatCardType(cardType: string | null) {
  if (!cardType)
    return 'Card';
  return cardType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

type DeletePaymentMethodDialogProps = {
  paymentMethod: {
    id: string;
    cardMask: string;
    cardType: string | null;
    isPrimary: boolean;
  };
  onDelete: (paymentMethodId: string) => void;
  isLoading: boolean;
};

function DeletePaymentMethodDialog({ paymentMethod, onDelete, isLoading }: DeletePaymentMethodDialogProps) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete(paymentMethod.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Payment Method</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this payment method?
            {paymentMethod.isPrimary && ' This is your primary payment method.'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{paymentMethod.cardMask}</p>
              <p className="text-sm text-muted-foreground">
                {formatCardType(paymentMethod.cardType)}
                {paymentMethod.isPrimary && ' • Primary'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
            Delete Payment Method
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentMethods() {
  const { data: paymentMethods, isLoading, error, refetch } = usePaymentMethodsQuery();
  const { data: subscriptions } = useSubscriptionsQuery();
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  const paymentMethodList = paymentMethods?.success && Array.isArray(paymentMethods.data)
    ? paymentMethods.data
    : [];

  const subscriptionList = subscriptions?.success && Array.isArray(subscriptions.data)
    ? subscriptions.data
    : [];

  const subscriptionsWithDirectDebit = subscriptionList.filter(sub => sub.zarinpalDirectDebitToken);

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    try {
      await deletePaymentMethodMutation.mutateAsync({
        param: { id: paymentMethodId },
      });
      toast.success('Payment method deleted successfully');
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      toast.error('Failed to delete payment method. Please try again.');
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethodMutation.mutateAsync({
        param: { id: paymentMethodId },
      });
      toast.success('Default payment method updated');
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      toast.error('Failed to update default payment method. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Methods</h2>
          <p className="text-muted-foreground">
            Manage your saved payment methods and billing settings
          </p>
        </div>
        <CardAdditionDialog
          onSuccess={() => {
            toast.success('Card added successfully!');
            refetch();
          }}
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </CardAdditionDialog>
      </div>

      {/* Direct Debit Status */}
      {subscriptionsWithDirectDebit.length > 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Automatic Payments Active</AlertTitle>
          <AlertDescription>
            You have
            {' '}
            {subscriptionsWithDirectDebit.length}
            {' '}
            subscription(s) with automatic payment enabled.
            Your subscription will renew automatically using your saved payment method from ZarinPal.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Payment Security</AlertTitle>
        <AlertDescription>
          Your payment information is securely processed by ZarinPal.
          We never store your complete card details on our servers.
        </AlertDescription>
      </Alert>

      {/* Payment Methods List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading
            ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner className="h-6 w-6 mr-2" />
                  <span>Loading payment methods...</span>
                </div>
              )
            : error
              ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-destructive mb-2">Failed to load payment methods</p>
                    <Button variant="outline" onClick={() => refetch()}>
                      Try Again
                    </Button>
                  </div>
                )
              : paymentMethodList.length === 0
                ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't added any payment methods yet. Add one to get started.
                      </p>
                      <CardAdditionDialog
                        onSuccess={() => {
                          toast.success('Your first payment method was added successfully!');
                          refetch();
                        }}
                      >
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Card
                        </Button>
                      </CardAdditionDialog>
                    </div>
                  )
                : (
                    <div className="space-y-4">
                      {paymentMethodList.map(paymentMethod => (
                        <div key={paymentMethod.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{paymentMethod.cardMask}</p>
                                {paymentMethod.isPrimary && (
                                  <Badge variant="default" className="text-xs">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatCardType(paymentMethod.cardType)}
                                {paymentMethod.expiresAt && (
                                  <>
                                    {' '}
                                    • Expires
                                    {new Date(paymentMethod.expiresAt).toLocaleDateString()}
                                  </>
                                )}
                              </p>
                              {paymentMethod.lastUsedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Last used:
                                  {' '}
                                  {new Date(paymentMethod.lastUsedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!paymentMethod.isPrimary && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefaultPaymentMethod(paymentMethod.id)}
                                disabled={setDefaultPaymentMethodMutation.isPending}
                              >
                                {setDefaultPaymentMethodMutation.isPending
                                  ? (
                                      <LoadingSpinner className="h-4 w-4" />
                                    )
                                  : (
                                      <>
                                        <Check className="h-4 w-4 mr-1" />
                                        Set as Primary
                                      </>
                                    )}
                              </Button>
                            )}

                            <DirectDebitSetup
                              paymentMethodId={paymentMethod.id}
                              onSuccess={() => {
                                toast.success('Automatic payment enabled!');
                                refetch();
                              }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                Enable Auto-Pay
                              </Button>
                            </DirectDebitSetup>

                            <DeletePaymentMethodDialog
                              paymentMethod={paymentMethod}
                              onDelete={handleDeletePaymentMethod}
                              isLoading={deletePaymentMethodMutation.isPending}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Payment methods are processed securely through ZarinPal
          </p>
          <p className="text-sm text-muted-foreground">
            • Primary payment methods are used for automatic billing
          </p>
          <p className="text-sm text-muted-foreground">
            • You can add payment methods during checkout or manually here
          </p>
          <p className="text-sm text-muted-foreground">
            • Contact support if you have issues with payment processing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
