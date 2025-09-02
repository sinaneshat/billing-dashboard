'use client';

import { BanknoteIcon, CheckCircle, Clock, CreditCard, Plus, Shield, Star, Trash2 } from 'lucide-react';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardCard, DashboardDataCard } from '@/components/ui/dashboard-card';
import { DashboardPageHeader } from '@/components/ui/dashboard-header';
import { DashboardEmpty, DashboardError, DashboardLoading, DashboardPage, DashboardSection } from '@/components/ui/dashboard-states';
import { useDeletePaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { staleWhileRevalidate, useOptimisticMutationWithFeedback, useQueryUIState } from '@/hooks/utils/query-helpers';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-notifications';

export default function PaymentMethodsScreen() {
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  // Enhanced query and mutation state management
  const paymentMethodsUIState = useQueryUIState(paymentMethodsQuery);
  const paymentMethodsStaleState = staleWhileRevalidate(paymentMethodsQuery);

  const deleteWithFeedback = useOptimisticMutationWithFeedback(deletePaymentMethodMutation, {
    successMessage: 'Payment method removed successfully',
    errorMessage: 'Failed to remove payment method',
    loadingMessage: 'Removing payment method...',
    showToast: (type, message) => {
      if (type === 'success')
        showSuccessToast(message);
      else if (type === 'error')
        showErrorToast(message);
      // Note: loading toasts not supported in this implementation
    },
  });

  const setDefaultWithFeedback = useOptimisticMutationWithFeedback(setDefaultPaymentMethodMutation, {
    successMessage: 'Default payment method updated',
    errorMessage: 'Failed to update default payment method',
    loadingMessage: 'Updating default payment method...',
    showToast: (type, message) => {
      if (type === 'success')
        showSuccessToast(message);
      else if (type === 'error')
        showErrorToast(message);
      // Note: loading toasts not supported in this implementation
    },
  });

  const paymentMethodList = paymentMethodsStaleState.data?.success && Array.isArray(paymentMethodsStaleState.data.data)
    ? paymentMethodsStaleState.data.data
    : [];

  const handleSetDefault = async (paymentMethodId: string) => {
    setDefaultPaymentMethodMutation.mutate({ param: { id: paymentMethodId } });
  };

  const handleDelete = async (paymentMethodId: string) => {
    deletePaymentMethodMutation.mutate({ param: { id: paymentMethodId } });
  };

  // Show loading state on initial load
  if (paymentMethodsUIState.showSkeleton) {
    return (
      <DashboardLoading
        title="Loading Payment Methods"
        message="Fetching your direct debit contracts..."
      />
    );
  }

  // Show error state
  if (paymentMethodsUIState.showError) {
    return (
      <DashboardError
        title="Unable to Load Payment Methods"
        message="There was a problem loading your payment methods. Please check your connection and try again."
        onRetry={() => paymentMethodsQuery.refetch()}
        icon={<CreditCard className="h-8 w-8 text-destructive" />}
      />
    );
  }

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Direct Debit Contracts"
        description="Manage your ZarinPal direct debit contracts for automatic subscription billing"
      />

      <DashboardSection delay={0.1}>
        <DashboardCard
          title="Secure Direct Debit Contracts"
          description="Direct debit contracts are securely processed through ZarinPal's Payman system. Contract signatures are encrypted and stored securely by ZarinPal, enabling automatic billing without storing your banking details."
          icon={<Shield className="h-5 w-5 text-primary" />}
          shadow="sm"
        >
          <div className="text-sm text-muted-foreground">
            Your banking details are never stored on our servers. All transactions are processed securely through ZarinPal's encrypted system.
          </div>
        </DashboardCard>
      </DashboardSection>

      <DashboardSection delay={0.15}>
        {/* Existing Direct Debit Contracts */}
        {paymentMethodList.length > 0
          ? (
              <DashboardCard
                title="Your Direct Debit Contracts"
                description={`${paymentMethodList.length} active contract${paymentMethodList.length !== 1 ? 's' : ''}`}
                icon={<BanknoteIcon className="h-5 w-5 text-primary" />}
                headerAction={(
                  <DirectDebitContractSetup
                    onSuccess={(_contractId) => {
                      showSuccessToast('Direct debit contract created successfully!');
                    }}
                  >
                    <Button size="sm" startIcon={<Plus className="h-4 w-4" />}>
                      Add Contract
                    </Button>
                  </DirectDebitContractSetup>
                )}
              >
                <div className="space-y-4">
                  {paymentMethodList.map(method => (
                    <DashboardDataCard
                      key={method.id}
                      title={method.contractDisplayName || 'Direct Debit Contract'}
                      subtitle={method.contractMobile || undefined}
                      status={(
                        <>
                          <Badge variant={method.contractStatus === 'active' ? 'success' : 'secondary'} className="gap-1">
                            {method.contractStatus === 'active' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {method.contractStatus === 'active' ? 'Active' : 'Pending'}
                          </Badge>
                          {method.isPrimary && (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              Primary
                            </Badge>
                          )}
                        </>
                      )}
                      icon={<CreditCard className="h-6 w-6 text-primary" />}
                      primaryInfo={<span className="text-sm text-muted-foreground">ZarinPal Direct Debit</span>}
                      actions={(
                        <div className="flex items-center gap-2">
                          {!method.isPrimary && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(method.id)}
                              loading={setDefaultWithFeedback.isPending && setDefaultWithFeedback.variables?.param.id === method.id}
                              loadingText="Setting..."
                              startIcon={<Star className="h-3 w-3" />}
                            >
                              Set Primary
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(method.id)}
                            loading={deleteWithFeedback.isPending && deleteWithFeedback.variables?.param.id === method.id}
                            startIcon={<Trash2 className="h-4 w-4" />}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete payment method"
                          />
                        </div>
                      )}
                    />
                  ))}
                </div>
              </DashboardCard>
            )
          : (
              <DashboardEmpty
                title="No Payment Methods Yet"
                description="Setup a secure direct debit contract with ZarinPal to enable seamless automatic billing. Your bank details stay secure with ZarinPal's encrypted system."
                icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
                action={(
                  <DirectDebitContractSetup
                    onSuccess={(_contractId) => {
                      showSuccessToast('Direct debit contract created successfully!');
                    }}
                  >
                    <Button size="lg" startIcon={<Plus className="h-5 w-5" />}>
                      Create First Contract
                    </Button>
                  </DirectDebitContractSetup>
                )}
              />
            )}
      </DashboardSection>

      <DashboardSection delay={0.2}>
        <DashboardCard
          title="How ZarinPal Direct Debit Works"
          description="Simple, secure, and automatic billing through Iran's most trusted payment gateway"
          shadow="sm"
        >
          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: '1. Create Contract',
                  description: 'Setup a secure direct debit contract with your mobile number and national ID',
                  color: 'blue',
                },
                {
                  icon: BanknoteIcon,
                  title: '2. Sign with Bank',
                  description: 'Select your bank and sign the contract directly on your bank\'s secure website',
                  color: 'green',
                },
                {
                  icon: CheckCircle,
                  title: '3. Auto-billing Active',
                  description: 'Your subscriptions will automatically renew using the secure signed contract',
                  color: 'purple',
                },
              ].map(step => (
                <div key={step.title} className="text-center space-y-4 group">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 group-hover:scale-105 transition-transform">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h5 className="font-semibold text-lg">Contract Terms & Limits</h5>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                {[
                  { label: 'Contract Duration', value: '1 Year (auto-renewable)' },
                  { label: 'Daily Transaction Limit', value: '10 transactions' },
                  { label: 'Monthly Transaction Limit', value: '100 transactions' },
                  { label: 'Maximum Amount per Transaction', value: '500,000 Toman' },
                ].map(term => (
                  <div key={term.label} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                    <span className="text-muted-foreground">
                      {term.label}
                      :
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">{term.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardCard>
      </DashboardSection>
    </DashboardPage>
  );
}
