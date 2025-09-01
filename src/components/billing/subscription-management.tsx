'use client';

import { Calendar, Eye, Package, Plus, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { SubscriptionDetails } from '@/components/billing/subscription-details';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCancelSubscriptionMutation, useResubscribeMutation } from '@/hooks/mutations/subscriptions';
import { useSubscriptionsQuery } from '@/hooks/queries/subscriptions';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'canceled':
      return 'secondary';
    case 'expired':
      return 'destructive';
    case 'pending':
      return 'outline';
    default:
      return 'secondary';
  }
}

type CancelSubscriptionDialogProps = {
  subscription: {
    id: string;
    product?: { name?: string };
    status: string;
    currentPrice?: number;
    billingPeriod?: string;
  };
  onCancel: (subscriptionId: string, reason?: string) => void;
  isLoading: boolean;
};

function CancelSubscriptionDialog({ subscription, onCancel, isLoading }: CancelSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = () => {
    onCancel(subscription.id, reason);
    setOpen(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription to
            {' '}
            {subscription.product?.name}
            ?
            This action cannot be undone and you will lose access to premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Current Plan</span>
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {subscription.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{subscription.product?.name}</p>
            <p className="text-lg font-semibold">
              {subscription.currentPrice ? formatTomanCurrency(subscription.currentPrice) : 'N/A'}
              {' '}
              /
              {subscription.billingPeriod || 'month'}
            </p>
          </div>

          <div>
            <Label htmlFor="cancellation-reason" className="block text-sm font-medium mb-2">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Tell us why you're canceling..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
            Cancel Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionManagement() {
  const { data: subscriptions, isLoading, error, refetch } = useSubscriptionsQuery();
  const cancelMutation = useCancelSubscriptionMutation();
  const resubscribeMutation = useResubscribeMutation();
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  const subscriptionList = subscriptions?.success && Array.isArray(subscriptions.data)
    ? subscriptions.data
    : [];

  const handleCancelSubscription = async (subscriptionId: string, reason?: string) => {
    try {
      await cancelMutation.mutateAsync({
        param: { id: subscriptionId },
        json: { reason },
      });
      toast.success('Subscription canceled successfully');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    }
  };

  const handleResubscribe = async (subscriptionId: string) => {
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await resubscribeMutation.mutateAsync({
        param: { id: subscriptionId },
        json: { callbackUrl },
      });

      if (result.success && result.data?.paymentUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.data.paymentUrl;
      } else {
        toast.error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Failed to resubscribe:', error);
      toast.error('Failed to reactivate subscription. Please try again.');
    }
  };

  // Show subscription details if one is selected
  if (selectedSubscriptionId) {
    return (
      <SubscriptionDetails
        subscriptionId={selectedSubscriptionId}
        onBack={() => setSelectedSubscriptionId(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading subscriptions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-destructive mb-2">Failed to load subscriptions</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionList.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Subscriptions Found</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any subscriptions yet. Choose a plan to get started.
            </p>
            <Button asChild>
              <Link href="/dashboard/billing/plans">
                <Plus className="h-4 w-4 mr-2" />
                Browse Plans
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Subscriptions</h2>
          <p className="text-muted-foreground">
            Manage your active and past subscriptions
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/billing/plans">
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {subscriptionList.map(subscription => (
          <Card key={subscription.id} className="w-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {subscription.product?.name}
                  </CardTitle>
                  <CardDescription>
                    {subscription.product?.description}
                  </CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p className="text-xl font-bold">{formatTomanCurrency(subscription.currentPrice)}</p>
                  <p className="text-sm text-muted-foreground">
                    per
                    {subscription.billingPeriod}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-lg">{new Date(subscription.startDate).toLocaleDateString()}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {subscription.status === 'canceled' ? 'Canceled On' : 'Next Billing'}
                  </p>
                  <p className="text-lg">
                    {subscription.endDate && subscription.status === 'canceled'
                      ? new Date(subscription.endDate).toLocaleDateString()
                      : subscription.nextBillingDate
                        ? new Date(subscription.nextBillingDate).toLocaleDateString()
                        : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription ID</p>
                  <p className="text-sm font-mono text-muted-foreground">{subscription.id}</p>
                </div>
              </div>

              {subscription.directDebitContractId && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Automatic payments are enabled for this subscription
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div className="flex gap-2">
                {subscription.status === 'active' && (
                  <CancelSubscriptionDialog
                    subscription={subscription}
                    onCancel={handleCancelSubscription}
                    isLoading={cancelMutation.isPending}
                  />
                )}

                {subscription.status === 'canceled' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleResubscribe(subscription.id)}
                    disabled={resubscribeMutation.isPending}
                  >
                    {resubscribeMutation.isPending && <LoadingSpinner className="h-4 w-4 mr-2" />}
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reactivate
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubscriptionId(subscription.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
