'use client';

import { CreditCard, MoreVertical, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/ui/cn';
import { formatPhoneNumber, getBankName, getPaymentMethodStatusConfig } from '@/lib/utils/payment-method-utils';

// =============================================================================
// SIMPLIFIED PAYMENT METHOD CARD
// Follows established patterns from plans/subscriptions
// Shows only essential information users need
// =============================================================================

type SimplifiedPaymentMethodCardProps = {
  paymentMethod: PaymentMethod;
  onSetPrimary?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
};

// Functions moved to shared utilities for better reusability

export function SimplifiedPaymentMethodCard({
  paymentMethod,
  onSetPrimary,
  onDelete,
  className,
}: SimplifiedPaymentMethodCardProps) {
  const t = useTranslations();
  const statusConfig = getPaymentMethodStatusConfig(paymentMethod.contractStatus, t);

  const bankName = getBankName(paymentMethod.bankCode);
  const maskedPhone = formatPhoneNumber(paymentMethod.contractMobile);

  const handleSetPrimary = () => onSetPrimary?.(paymentMethod.id);
  const handleDelete = () => onDelete?.(paymentMethod.id);

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        paymentMethod.isPrimary && 'ring-1 ring-primary/20 bg-primary/5',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bank Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>

            {/* Bank Info */}
            <div className="space-y-1">
              <div>
                <h3 className="text-lg font-semibold">
                  {bankName}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('paymentMethods.zarinpalDirectDebit')}</span>
                {maskedPhone && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{maskedPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t('actions.more')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && (
                  <>
                    <DropdownMenuItem onClick={handleSetPrimary}>
                      <Star className="h-4 w-4 mr-2" />
                      {t('paymentMethods.setAsDefault')}
                    </DropdownMenuItem>
                    {onDelete && <DropdownMenuSeparator />}
                  </>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('actions.remove')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Status Message - Clean without emojis */}
        {paymentMethod.contractStatus === 'active' && (
          <div className="text-sm text-green-600 dark:text-green-400">
            {t('paymentMethods.status.activeDescription')}
          </div>
        )}

        {paymentMethod.contractStatus === 'pending_signature' && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            {t('paymentMethods.status.pendingDescription')}
          </div>
        )}

        {paymentMethod.contractStatus === 'cancelled_by_user' && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {t('paymentMethods.status.cancelledDescription')}
          </div>
        )}

        {paymentMethod.contractStatus === 'expired' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('paymentMethods.status.expiredDescription')}
          </div>
        )}

        {paymentMethod.isPrimary && (
          <div className="text-sm text-primary font-medium mt-2">
            {t('paymentMethods.defaultMethod')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
