'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormProvider, RHFShadcnRadioGroup, RHFShadcnTextarea } from '@/components/RHF';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCancelSubscriptionMutation } from '@/hooks/mutations/subscriptions';

type SubscriptionCancelDialogProps = {
  subscription: {
    id: string;
    product?: { name?: string };
    currentPrice: number;
    billingPeriod: string;
  };
  children: React.ReactNode;
};

const cancellationReasons = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using_enough', label: 'Not using it enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'found_alternative', label: 'Found a better alternative' },
  { value: 'temporary', label: 'Temporarily don\'t need it' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'other', label: 'Other' },
];

// Form schema for subscription cancellation
const cancelSubscriptionSchema = z.object({
  selectedReason: z.string().min(1, 'Please select a reason for cancellation'),
  customReason: z.string().optional(),
});

type CancelSubscriptionFormValues = z.infer<typeof cancelSubscriptionSchema>;

export function SubscriptionCancelDialog({ subscription, children }: SubscriptionCancelDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CancelSubscriptionFormValues>({
    resolver: zodResolver(cancelSubscriptionSchema),
    defaultValues: {
      selectedReason: '',
      customReason: '',
    },
  });

  const selectedReason = form.watch('selectedReason');

  const cancelMutation = useCancelSubscriptionMutation();

  const onSubmit = async (data: CancelSubscriptionFormValues) => {
    const reason = data.selectedReason === 'other'
      ? data.customReason?.trim() || 'No reason provided'
      : cancellationReasons.find(r => r.value === data.selectedReason)?.label || data.selectedReason;

    try {
      await cancelMutation.mutateAsync({
        param: { id: subscription.id },
        json: { reason },
      });

      toast.success('Subscription canceled successfully');
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    }
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
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please help us improve by letting us know why you're canceling.
          </DialogDescription>
        </DialogHeader>

        <FormProvider methods={form}>
          <form id="cancel-subscription-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {/* Subscription Info */}
              <Alert>
                <div className="space-y-2">
                  <p className="font-medium">You're about to cancel:</p>
                  <div className="text-sm">
                    <p><strong>{subscription.product?.name}</strong></p>
                    <p className="text-muted-foreground">
                      Current billing: $
                      {subscription.currentPrice}
                      {' '}
                      /
                      {' '}
                      {subscription.billingPeriod}
                    </p>
                  </div>
                </div>
              </Alert>

              {/* Cancellation Reason */}
              <RHFShadcnRadioGroup
                name="selectedReason"
                title="Why are you canceling?"
                options={cancellationReasons}
                required
              />

              {/* Custom Reason Input */}
              {selectedReason === 'other' && (
                <RHFShadcnTextarea
                  name="customReason"
                  title="Please tell us more:"
                  placeholder="Help us understand how we can improve..."
                />
              )}

              {/* Cancellation Policy */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-1">What happens after cancellation:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• You'll retain access until your current billing period ends</li>
                  <li>• No future charges will be made</li>
                  <li>• You can reactivate anytime before the period ends</li>
                  <li>• Your data will be preserved for 30 days after cancellation</li>
                </ul>
              </div>
            </div>
          </form>
        </FormProvider>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={cancelMutation.isPending}
          >
            Keep Subscription
          </Button>
          <Button
            type="submit"
            form="cancel-subscription-form"
            variant="destructive"
            disabled={!selectedReason || cancelMutation.isPending}
          >
            {cancelMutation.isPending && <LoadingSpinner className="h-4 w-4 mr-2" />}
            <X className="h-4 w-4 mr-1" />
            Cancel Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
