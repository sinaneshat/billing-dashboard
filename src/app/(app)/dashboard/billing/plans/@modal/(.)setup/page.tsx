'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { BankAuthorizationStepper } from '@/components/billing/bank-authorization-stepper';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toastManager } from '@/lib/toast/toast-manager';

export default function SetupPlansModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName');
  const productPrice = searchParams.get('productPrice');

  const selectedProduct = productId && productName && productPrice
    ? {
        id: productId,
        name: productName,
        price: Number(productPrice),
      }
    : undefined;

  // Open modal after component mounts (intercepted route behavior)
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSuccess = (_contractId: string) => {
    toastManager.success(t('bankSetup.messages.setupCompleted'));
    setOpen(false);
    // Small delay to allow modal close animation
    setTimeout(() => {
      router.push('/dashboard/billing/subscriptions');
    }, 150);
  };

  const handleCancel = () => {
    setOpen(false);
    // Small delay to allow modal close animation
    setTimeout(() => {
      router.back();
    }, 150);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto w-full">
        <div className="w-full min-w-0 overflow-hidden">
          <BankAuthorizationStepper
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            selectedProduct={selectedProduct}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
