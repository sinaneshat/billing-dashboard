'use client';

import { Calendar, CreditCard, Shield } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';

export function PaymentMethods() {
  const { data: subscriptions } = useSubscriptionsQuery();

  const subscriptionList = subscriptions?.success && Array.isArray(subscriptions.data)
    ? subscriptions.data
    : [];

  const subscriptionsWithDirectDebit = subscriptionList.filter(sub => sub.zarinpalDirectDebitToken);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payment Methods</h2>
        <p className="text-muted-foreground">
          Your payment methods are securely managed through ZarinPal
        </p>
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
          We never store your complete card details on our servers. Payment methods are saved
          automatically when you complete payments and managed through ZarinPal's secure system.
        </AlertDescription>
      </Alert>

      {/* Payment Methods Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Payment Processing</h3>
            <p className="text-muted-foreground mb-4">
              Your payment methods are automatically saved and managed securely through ZarinPal when you make payments.
              No additional setup required.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Payment methods are saved automatically during checkout</p>
              <p>• All card data is securely stored by ZarinPal</p>
              <p>• Automatic billing for recurring subscriptions</p>
            </div>
          </div>
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
            • Automatic payments will retry if your payment fails
          </p>
          <p className="text-sm text-muted-foreground">
            • Payment methods are saved automatically during transactions
          </p>
          <p className="text-sm text-muted-foreground">
            • Contact support if you have issues with payment processing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
