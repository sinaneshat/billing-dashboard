'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';

type BankAuthorizationCompletionProps = {
  className?: string;
};

export function BankAuthorizationCompletion({
  className,
}: BankAuthorizationCompletionProps) {
  const t = useTranslations();

  return (
    <div className={`space-y-6 text-center ${className || ''}`}>
      <div>
        <Check className="h-16 w-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-lg font-semibold text-green-600">
          {t('bankSetup.completed.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('bankSetup.completed.description')}
        </p>
      </div>

      <Alert>
        <Check className="h-4 w-4" />
        <AlertDescription>
          {t('bankSetup.completed.nextSteps')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
