'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Calendar, Check, Clock, CreditCard, Package, RefreshCw, User, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormProvider, RHFShadcnRadioGroup } from '@/components/RHF';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { useChangePlanMutation } from '@/hooks/mutations/subscriptions';
import { useProductsQuery } from '@/hooks/queries/products';
import { useSubscriptionQuery } from '@/hooks/queries/subscriptions';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

// Form schema for plan change
const changePlanSchema = z.object({
  productId: z.string().min(1, 'Please select a plan'),
  effectiveDate: z.enum(['immediate', 'next_billing_cycle']),
});

type ChangePlanFormValues = z.infer<typeof changePlanSchema>;

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

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return Check;
    case 'canceled':
    case 'expired':
      return X;
    case 'pending':
      return Clock;
    default:
      return AlertCircle;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'text-green-600';
    case 'canceled':
      return 'text-gray-600';
    case 'expired':
      return 'text-red-600';
    case 'pending':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

type ChangePlanDialogProps = {
  subscription: {
    id: string;
    productId: string;
    currentPrice: number;
    billingPeriod: string;
    product?: { name?: string };
  };
  onChangePlan: (newProductId: string, effectiveDate: 'immediate' | 'next_billing_cycle') => void;
  isLoading: boolean;
};

function ChangePlanDialog({ subscription, onChangePlan, isLoading }: ChangePlanDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ChangePlanFormValues>({
    resolver: zodResolver(changePlanSchema),
    defaultValues: {
      productId: '',
      effectiveDate: 'immediate',
    },
  });

  const selectedProductId = form.watch('productId');

  const { data: products } = useProductsQuery({ query: { limit: '50' } });

  const availableProducts = products?.success && Array.isArray(products.data)
    ? products.data.filter(product =>
        product.isActive
        && product.id !== subscription.productId
        && product.billingPeriod === subscription.billingPeriod,
      )
    : [];

  const selectedProduct = availableProducts.find(p => p.id === selectedProductId);

  // Create options for the radio group
  const planOptions = availableProducts.map(product => ({
    value: product.id,
    label: `${product.name} - ${formatTomanCurrency(product.price)} per ${product.billingPeriod}`,
    description: product.description || undefined,
  }));

  const effectiveDateOptions = [
    {
      value: 'immediate',
      label: 'Immediately',
      description: `Change will take effect now.${selectedProduct?.price && selectedProduct.price > subscription.currentPrice ? ' You may need to pay a prorated amount for the upgrade.' : ''}`,
    },
    {
      value: 'next_billing_cycle',
      label: 'At next billing cycle',
      description: 'Change will take effect on your next billing date. No immediate payment required.',
    },
  ];

  const onSubmit = (data: ChangePlanFormValues) => {
    onChangePlan(data.productId, data.effectiveDate);
    setOpen(false);
    form.reset();
  };

  const resetForm = () => {
    form.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-1" />
          Change Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            Choose a new plan for your subscription. You can upgrade or downgrade at any time.
          </DialogDescription>
        </DialogHeader>

        <FormProvider methods={form}>
          <form id="change-plan-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Current Plan</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{subscription.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTomanCurrency(subscription.currentPrice)}
                      {' '}
                      per
                      {subscription.billingPeriod}
                    </p>
                  </div>
                </div>
              </div>

              {/* Available Plans */}
              {availableProducts.length === 0
                ? (
                    <div>
                      <h3 className="font-medium mb-3">Available Plans</h3>
                      <p className="text-muted-foreground text-center py-4">
                        No other plans available for your billing period.
                      </p>
                    </div>
                  )
                : (
                    <RHFShadcnRadioGroup
                      name="productId"
                      title="Available Plans"
                      options={planOptions}
                      required
                    />
                  )}

              {/* Effective Date Selection */}
              {selectedProduct && (
                <RHFShadcnRadioGroup
                  name="effectiveDate"
                  title="When should this change take effect?"
                  options={effectiveDateOptions}
                  required
                />
              )}
            </div>
          </form>
        </FormProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-plan-form"
            disabled={!selectedProductId || isLoading}
          >
            {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
            Change Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SubscriptionDetailsProps = {
  subscriptionId: string;
  onBack?: () => void;
};

export function SubscriptionDetails({ subscriptionId, onBack }: SubscriptionDetailsProps) {
  const { data: subscriptionResponse, isLoading, error } = useSubscriptionQuery(subscriptionId);
  const changePlanMutation = useChangePlanMutation();

  // Handle the subscription data - it's coming as a single object, not an array
  const subscription = subscriptionResponse?.success && subscriptionResponse.data ? subscriptionResponse.data : null;

  const handleChangePlan = async (newProductId: string, effectiveDate: 'immediate' | 'next_billing_cycle') => {
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await changePlanMutation.mutateAsync({
        param: { id: subscriptionId },
        json: {
          newProductId,
          callbackUrl,
          effectiveDate,
        },
      });

      if (result.success && result.data?.paymentUrl) {
        toast.success('Redirecting to payment for upgrade...');
        window.location.href = result.data.paymentUrl;
      } else if (result.success) {
        toast.success('Plan changed successfully!');
      } else {
        toast.error('Failed to change plan. Please try again.');
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
      toast.error('Failed to change plan. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading subscription details...</span>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-destructive mb-2">Failed to load subscription details</p>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Go Back
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(subscription.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Details</h2>
          <p className="text-muted-foreground">
            Detailed information about your subscription
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back to Subscriptions
          </Button>
        )}
      </div>

      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {subscription.product?.name}
          </CardTitle>
          <CardDescription>
            {subscription.product?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${getStatusColor(subscription.status)}`} />
            <Badge variant={getStatusBadgeVariant(subscription.status)}>
              {subscription.status.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              as of
              {' '}
              {new Date(subscription.updatedAt).toLocaleDateString()}
            </span>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing Information
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-bold">{formatTomanCurrency(subscription.currentPrice)}</p>
                  <p className="text-sm text-muted-foreground">
                    per
                    {' '}
                    {subscription.billingPeriod === 'monthly' ? 'month' : 'one-time'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Period</p>
                  <p className="text-lg capitalize">{subscription.billingPeriod}</p>
                </div>

                {subscription.nextBillingDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                    <p className="text-lg">{new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Started</p>
                  <p className="text-lg">{new Date(subscription.startDate).toLocaleDateString()}</p>
                </div>

                {subscription.endDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {subscription.status === 'canceled' ? 'Canceled' : 'Ends'}
                    </p>
                    <p className="text-lg">{new Date(subscription.endDate).toLocaleDateString()}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-lg">{new Date(subscription.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subscription ID</p>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                {subscription.id}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Product ID</p>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                {subscription.productId}
              </p>
            </div>

            {subscription.zarinpalDirectDebitToken && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="text-sm">
                  <Badge variant="outline" className="text-xs">
                    ZarinPal Direct Debit Enabled
                  </Badge>
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm">{new Date(subscription.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Available Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {subscription.status === 'active' && (
              <>
                <ChangePlanDialog
                  subscription={subscription}
                  onChangePlan={handleChangePlan}
                  isLoading={changePlanMutation.isPending}
                />
                <Button variant="outline">
                  Update Payment Method
                </Button>
                <Button variant="outline">
                  Pause Subscription
                </Button>
                <Button variant="destructive" size="sm">
                  Cancel Subscription
                </Button>
              </>
            )}

            {subscription.status === 'canceled' && (
              <Button>
                Reactivate Subscription
              </Button>
            )}

            <Button variant="outline">
              Download Receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
