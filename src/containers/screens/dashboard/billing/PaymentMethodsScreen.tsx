'use client';

import { BanknoteIcon, CheckCircle, Clock, CreditCard, Plus, Shield, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DirectDebitContractSetup } from '@/components/billing/direct-debit-contract-setup';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataStateIndicator, InfoState, NetworkError } from '@/components/ui/error-states';
import { CardSkeleton, PaymentMethodSkeleton } from '@/components/ui/skeleton';
import { useDeletePaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { usePaymentMethodsQuery } from '@/hooks/queries/payment-methods';
import { useOptimisticMutationWithFeedback, useQueryUIState, useStaleWhileRevalidate } from '@/hooks/utils/query-helpers';

// Enhanced skeleton components for payment methods using new skeleton patterns
function PaymentMethodsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header card skeleton */}
      <CardSkeleton className="border-0 shadow-lg" />

      {/* Payment methods list skeleton */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-accent animate-pulse rounded-md" />
              <div className="h-7 w-64 bg-accent animate-pulse rounded-md" />
            </div>
            <div className="h-10 w-36 bg-accent animate-pulse rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <PaymentMethodSkeleton key={`skeleton-${i}`} className="border border-border/50" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info card skeleton */}
      <CardSkeleton className="border-0 shadow-sm" />
    </div>
  );
}

export default function PaymentMethodsScreen() {
  const paymentMethodsQuery = usePaymentMethodsQuery();
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  // Enhanced query and mutation state management
  const paymentMethodsUIState = useQueryUIState(paymentMethodsQuery);
  const paymentMethodsStaleState = useStaleWhileRevalidate(paymentMethodsQuery);

  const deleteWithFeedback = useOptimisticMutationWithFeedback(deletePaymentMethodMutation, {
    successMessage: 'Payment method removed successfully',
    errorMessage: 'Failed to remove payment method',
    loadingMessage: 'Removing payment method...',
    showToast: (type, message) => {
      if (type === 'success')
        toast.success(message);
      else if (type === 'error')
        toast.error(message);
      else if (type === 'loading')
        toast.loading(message);
    },
  });

  const setDefaultWithFeedback = useOptimisticMutationWithFeedback(setDefaultPaymentMethodMutation, {
    successMessage: 'Default payment method updated',
    errorMessage: 'Failed to update default payment method',
    loadingMessage: 'Updating default payment method...',
    showToast: (type, message) => {
      if (type === 'success')
        toast.success(message);
      else if (type === 'error')
        toast.error(message);
      else if (type === 'loading')
        toast.loading(message);
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

  // Show skeleton on initial load
  if (paymentMethodsUIState.showSkeleton) {
    return <PaymentMethodsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Direct Debit Contracts"
        description="Manage your ZarinPal direct debit contracts for automatic subscription billing"
      />

      {/* Enhanced network status and data state indicators */}
      {paymentMethodsStaleState.showUpdating && (
        <DataStateIndicator
          variant="updating"
          title="Refreshing Payment Methods"
          description="Updating payment method data in background..."
        />
      )}

      {paymentMethodsUIState.showError && (
        <NetworkError
          variant="connection"
          title="Unable to Load Payment Methods"
          description="There was a problem loading your payment methods. Please check your connection and try again."
          showRetry={paymentMethodsUIState.showRetry}
          onRetry={() => paymentMethodsQuery.refetch()}
        />
      )}

      {paymentMethodsStaleState.showStaleWarning && (
        <DataStateIndicator
          variant="stale"
          title="Data May Be Outdated"
          description="Payment method information may not be current."
          showRetry={true}
          onRetry={() => paymentMethodsQuery.refetch()}
          retryLabel="Refresh now"
        />
      )}

      {/* Enhanced Security Notice */}
      <InfoState
        variant="info"
        title="Secure Direct Debit Contracts"
        description="Direct debit contracts are securely processed through ZarinPal's Payman system. Contract signatures are encrypted and stored securely by ZarinPal, enabling automatic billing without storing your banking details."
      />

      {/* Existing Direct Debit Contracts */}
      {paymentMethodList.length > 0
        ? (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BanknoteIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Your Direct Debit Contracts</CardTitle>
                      <CardDescription className="text-sm">
                        {paymentMethodList.length}
                        {' '}
                        active contract
                        {paymentMethodList.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <DirectDebitContractSetup
                    onSuccess={(_contractId) => {
                      toast.success('Direct debit contract created successfully!');
                    }}
                  >
                    <Button
                      size="sm"
                      startIcon={<Plus className="h-4 w-4" />}
                    >
                      Add Contract
                    </Button>
                  </DirectDebitContractSetup>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethodList.map(method => (
                    <Card key={method.id} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center border border-blue-200/50 dark:border-blue-700/50">
                              <CreditCard className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base">
                                  {method.contractDisplayName || 'Direct Debit Contract'}
                                </h3>
                                {method.isPrimary && (
                                  <Badge variant="default" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant={method.contractStatus === 'active' ? 'success' : 'secondary'} className="gap-1">
                                  {method.contractStatus === 'active' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  {method.contractStatus === 'active' ? 'Active' : 'Pending'}
                                </Badge>
                                {method.contractMobile && (
                                  <span className="flex items-center gap-1">
                                    •
                                    {' '}
                                    {method.contractMobile}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
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
                            >
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        : (
            <Card className="border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-background">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                    <BanknoteIcon className="h-5 w-5 text-primary/70" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Setup Your First Direct Debit Contract</CardTitle>
                    <CardDescription>
                      Get started with automatic billing for your subscriptions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 space-y-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mx-auto">
                    <CreditCard className="h-12 w-12 text-primary/60" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">No Payment Methods Yet</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                      Setup a secure direct debit contract with ZarinPal to enable seamless automatic billing.
                      Your bank details stay secure with ZarinPal's encrypted system.
                    </p>
                  </div>
                  <DirectDebitContractSetup
                    onSuccess={(_contractId) => {
                      toast.success('Direct debit contract created successfully!');
                    }}
                  >
                    <Button
                      size="lg"
                      className="h-12 px-8 text-base font-semibold rounded-xl"
                      startIcon={<Plus className="h-5 w-5" />}
                    >
                      Create First Contract
                    </Button>
                  </DirectDebitContractSetup>

                  {/* Benefits list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                    {[
                      { icon: Shield, text: 'Bank-level security' },
                      { icon: CheckCircle, text: 'Automatic renewals' },
                      { icon: Clock, text: 'Never miss a payment' },
                      { icon: Star, text: 'Priority support' },
                    ].map((benefit, index) => (
                      <div key={`benefit-${index}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <benefit.icon className="h-4 w-4 text-primary" />
                        </div>
                        {benefit.text}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Enhanced How It Works Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl">How ZarinPal Direct Debit Works</CardTitle>
            <CardDescription className="text-base max-w-2xl mx-auto">
              Simple, secure, and automatic billing through Iran's most trusted payment gateway
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: '1. Create Contract',
                description: 'Setup a secure direct debit contract with your mobile number and national ID',
                color: 'blue',
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                iconColor: 'text-blue-600',
                borderColor: 'border-blue-200/50 dark:border-blue-700/50',
              },
              {
                icon: BanknoteIcon,
                title: '2. Sign with Bank',
                description: 'Select your bank and sign the contract directly on your bank\'s secure website',
                color: 'green',
                bgColor: 'bg-green-50 dark:bg-green-900/20',
                iconColor: 'text-green-600',
                borderColor: 'border-green-200/50 dark:border-green-700/50',
              },
              {
                icon: CheckCircle,
                title: '3. Auto-billing Active',
                description: 'Your subscriptions will automatically renew using the secure signed contract',
                color: 'purple',
                bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                iconColor: 'text-purple-600',
                borderColor: 'border-purple-200/50 dark:border-purple-700/50',
              },
            ].map((step, index) => (
              <div key={`step-${index}`} className="text-center space-y-4 group">
                <div className={`w-16 h-16 ${step.bgColor} ${step.iconColor} rounded-2xl flex items-center justify-center mx-auto border ${step.borderColor} group-hover:scale-105 transition-transform`}>
                  <step.icon className="h-8 w-8" />
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
              ].map((term, index) => (
                <div key={`term-${index}`} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                  <span className="text-muted-foreground">
                    {term.label}
                    :
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">{term.value}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
