'use client';

import { CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useCreateDirectDebitContractMutation } from '@/hooks/mutations/payment-methods';
import { formatTomanCurrency } from '@/lib/format';
import { toastManager } from '@/lib/toast/toast-manager';
import { cn } from '@/lib/ui/cn';
import { getPaymentMethodsService } from '@/services/api/payment-methods';

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
  contractId: string;
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

  const createContractMutation = useCreateDirectDebitContractMutation();

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

      const result = await getPaymentMethodsService();

      if (result.success && result.data) {
        const activePaymentMethod = result.data.find(
          pm => pm.contractType === 'direct_debit_contract'
            && pm.contractStatus === 'active'
            && pm.isActive,
        );

        if (activePaymentMethod) {
          setAuthorizationStatus('verified');
          setCurrentStep('completed');
          toastManager.success(t('bankSetup.messages.authorizationCompleted'));

          localStorage.removeItem('bank-authorization-contract');

          setTimeout(() => {
            onSuccess?.(activePaymentMethod.id);
          }, 2000);
        } else {
          // Still waiting for user to complete authorization
          setTimeout(() => {
            checkAuthorizationStatus();
          }, 5000);
        }
      } else {
        // API call failed, retry after a longer delay
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
      // Calculate expiry date (1 year from now)
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      const expireAt = expireDate.toISOString().replace('T', ' ').substring(0, 19);

      const result = await createContractMutation.mutateAsync({
        json: {
          mobile: data.mobile,
          ssn: data.nationalCode || undefined,
          expireAt,
          maxDailyCount: '5',
          maxMonthlyCount: '50',
          maxAmount: '50000000',
        },
      });

      if (result.success && result.data) {
        setContactData(data);

        // Banks are now included in the contract creation response
        setContractData({
          contractId: result.data.contractId,
          paymanAuthority: result.data.paymanAuthority,
          contractSigningUrl: result.data.signingUrlTemplate, // Updated property name
          banks: result.data.banks, // Banks are now included in response
          contractParams: {
            mobile: data.mobile,
            expireAt,
            maxDailyCount: '5',
            maxMonthlyCount: '50',
            maxAmount: '50000000',
          },
        });
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
      contractId: contractData.contractId,
      paymanAuthority: contractData.paymanAuthority,
      selectedBankCode: data.selectedBankCode,
      selectedBankName: selectedBank.name,
      mobile: contactData.mobile,
      nationalCode: contactData.nationalCode,
      maxDailyCount: 5,
      maxMonthlyCount: 50,
      maxAmount: 50000000,
    }));

    const authUrl = `https://www.zarinpal.com/pg/StartPayman/${contractData.paymanAuthority}/${data.selectedBankCode}`;

    // Open bank authorization in the same window to ensure proper callback handling
    // This prevents localStorage issues when callback opens in a different context
    window.location.href = authUrl;
  };

  const handleRetryAuthorization = () => {
    setCurrentStep('bank');
    setAuthorizationStatus('waiting');
  };

  const handleCancelAuthorization = () => {
    // Clear stored contract data
    localStorage.removeItem('bank-authorization-contract');

    // Reset to bank selection step
    setCurrentStep('bank');
    setAuthorizationStatus('waiting');

    toastManager.info(t('bankSetup.authorization.cancelContractDescription'));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'contact':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                {t('bankSetup.contact.description')}
              </p>
            </div>

            <BillingContactForm
              onSubmit={handleContactSubmit}
              onCancel={onCancel}
              isLoading={createContractMutation.isPending}
            />
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
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
            onCancel={handleCancelAuthorization}
          />
        );

      case 'completed':
        return <BankAuthorizationCompletion />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">{t('bankSetup.title')}</h2>
        <p className="text-muted-foreground">
          {t('bankSetup.subtitle')}
        </p>
      </div>

      {/* Progress indicator - minimal dots */}
      <div className="flex items-center justify-center space-x-2">
        {steps.map(step => (
          <div
            key={step.id}
            className={cn(
              'h-2 w-8 rounded-full transition-all duration-200',
              step.status === 'completed'
                ? 'bg-primary'
                : step.status === 'current'
                  ? 'bg-primary/60'
                  : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* Selected product info */}
      {selectedProduct && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">
                {t('bankSetup.contact.selectedPlan', {
                  planName: selectedProduct.name,
                  price: formatTomanCurrency(selectedProduct.price),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current step title */}
      <div className="text-center">
        <h3 className="text-lg font-medium">
          {steps.find(step => step.status === 'current')?.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('bankSetup.stepIndicator', {
            current: steps.findIndex(step => step.status === 'current') + 1,
            total: steps.length,
          })}
        </p>
      </div>

      {/* Content area */}
      <div className="w-full">
        {renderStepContent()}
      </div>
    </div>
  );
}
