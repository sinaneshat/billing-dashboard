'use client';

import { Building2, CreditCard, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { StepIndicator } from '@/components/ui/step-indicator';
import { useInitiateDirectDebitContractMutation } from '@/hooks/mutations/payment-methods';
import { useMutationUIState } from '@/hooks/utils/query-helpers';
import { formatTomanCurrency } from '@/lib/format';
import { toastManager } from '@/lib/toast/toast-manager';
import { cn } from '@/lib/ui/cn';

import type { BankSelectionFormData } from '../forms/bank-selection-form';
import { BankSelectionForm } from '../forms/bank-selection-form';
import type { BillingContactFormData } from '../forms/billing-contact-form';
import { BillingContactForm } from '../forms/billing-contact-form';
import { AuthorizationStatusDisplay } from './authorization-status-display';
import { BankAuthorizationCompletion } from './bank-authorization-completion';

type BankAuthorizationStepperOrchestratorProps = {
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
  selectedProduct?: {
    id: string;
    name: string;
    price: number;
  };
};

type Bank = {
  name: string;
  slug: string;
  bankCode: string;
  maxDailyAmount: number;
  maxDailyCount: number | null;
};

type ContractData = {
  paymanAuthority: string;
  banks: Bank[];
  contractSigningUrl: string;
  contractParams: Record<string, unknown>;
};

type Step = 'contact' | 'bank' | 'authorization' | 'completed';
type AuthorizationStatus = 'waiting' | 'checking' | 'verified' | 'failed';

export function BankAuthorizationStepperOrchestrator({
  onSuccess,
  onCancel,
  selectedProduct,
}: BankAuthorizationStepperOrchestratorProps) {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [contactData, setContactData] = useState<BillingContactFormData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatus>('waiting');

  const initiateContractMutation = useInitiateDirectDebitContractMutation();
  const mutationUI = useMutationUIState(initiateContractMutation);

  const steps = [
    {
      id: 'contact',
      title: t('bankSetup.steps.contact.title'),
      description: t('bankSetup.steps.contact.description'),
      status: currentStep === 'contact'
        ? 'current' as const
        : ['bank', 'authorization', 'completed'].includes(currentStep)
            ? 'completed' as const
            : 'pending' as const,
    },
    {
      id: 'bank',
      title: t('bankSetup.steps.bank.title'),
      description: t('bankSetup.steps.bank.description'),
      status: currentStep === 'bank'
        ? 'current' as const
        : ['authorization', 'completed'].includes(currentStep)
            ? 'completed' as const
            : 'pending' as const,
    },
    {
      id: 'authorization',
      title: t('bankSetup.steps.authorization.title'),
      description: t('bankSetup.steps.authorization.description'),
      status: currentStep === 'authorization'
        ? 'current' as const
        : currentStep === 'completed'
          ? 'completed' as const
          : 'pending' as const,
    },
    {
      id: 'completed',
      title: t('bankSetup.steps.completed.title'),
      description: t('bankSetup.steps.completed.description'),
      status: currentStep === 'completed' ? 'current' as const : 'pending' as const,
    },
  ];

  const checkAuthorizationStatus = useCallback(async () => {
    try {
      const storedContract = localStorage.getItem('bank-authorization-contract');
      if (!storedContract) {
        setAuthorizationStatus('failed');
        toastManager.error(t('bankSetup.errors.authorizationCheckFailed'));
        return;
      }

      const contractInfo = JSON.parse(storedContract);

      const response = await fetch('/api/v1/payment-methods/check-direct-debit-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymanAuthority: contractInfo.paymanAuthority,
        }),
      });

      if (response.ok) {
        const result = await response.json() as {
          success: boolean;
          data?: {
            status: string;
            contractId?: string;
          };
        };

        if (result.success && result.data?.status === 'active') {
          setAuthorizationStatus('verified');
          setCurrentStep('completed');
          toastManager.success(t('bankSetup.messages.authorizationCompleted'));

          localStorage.removeItem('bank-authorization-contract');

          setTimeout(() => {
            onSuccess?.(result.data?.contractId || 'success');
          }, 2000);
        } else if (result.data?.status === 'cancelled' || result.data?.status === 'failed') {
          setAuthorizationStatus('failed');
          toastManager.error(t('bankSetup.errors.authorizationFailed'));
          localStorage.removeItem('bank-authorization-contract');
        } else {
          setTimeout(() => {
            checkAuthorizationStatus();
          }, 5000);
        }
      } else {
        setTimeout(() => {
          checkAuthorizationStatus();
        }, 10000);
      }
    } catch (error) {
      console.error('Authorization status check failed:', error);
      setTimeout(() => {
        checkAuthorizationStatus();
      }, 10000);
    }
  }, [onSuccess, t]);

  const handleContactSubmit = async (data: BillingContactFormData) => {
    try {
      const result = await initiateContractMutation.mutateAsync({
        json: {
          mobile: data.mobile,
          ssn: data.nationalCode || undefined,
          callbackUrl: `${window.location.origin}/dashboard/billing/methods?setup=success`,
          contractDurationDays: 365,
          maxDailyCount: 5,
          maxMonthlyCount: 50,
          maxAmount: 50000000,
        },
      });

      if (result.success && result.data) {
        setContactData(data);
        setContractData(result.data);
        setCurrentStep('bank');
        toastManager.success(t('bankSetup.messages.contactSubmitted'));
      } else {
        throw new Error(t('bankSetup.errors.contactSubmitFailed'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('bankSetup.errors.contactSubmitFailed');
      toastManager.error(errorMessage);
    }
  };

  const handleBankSelection = async (data: BankSelectionFormData) => {
    if (!contractData || !contactData) {
      toastManager.error(t('bankSetup.errors.selectBank'));
      return;
    }

    const selectedBank = contractData.banks.find(b => b.bankCode === data.selectedBankCode);
    if (!selectedBank) {
      toastManager.error(t('bankSetup.errors.invalidBank'));
      return;
    }

    setCurrentStep('authorization');
    setAuthorizationStatus('waiting');
    toastManager.info(t('bankSetup.messages.redirectingToBank', { bankName: selectedBank.name }));

    localStorage.setItem('bank-authorization-contract', JSON.stringify({
      paymanAuthority: contractData.paymanAuthority,
      selectedBankCode: data.selectedBankCode,
      selectedBankName: selectedBank.name,
      mobile: contactData.mobile,
      nationalCode: contactData.nationalCode,
    }));

    const authUrl = `https://www.zarinpal.com/pg/StartPayman/${contractData.paymanAuthority}/${data.selectedBankCode}`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      setAuthorizationStatus('checking');
      checkAuthorizationStatus();
    }, 3000);
  };

  const handleRetryAuthorization = () => {
    setCurrentStep('bank');
    setAuthorizationStatus('waiting');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'contact':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('bankSetup.contact.description')}
              </p>
            </div>

            <BillingContactForm
              onSubmit={handleContactSubmit}
              onCancel={onCancel}
              isLoading={mutationUI.isPending}
            />

            {selectedProduct && (
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  {t('bankSetup.contact.selectedPlan', {
                    planName: selectedProduct.name,
                    price: formatTomanCurrency(selectedProduct.price),
                  })}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('bankSetup.bank.description')}
              </p>
            </div>

            {contractData && (
              <BankSelectionForm
                banks={contractData.banks}
                onSubmit={handleBankSelection}
                onBack={() => setCurrentStep('contact')}
              />
            )}
          </div>
        );

      case 'authorization':
        return (
          <AuthorizationStatusDisplay
            status={authorizationStatus}
            onRetry={handleRetryAuthorization}
          />
        );

      case 'completed':
        return <BankAuthorizationCompletion />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('bankSetup.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('bankSetup.subtitle')}
        </p>
      </div>

      <StepIndicator
        steps={steps}
        className={cn('justify-center', currentStep === 'completed' && 'opacity-75')}
      />

      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>
    </div>
  );
}
