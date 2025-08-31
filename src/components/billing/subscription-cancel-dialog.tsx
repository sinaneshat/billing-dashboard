'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
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

export function SubscriptionCancelDialog({ subscription, children }: SubscriptionCancelDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const cancelMutation = useCancelSubscriptionMutation();

  const handleCancel = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for cancellation');
      return;
    }

    const reason = selectedReason === 'other'
      ? customReason.trim() || 'No reason provided'
      : cancellationReasons.find(r => r.value === selectedReason)?.label || selectedReason;

    try {
      await cancelMutation.mutateAsync({
        param: { id: subscription.id },
        json: { reason },
      });

      toast.success('Subscription canceled successfully');
      setOpen(false);
      setSelectedReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
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
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you canceling?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {cancellationReasons.map(reason => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-medium">
                Please tell us more:
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Help us understand how we can improve..."
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
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

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={cancelMutation.isPending}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
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
