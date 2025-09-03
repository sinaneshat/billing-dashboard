'use client';

import {
  Calendar,
  Download,
  EllipsisVerticalIcon,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardEmpty } from '@/components/ui/dashboard-states';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

// Enhanced payment type with better field handling
type PaymentHistoryItem = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  hasReceipt: boolean;
  failureReason?: string | null;
  zarinpalRefId?: string | null;
};

type PaymentHistoryCardsProps = {
  payments: PaymentHistoryItem[];
  loading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
};

// Loading skeleton for payment cards
function PaymentCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const PaymentHistoryCards = memo(({
  payments,
  loading = false,
  emptyStateTitle = 'No payment history found',
  emptyStateDescription = 'Your payment transactions will appear here once you start using our services.',
  className,
}: PaymentHistoryCardsProps) => {
  // Render individual payment card
  const renderPaymentCard = (payment: PaymentHistoryItem, index: number) => (
    <StaggerItem key={payment.id} delay={index * 0.05}>
      <Card className="w-full hover:shadow-md transition-shadow" data-slot="payment-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium">
                  {payment.productName}
                </CardTitle>
                <CardDescription>
                  {payment.paymentMethod === 'direct-debit-contract'
                    ? 'Automatic renewal'
                    : 'One-time payment'}
                  {payment.status === 'failed' && payment.failureReason && (
                    <span className="block text-xs text-destructive mt-1">
                      Failed:
                      {' '}
                      {payment.failureReason}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="Open payment actions"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  {payment.hasReceipt && (payment.status === 'completed' || payment.status === 'paid') && (
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </DropdownMenuItem>
                  )}
                  {(payment.status === 'completed' || payment.status === 'paid') && (
                    <DropdownMenuItem>
                      <Receipt className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </DropdownMenuItem>
                  )}
                  {payment.status === 'failed' && (
                    <DropdownMenuItem className="text-destructive">
                      Retry Payment
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {formatTomanCurrency(payment.amount)}
              </span>
              <PaymentStatusBadge status={payment.status} size="sm" />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-muted">
                  {payment.paymentMethod === 'direct-debit-contract' ? 'Auto Debit' : 'ZarinPal'}
                </span>
                {payment.zarinpalRefId && (
                  <span className="text-xs text-muted-foreground" title={`Ref: ${payment.zarinpalRefId}`}>
                    #
                    {payment.zarinpalRefId.slice(-6)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  );

  if (loading) {
    return (
      <FadeIn className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <PaymentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </FadeIn>
    );
  }

  if (payments.length === 0) {
    return (
      <FadeIn className={className}>
        <DashboardEmpty
          title={emptyStateTitle}
          description={emptyStateDescription}
          icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment History</h3>
          <span className="text-sm text-muted-foreground">
            {payments.length}
            {' '}
            {payments.length === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>

        <StaggerContainer className="grid gap-4">
          {payments.map((payment, index) => renderPaymentCard(payment, index))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
});

PaymentHistoryCards.displayName = 'PaymentHistoryCards';
