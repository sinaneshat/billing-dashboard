'use client';

import { CreditCard, Loader2, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  useInitiateCardAdditionMutation,
  useVerifyCardAdditionMutation,
} from '@/hooks/mutations/payment-methods';

type CardAdditionDialogProps = {
  children?: React.ReactNode;
  onSuccess?: (paymentMethod: {
    id: string;
    cardMask: string;
    cardType: string | null;
    isPrimary: boolean;
  }) => void;
};

export function CardAdditionDialog({ children, onSuccess }: CardAdditionDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initiateCardAddition = useInitiateCardAdditionMutation();
  const verifyCardAddition = useVerifyCardAdditionMutation();

  // Check if we're returning from ZarinPal verification
  useEffect(() => {
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');

    if (authority && (status === 'OK' || status === 'NOK')) {
      // We're returning from ZarinPal verification - set state in effect is acceptable for this case
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setOpen(true);

      verifyCardAddition.mutate(
        { authority, status },
        {
          onSuccess: (data) => {
            if (data.success && data.data?.verified && data.data?.paymentMethod) {
              toast.success('Card added successfully!');
              onSuccess?.(data.data.paymentMethod);
              setOpen(false);

              // Clean up URL parameters
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('Authority');
              newUrl.searchParams.delete('Status');
              router.replace(newUrl.pathname + newUrl.search);
            } else if (data.success && !data.data?.verified) {
              if (data.data?.error) {
                toast.error(`Card verification failed: ${data.data.error.message}`);
              } else {
                toast.error('Card verification was cancelled or failed');
              }
            } else {
              toast.error('Error verifying card');
            }
          },
          onError: () => {
            toast.error('Error verifying card. Please try again.');
          },
        },
      );
    }
  }, [searchParams, router, verifyCardAddition, onSuccess]);

  const handleAddCard = async () => {
    try {
      // Create callback URL for this page
      const callbackUrl = `${window.location.origin}${window.location.pathname}`;

      const result = await initiateCardAddition.mutateAsync({
        callbackUrl,
        metadata: {
          source: 'payment_methods_dialog',
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success && result.data?.verificationUrl) {
        // Redirect to ZarinPal for card verification
        window.location.href = result.data.verificationUrl;
      } else {
        toast.error('Error starting card addition process');
      }
    } catch (error) {
      console.error('Failed to initiate card addition:', error);
      toast.error('Error connecting to payment gateway');
    }
  };

  const isLoading = initiateCardAddition.isPending || verifyCardAddition.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            To enable automatic payments, verify your payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Card Verification Steps:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• You will be redirected to ZarinPal secure gateway</li>
              <li>• Enter your card information</li>
              <li>• A small amount (10 Toman) will be charged for verification</li>
              <li>• Your card will be saved for future payments</li>
            </ul>
          </div>

          {verifyCardAddition.isPending && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Verifying card...
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Please wait, your card is being verified.
              </p>
            </div>
          )}
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
            onClick={handleAddCard}
            disabled={isLoading}
            className="min-w-32"
          >
            {isLoading
              ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Redirecting...
                  </>
                )
              : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Verify Card
                  </>
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
