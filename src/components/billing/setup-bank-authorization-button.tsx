'use client';

import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

type SetupBankAuthorizationButtonProps = {
  source: 'methods' | 'plans';
  productId?: string;
  productName?: string;
  productPrice?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function SetupBankAuthorizationButton({
  source,
  productId,
  productName,
  productPrice,
  variant = 'default',
  size = 'default',
  className,
}: SetupBankAuthorizationButtonProps) {
  const t = useTranslations();

  const getHref = () => {
    if (source === 'plans' && productId && productName && productPrice) {
      const params = new URLSearchParams({
        productId,
        productName,
        productPrice: productPrice.toString(),
      });
      return `/dashboard/billing/plans/setup?${params.toString()}`;
    }
    return `/dashboard/billing/methods/setup`;
  };

  const getButtonText = () => {
    if (source === 'plans') {
      return t('bankSetup.setupForPlan');
    }
    return t('bankSetup.setupBankAuthorization');
  };

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={className}
      startIcon={<CreditCard />}
    >
      <Link href={getHref()}>
        {getButtonText()}
      </Link>
    </Button>
  );
}
