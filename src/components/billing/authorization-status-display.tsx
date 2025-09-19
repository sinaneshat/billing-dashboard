'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/kibo-ui/spinner';

type AuthorizationStatus = 'waiting' | 'checking' | 'verified' | 'failed';

type AuthorizationStatusDisplayProps = {
  status: AuthorizationStatus;
  onRetry?: () => void;
  className?: string;
};

export function AuthorizationStatusDisplay({
  status,
  onRetry,
  className,
}: AuthorizationStatusDisplayProps) {
  const t = useTranslations();

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <Check className="h-8 w-8 text-green-600" />;
      default:
        return <Spinner className="h-8 w-8 text-primary" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'waiting':
        return t('bankSetup.authorization.waitingTitle');
      case 'checking':
        return t('bankSetup.authorization.checkingTitle');
      case 'verified':
        return t('bankSetup.authorization.verifiedTitle');
      case 'failed':
        return t('bankSetup.authorization.failedTitle');
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'waiting':
        return t('bankSetup.authorization.waitingDescription');
      case 'checking':
        return t('bankSetup.authorization.checkingDescription');
      case 'verified':
        return t('bankSetup.authorization.verifiedDescription');
      case 'failed':
        return t('bankSetup.authorization.failedDescription');
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          {getStatusIcon()}
        </div>
        <h3 className="text-lg font-semibold">
          {getStatusTitle()}
        </h3>
        <p className="text-sm text-muted-foreground">
          {getStatusDescription()}
        </p>
      </div>

      {status === 'failed' && onRetry && (
        <div className="flex justify-center">
          <Button onClick={onRetry}>
            {t('actions.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  );
}
