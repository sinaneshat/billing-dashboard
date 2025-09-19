'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { BankAuthorizationStepper } from '@/components/billing/bank-authorization-stepper';
import { toastManager } from '@/lib/toast/toast-manager';

export default function SetupPlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

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

  const handleSuccess = (_contractId: string) => {
    toastManager.success(t('bankSetup.messages.setupCompleted'));
    router.push('/dashboard/billing/subscriptions');
  };

  const handleCancel = () => {
    router.push('/dashboard/billing/plans');
  };

  return (
    <div className="container mx-auto py-8">
      <BankAuthorizationStepper
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        selectedProduct={selectedProduct}
      />
    </div>
  );
}
