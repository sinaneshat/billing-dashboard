'use client';

import { BanknoteIcon, Building2, CheckCircle, CreditCard, Shield } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInitiateDirectDebitContractMutation } from '@/hooks/mutations/payment-methods';
import { useMutationUIState } from '@/hooks/utils/query-helpers';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast-notifications';

type DirectDebitContractSetupProps = {
  children?: React.ReactNode;
  onSuccess?: (contractId: string) => void;
  className?: string;
};

type Bank = {
  name: string;
  slug: string;
  bankCode: string;
  maxDailyAmount: number;
  maxDailyCount: number | null;
};

export function DirectDebitContractSetup({
  children,
  onSuccess,
  className,
}: DirectDebitContractSetupProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState('');
  const [ssn, setSsn] = useState('');
  const [contractResult, setContractResult] = useState<{
    paymanAuthority: string;
    banks: Bank[];
    contractSigningUrl: string;
    contractId: string;
  } | null>(null);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [step, setStep] = useState<'form' | 'bank-selection' | 'redirect'>('form');

  const initiateContract = useInitiateDirectDebitContractMutation();
  const mutationUI = useMutationUIState(initiateContract);

  const handleContractSuccess = (contractId: string) => {
    onSuccess?.(contractId);
    setOpen(false);
    // Note: The mutation automatically invalidates payment methods cache
    // No manual prefetching needed - TanStack Query handles this properly
  };

  const handleInitiateContract = async () => {
    if (!mobile.trim()) {
      showErrorToast('Mobile number is required');
      return;
    }

    // Validate Iranian mobile number format (remove spaces first)
    const cleanMobile = mobile.replace(/\s/g, '');
    const mobileRegex = /^(?:\+98|0)?9\d{9}$/;
    if (!mobileRegex.test(cleanMobile)) {
      showErrorToast('Please enter a valid Iranian mobile number (09xxxxxxxxx)');
      return;
    }

    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await initiateContract.mutateAsync({
        json: {
          mobile: mobile.replace(/\s/g, ''), // Remove spaces before sending to API
          ssn: ssn.trim() || undefined,
          callbackUrl,
          contractDurationDays: 365, // 1 year
          maxDailyCount: 10,
          maxMonthlyCount: 100,
          maxAmount: 50000000, // 500,000 Toman
          metadata: { source: 'direct-debit-setup' },
        },
      });

      if (result.success && result.data) {
        setContractResult(result.data);
        setStep('bank-selection');
        showSuccessToast('Contract setup initiated! Please select your bank.');
        // Call success handler with contract ID
        handleContractSuccess(result.data.contractId);
      } else {
        showErrorToast('Failed to initiate direct debit contract', {
          component: 'direct-debit-setup',
          actionType: 'contract-initiation',
        });
      }
    } catch (error) {
      // Error handling is managed by the mutation hook's onError callback
      // which will show appropriate toast notifications
      console.error('Direct debit contract setup failed:', error);
    }
  };

  const handleBankSelection = () => {
    if (!selectedBankCode || !contractResult) {
      showErrorToast('Please select a bank');
      return;
    }

    const selectedBank = contractResult.banks.find(b => b.bankCode === selectedBankCode);
    if (!selectedBank) {
      showErrorToast('Invalid bank selection');
      return;
    }

    // Store contract info for callback verification
    localStorage.setItem('direct-debit-contract', JSON.stringify({
      contractId: contractResult.contractId,
      paymanAuthority: contractResult.paymanAuthority,
      mobile: mobile.trim(),
    }));

    setStep('redirect');
    showSuccessToast(`Redirecting to ${selectedBank.name} for contract signing...`);

    // Redirect to bank contract signing
    const signingUrl = contractResult.contractSigningUrl
      .replace('{payman_authority}', contractResult.paymanAuthority)
      .replace('{bank_code}', selectedBankCode);

    window.location.href = signingUrl;
  };

  const handleReset = () => {
    setStep('form');
    setContractResult(null);
    setSelectedBankCode('');
    setMobile('');
    setSsn('');
  };

  const formatMobileNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as 09XX XXX XXXX
    if (digits.length >= 11) {
      return digits.slice(0, 11).replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
    } else if (digits.length >= 7) {
      return digits.replace(/(\d{4})(\d{3})(\d*)/, '$1 $2 $3');
    } else if (digits.length >= 4) {
      return digits.replace(/(\d{4})(\d*)/, '$1 $2');
    }
    return digits;
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobileNumber(e.target.value);
    setMobile(formatted);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className={className}>
            <CreditCard className="h-4 w-4 mr-2" />
            Setup Direct Debit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Direct Debit Contract Setup
          </DialogTitle>
          <DialogDescription>
            Set up automatic billing with ZarinPal's secure direct debit system
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure Direct Debit</AlertTitle>
              <AlertDescription>
                This process creates a secure contract with ZarinPal that allows automatic billing for your subscriptions.
                Your banking information is handled directly by your bank and ZarinPal.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={handleMobileChange}
                  placeholder="0912 123 4567"
                  maxLength={13} // Formatted length
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Iranian mobile number (required for contract signing)
                </p>
              </div>

              <div>
                <Label htmlFor="ssn">National ID</Label>
                <Input
                  id="ssn"
                  value={ssn}
                  onChange={e => setSsn(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="1234567890"
                  maxLength={10}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optional but recommended for enhanced security
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contract Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>1 Year (renewable)</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Transaction Limit:</span>
                  <span>10 transactions</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Transaction Limit:</span>
                  <span>100 transactions</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum Amount:</span>
                  <span>
                    {formatTomanCurrency(50000000)}
                    {' '}
                    per transaction
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInitiateContract}
                disabled={!mutationUI.canSubmit || !mobile.trim()}
                loading={mutationUI.showPending}
                loadingText="Setting up..."
                startIcon={!mutationUI.showPending ? <CreditCard className="h-4 w-4" /> : undefined}
                aria-label={mutationUI.showPending ? 'Setting up contract...' : 'Setup direct debit contract'}
              >
                Setup Contract
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'bank-selection' && contractResult && (
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Contract Created Successfully</AlertTitle>
              <AlertDescription>
                Please select your bank to sign the direct debit contract. You'll be redirected to your bank's secure website.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="bank-select">Select Your Bank</Label>
              <Select value={selectedBankCode} onValueChange={setSelectedBankCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your bank..." />
                </SelectTrigger>
                <SelectContent>
                  {contractResult.banks.map(bank => (
                    <SelectItem key={bank.bankCode} value={bank.bankCode}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{bank.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Daily limit:
                            {' '}
                            {formatTomanCurrency(bank.maxDailyAmount)}
                            {bank.maxDailyCount && ` • ${bank.maxDailyCount} transactions`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button
                onClick={handleBankSelection}
                disabled={!selectedBankCode}
                startIcon={<BanknoteIcon className="h-4 w-4" />}
                aria-label="Continue to bank for contract signing"
              >
                Continue to Bank
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'redirect' && (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <LoadingSpinner className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Redirecting to Bank</h3>
              <p className="text-muted-foreground">
                Please wait while we redirect you to your bank's secure website to sign the contract.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
