'use client';

import { Calendar, CheckCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEnableDirectDebitMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';

type DirectDebitSetupProps = {
  subscriptionId?: string;
  paymentMethodId?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function DirectDebitSetup({
  subscriptionId,
  paymentMethodId,
  children,
  onSuccess,
}: DirectDebitSetupProps) {
  const [open, setOpen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(paymentMethodId || '');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(subscriptionId || '');

  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethodsQuery();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptionsQuery();
  const enableDirectDebit = useEnableDirectDebitMutation();

  const paymentMethodList = paymentMethods?.success && Array.isArray(paymentMethods.data)
    ? paymentMethods.data
    : [];

  const subscriptionList = subscriptions?.success && Array.isArray(subscriptions.data)
    ? subscriptions.data.filter(sub => sub.status === 'active')
    : [];

  const selectedPaymentMethod = paymentMethodList.find(pm => pm.id === selectedPaymentMethodId);
  const selectedSubscription = subscriptionList.find(sub => sub.id === selectedSubscriptionId);

  const handleEnableDirectDebit = async () => {
    if (!selectedPaymentMethodId) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      await enableDirectDebit.mutateAsync({
        paymentMethodId: selectedPaymentMethodId,
        subscriptionId: selectedSubscriptionId || undefined,
      });

      toast.success('Automatic payment enabled successfully!');
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      console.error('Failed to enable direct debit:', error);
      toast.error('Error enabling automatic payment');
    }
  };

  const isLoading = paymentMethodsLoading || subscriptionsLoading || enableDirectDebit.isPending;

  // Note: Direct debit methods are tracked via database metadata

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Enable Automatic Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Enable Automatic Payment
          </DialogTitle>
          <DialogDescription>
            Select a payment method and subscription for automatic renewal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label htmlFor="payment-method-select" className="text-sm font-medium">Select Payment Method:</label>
            {paymentMethodsLoading
              ? (
                  <div className="flex items-center gap-2 p-2">
                    <LoadingSpinner className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Loading payment methods...</span>
                  </div>
                )
              : paymentMethodList.length === 0
                ? (
                    <Alert>
                      <CreditCard className="h-4 w-4" />
                      <AlertTitle>No Payment Methods Found</AlertTitle>
                      <AlertDescription>
                        You need to add a payment method first to enable automatic payments.
                      </AlertDescription>
                    </Alert>
                  )
                : (
                    <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodList.map(paymentMethod => (
                          <SelectItem key={paymentMethod.id} value={paymentMethod.id}>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span>{paymentMethod.cardMask}</span>
                              {paymentMethod.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
          </div>

          {/* Subscription Selection */}
          {!subscriptionId && (
            <div className="space-y-2">
              <label htmlFor="subscription-select" className="text-sm font-medium">Select Subscription (Optional):</label>
              {subscriptionsLoading
                ? (
                    <div className="flex items-center gap-2 p-2">
                      <LoadingSpinner className="h-4 w-4" />
                      <span className="text-sm text-muted-foreground">Loading subscriptions...</span>
                    </div>
                  )
                : (
                    <Select value={selectedSubscriptionId} onValueChange={setSelectedSubscriptionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subscription (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionList.map(subscription => (
                          <SelectItem key={subscription.id} value={subscription.id}>
                            <div className="flex flex-col gap-1">
                              <span>{subscription.product?.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {subscription.currentPrice ? `${subscription.currentPrice.toLocaleString()} Toman` : ''}
                                {' '}
                                /
                                {subscription.billingPeriod}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
            </div>
          )}

          {/* Selected Details */}
          {selectedPaymentMethod && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selected Details:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm">{selectedPaymentMethod.cardMask}</span>
                </div>
                {selectedSubscription && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Subscription:</span>
                      <span className="text-sm">{selectedSubscription.product?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Monthly Amount:</span>
                      <span className="text-sm">
                        {selectedSubscription.currentPrice?.toLocaleString()}
                        {' '}
                        Toman
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Information Alert */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Important Notes:</AlertTitle>
            <AlertDescription className="text-sm space-y-1">
              <div>• Automatic payment is only available for monthly subscriptions</div>
              <div>• On the due date, the subscription amount will be charged from your card</div>
              <div>• You can disable automatic payment at any time</div>
              <div>• Your card information is securely stored in ZarinPal</div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnableDirectDebit}
            disabled={isLoading || !selectedPaymentMethodId}
            className="min-w-32"
          >
            {enableDirectDebit.isPending
              ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Enabling...
                  </>
                )
              : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
