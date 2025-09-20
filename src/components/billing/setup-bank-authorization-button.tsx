'use client';

import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  hideIcon?: boolean;
};

export function SetupBankAuthorizationButton({
  source,
  productId,
  productName,
  productPrice,
  variant = 'default',
  size = 'default',
  className,
  hideIcon = false,
}: SetupBankAuthorizationButtonProps) {
  const t = useTranslations();
  const router = useRouter();

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

  const handleClick = () => {
    router.push(getHref());
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      startIcon={!hideIcon ? <CreditCard className="h-4 w-4" /> : undefined}
    >
      {getButtonText()}
    </Button>
  );
}
