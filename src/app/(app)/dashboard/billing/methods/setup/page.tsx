'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { BankAuthorizationStepper } from '@/components/billing/bank-authorization-stepper';
import { toastManager } from '@/lib/toast/toast-manager';

export default function SetupMethodsPage() {
  const router = useRouter();
  const t = useTranslations();

  const handleSuccess = (_contractId: string) => {
    toastManager.success(t('bankSetup.messages.setupCompleted'));
    router.push('/dashboard/billing/methods');
  };

  const handleCancel = () => {
    router.push('/dashboard/billing/methods');
  };

  return (
    <div className="container mx-auto py-8">
      <BankAuthorizationStepper
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
