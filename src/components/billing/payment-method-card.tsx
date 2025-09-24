'use client';

import {
  Calendar,
  CreditCard,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Verified,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { memo, useState } from 'react';

// Import Zod-inferred type from API schema (handles string timestamps)
import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/ui/cn';
import {
  formatIRR,
  formatPaymentMethodDate,
  getPaymentMethodStatusConfig,
  maskSensitiveInfo,
} from '@/lib/utils/payment-method-utils';

// Use Zod-inferred PaymentMethod type directly - no custom interface needed

export type PaymentMethodCardProps = {
  paymentMethod: PaymentMethod;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  showSecurityInfo?: boolean;
  showLimits?: boolean;
  onSetPrimary?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
};

export const PaymentMethodCard = memo<PaymentMethodCardProps>(({
  paymentMethod,
  variant = 'default',
  showActions = true,
  showSecurityInfo = true,
  showLimits = false,
  onSetPrimary,
  onEdit,
  onDelete,
  onView,
  className,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const [showSensitive, setShowSensitive] = useState(false);

  const statusConfig = getPaymentMethodStatusConfig(paymentMethod.contractStatus, t);
  const StatusIcon = statusConfig.icon;

  // Action handlers
  const handleSetPrimary = () => onSetPrimary?.(paymentMethod.id);
  const handleEdit = () => onEdit?.(paymentMethod.id);
  const handleDelete = () => onDelete?.(paymentMethod.id);
  const handleView = () => onView?.(paymentMethod.id);

  const renderCompactLayout = () => (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      paymentMethod.isPrimary && 'ring-1 ring-primary/20 bg-primary/5',
      className,
    )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-medium truncate">
                  {paymentMethod.contractDisplayName}
                </h3>
                {paymentMethod.isPrimary && (
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusIcon className="h-3 w-3" />
                <span>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant={statusConfig.variant} className="text-xs">
              {statusConfig.label}
            </Badge>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                    <span className="sr-only">{t('actions.more')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={handleView}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('actions.view')}
                    </DropdownMenuItem>
                  )}
                  {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                    <DropdownMenuItem onClick={handleSetPrimary}>
                      <Star className="h-4 w-4 mr-2" />
                      {t('paymentMethods.setAsDefault')}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                  )}
                  {(onView || (onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active') || onEdit) && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.remove')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDefaultLayout = () => (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      paymentMethod.isPrimary && 'ring-1 ring-primary/20 bg-primary/5',
      className,
    )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg border shrink-0',
              statusConfig.bgColor,
              'border-primary/20',
            )}
            >
              <CreditCard className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-lg font-semibold truncate">
                  {paymentMethod.contractDisplayName}
                </CardTitle>
                {paymentMethod.isPrimary && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('paymentMethods.primary')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Badge variant={statusConfig.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('paymentMethods.zarinpalDirectDebit')}
              </p>
            </div>
          </div>

          {showActions && (
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('actions.more')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={handleView}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('actions.view')}
                    </DropdownMenuItem>
                  )}
                  {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                    <DropdownMenuItem onClick={handleSetPrimary}>
                      <Star className="h-4 w-4 mr-2" />
                      {t('paymentMethods.setAsDefault')}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                  )}
                  {(onView || (onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active') || onEdit) && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.remove')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contract Information */}
        <div className="space-y-3">
          {paymentMethod.contractMobile && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('paymentMethods.phoneNumber')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {showSensitive
                    ? paymentMethod.contractMobile
                    : maskSensitiveInfo(paymentMethod.contractMobile, 4, '●')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="h-6 w-6 p-0"
                >
                  {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span className="sr-only">
                    {showSensitive ? t('forms.hidePassword') : t('forms.showPassword')}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {paymentMethod.contractSignatureHash && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('paymentMethods.reference')}</span>
              <span className="text-sm font-mono">
                #
                {paymentMethod.contractSignatureHash.slice(-8)}
              </span>
            </div>
          )}

          {paymentMethod.lastUsedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('paymentMethods.table.lastUsed')}</span>
              <span className="text-sm">
                {formatPaymentMethodDate(paymentMethod.lastUsedAt, locale)}
              </span>
            </div>
          )}
        </div>

        {/* Security Information */}
        {showSecurityInfo && (paymentMethod.contractVerifiedAt || paymentMethod.contractExpiresAt) && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('paymentMethods.directDebit.contractDetails')}</span>
              </div>

              {paymentMethod.contractVerifiedAt && (
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <Verified className="h-3 w-3 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      {t('paymentMethods.directDebit.bankVerified')}
                    </span>
                  </div>
                  <span className="text-xs text-green-600">
                    {formatPaymentMethodDate(paymentMethod.contractVerifiedAt, locale)}
                  </span>
                </div>
              )}

              {paymentMethod.contractExpiresAt && (
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('paymentMethods.expires', {
                        date: formatPaymentMethodDate(paymentMethod.contractExpiresAt, locale),
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Transaction Limits */}
        {showLimits && (paymentMethod.maxTransactionAmount || paymentMethod.maxDailyAmount) && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('paymentMethods.limits')}</span>
              </div>

              {paymentMethod.maxTransactionAmount && (
                <div className="flex items-center justify-between pl-6">
                  <span className="text-sm text-muted-foreground">
                    {t('paymentMethods.maxTransaction')}
                  </span>
                  <span className="text-sm font-medium">
                    {formatIRR(paymentMethod.maxTransactionAmount, locale)}
                  </span>
                </div>
              )}

              {paymentMethod.maxDailyAmount && (
                <div className="flex items-center justify-between pl-6">
                  <span className="text-sm text-muted-foreground">
                    {t('paymentMethods.maxDaily')}
                  </span>
                  <span className="text-sm font-medium">
                    {formatIRR(paymentMethod.maxDailyAmount, locale)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        {showActions && (onSetPrimary || onEdit) && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                <Button variant="outline" size="sm" onClick={handleSetPrimary} className="flex-1">
                  <Star className="h-4 w-4 mr-2" />
                  {t('paymentMethods.setAsDefault')}
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('actions.edit')}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderDetailedLayout = () => (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      paymentMethod.isPrimary && 'ring-1 ring-primary/20 bg-primary/5',
      className,
    )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl border shrink-0',
              statusConfig.bgColor,
              'border-primary/20',
            )}
            >
              <CreditCard className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-xl font-bold truncate">
                  {paymentMethod.contractDisplayName}
                </CardTitle>
                {paymentMethod.isPrimary && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('paymentMethods.primary')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusConfig.variant} className="px-3 py-1">
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusConfig.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('paymentMethods.zarinpalDirectDebit')}
                </span>
              </div>
              {statusConfig.description && (
                <p className="text-sm text-muted-foreground">
                  {statusConfig.description}
                </p>
              )}
            </div>
          </div>

          {showActions && (
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">{t('actions.more')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={handleView}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('actions.view')}
                    </DropdownMenuItem>
                  )}
                  {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                    <DropdownMenuItem onClick={handleSetPrimary}>
                      <Star className="h-4 w-4 mr-2" />
                      {t('paymentMethods.setAsDefault')}
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('actions.edit')}
                    </DropdownMenuItem>
                  )}
                  {(onView || (onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active') || onEdit) && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('actions.remove')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Detailed Contract Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethod.contractMobile && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('paymentMethods.phoneNumber')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {showSensitive
                    ? paymentMethod.contractMobile
                    : maskSensitiveInfo(paymentMethod.contractMobile, 4, '●')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSensitive(!showSensitive)}
                  className="h-6 w-6 p-0"
                >
                  {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}

          {paymentMethod.contractSignatureHash && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('paymentMethods.directDebit.referenceCode')}
              </label>
              <span className="text-sm font-mono">
                #
                {paymentMethod.contractSignatureHash.slice(-12)}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              {t('paymentMethods.addedOn', { date: formatPaymentMethodDate(paymentMethod.createdAt, locale) })}
            </label>
            <span className="text-sm">
              {formatPaymentMethodDate(paymentMethod.createdAt, locale, 'long')}
            </span>
          </div>

          {paymentMethod.lastUsedAt && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('paymentMethods.table.lastUsed')}
              </label>
              <span className="text-sm">
                {formatPaymentMethodDate(paymentMethod.lastUsedAt, locale, 'long')}
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Security Section */}
        {showSecurityInfo && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">{t('paymentMethods.directDebit.contractDetails')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethod.contractVerifiedAt && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <Verified className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {t('paymentMethods.directDebit.bankVerified')}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {formatPaymentMethodDate(paymentMethod.contractVerifiedAt, locale, 'long')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {t('paymentMethods.directDebit.signatureStored')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('paymentMethods.directDebit.readyForPayments')}
                    </p>
                  </div>
                </div>

                {paymentMethod.contractExpiresAt && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 md:col-span-2">
                    <Calendar className="h-5 w-5 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        {t('paymentMethods.expires', {
                          date: formatPaymentMethodDate(paymentMethod.contractExpiresAt, locale, 'long'),
                        })}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        {t('paymentMethods.contractExpirationInfo')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Transaction Limits */}
        {showLimits && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('paymentMethods.transactionLimits')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethod.maxTransactionAmount && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('paymentMethods.maxTransaction')}
                    </label>
                    <span className="text-lg font-semibold">
                      {formatIRR(paymentMethod.maxTransactionAmount, locale)}
                    </span>
                  </div>
                )}

                {paymentMethod.maxDailyAmount && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('paymentMethods.maxDaily')}
                    </label>
                    <span className="text-lg font-semibold">
                      {formatIRR(paymentMethod.maxDailyAmount, locale)}
                    </span>
                  </div>
                )}

                {paymentMethod.maxDailyCount && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('paymentMethods.maxDailyTransactions')}
                    </label>
                    <span className="text-lg font-semibold">
                      {paymentMethod.maxDailyCount}
                      {' '}
                      {t('paymentMethods.transactions')}
                    </span>
                  </div>
                )}

                {paymentMethod.maxMonthlyCount && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('paymentMethods.maxMonthlyTransactions')}
                    </label>
                    <span className="text-lg font-semibold">
                      {paymentMethod.maxMonthlyCount}
                      {' '}
                      {t('paymentMethods.transactions')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Enhanced Action Buttons */}
        {showActions && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                  <Button onClick={handleSetPrimary}>
                    <Star className="h-4 w-4 mr-2" />
                    {t('paymentMethods.setAsDefault')}
                  </Button>
                )}
                {onEdit && (
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('actions.edit')}
                  </Button>
                )}
              </div>

              {onDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('actions.remove')}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  // Render based on variant
  switch (variant) {
    case 'compact':
      return renderCompactLayout();
    case 'detailed':
      return renderDetailedLayout();
    default:
      return renderDefaultLayout();
  }
});

PaymentMethodCard.displayName = 'PaymentMethodCard';
