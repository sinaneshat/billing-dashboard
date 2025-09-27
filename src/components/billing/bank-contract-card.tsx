'use client';

import {
  AlertTriangle,
  Check,
  MoreVertical,
  Star,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { memo } from 'react';

import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/ui/cn';
import {
  formatPhoneNumber,
  getBankName,
  getDaysRemaining,
  getPaymentMethodStatusConfig,
} from '@/lib/utils/payment-method-utils';

// =============================================================================
// BANK CONTRACT CARD - Compact design for 3-column grid layout
// Shows essential contract information in a minimal format
// =============================================================================

export type BankContractCardProps = {
  paymentMethod: PaymentMethod;
  onSetPrimary?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void; // Add onClick for navigation
  isViewOnly?: boolean; // Add flag for view-only mode
  className?: string;
};

// Helper to format currency in Toman
function formatToman(amount: number | null | undefined, locale: string): string {
  if (!amount)
    return '-';
  const tomanAmount = Math.floor(amount / 10);
  return tomanAmount.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US');
}

export const BankContractCard = memo<BankContractCardProps>(({
  paymentMethod,
  onSetPrimary,
  onDelete,
  onClick,
  isViewOnly = false,
  className,
}) => {
  const t = useTranslations();
  const locale = useLocale();

  // Extract important data from API
  const statusConfig = getPaymentMethodStatusConfig(paymentMethod.contractStatus, t);
  const bankName = getBankName(paymentMethod.bankCode);
  const maskedPhone = formatPhoneNumber(paymentMethod.contractMobile);
  const daysRemaining = getDaysRemaining(paymentMethod.contractExpiresAt);

  const isActive = paymentMethod.contractStatus === 'active';
  const isExpiring = daysRemaining !== null && daysRemaining <= 30;
  const isCritical = daysRemaining !== null && daysRemaining <= 7;
  const canSetPrimary = isActive && !paymentMethod.isPrimary && onSetPrimary;

  return (
    <Card
      className={cn(
        'group relative transition-all duration-200',
        'hover:shadow-md',
        onClick && 'cursor-pointer',
        paymentMethod.isPrimary && 'ring-1 ring-primary/20',
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1.5">
            {/* Title and Primary Badge */}
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                {bankName}
              </CardTitle>
              {paymentMethod.isPrimary && (
                <Badge variant="outline" className="gap-1 h-5 px-2">
                  <Star className="h-3 w-3 fill-current" />
                  {t('paymentMethods.primary')}
                </Badge>
              )}
            </div>

            {/* Contract Type and Phone */}
            <CardDescription className="text-xs">
              {t('directDebit.title')}
              {maskedPhone && ` • ${maskedPhone}`}
            </CardDescription>

          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center gap-2">
            <Badge
              variant={statusConfig.variant}
              className={cn(
                'text-xs',
                isActive && 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
              )}
            >
              {isActive && <Check className="h-3 w-3 mr-1" />}
              {statusConfig.label}
            </Badge>

            {!isViewOnly && (onSetPrimary || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={e => e.stopPropagation()} // Prevent card click when clicking menu
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('actions.more')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canSetPrimary && (
                    <DropdownMenuItem onClick={() => onSetPrimary(paymentMethod.id)}>
                      <Star className="h-4 w-4 mr-2" />
                      {t('paymentMethods.setAsDefault')}
                    </DropdownMenuItem>
                  )}
                  {canSetPrimary && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(paymentMethod.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.remove')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Compact Contract Information */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Contract Validity */}
          <div>
            <p className="text-muted-foreground mb-0.5">{t('paymentMethods.expiryDate')}</p>
            <p className={cn(
              'font-medium text-sm',
              isCritical && 'text-destructive',
              isExpiring && !isCritical && 'text-warning',
            )}
            >
              {daysRemaining !== null
                ? `${daysRemaining} ${t('time.days')}`
                : paymentMethod.contractStatus === 'expired'
                  ? t('directDebit.expired')
                  : '-'}
            </p>
          </div>

          {/* Contract Expiry Date */}
          <div>
            <p className="text-muted-foreground mb-0.5">{t('paymentMethods.expiryDate')}</p>
            <p className="font-medium text-sm">
              {paymentMethod.contractExpiresAt
                ? new Date(paymentMethod.contractExpiresAt).toLocaleDateString(
                    locale === 'fa' ? 'fa-IR' : 'en-US',
                    { month: 'short', day: 'numeric', year: '2-digit' },
                  )
                : '-'}
            </p>
          </div>

          {/* Verification Status */}
          <div>
            <p className="text-muted-foreground mb-0.5">{t('status')}</p>
            <p className="font-medium text-sm flex items-center gap-1">
              {paymentMethod.contractVerifiedAt
                ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">
                        {t('paymentMethods.verified')}
                      </span>
                    </>
                  )
                : (
                    <span className="text-muted-foreground">{t('pending')}</span>
                  )}
            </p>
          </div>

          {/* Daily Limit */}
          {paymentMethod.maxDailyAmount && (
            <div>
              <p className="text-muted-foreground mb-0.5">{t('paymentMethods.dailyLimit')}</p>
              <p className="font-medium text-sm">
                {formatToman(paymentMethod.maxDailyAmount, locale)}
              </p>
            </div>
          )}
        </div>

        {/* Critical Warning */}
        {isCritical && isActive && (
          <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-xs font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t('directDebit.expiring')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

BankContractCard.displayName = 'BankContractCard';
