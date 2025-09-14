'use client';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';

export function AuthForm() {
  const t = useTranslations();

  return (
    <div className="relative">
      <div className="absolute top-4 end-4 z-10">
        <LocaleSwitcher variant="outline" showLabel={false} />
      </div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{t('auth.sso.authenticationRequired')}</CardTitle>
          <CardDescription>
            {t('auth.sso.onlySupportsSSO')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.sso.contactAdministrator')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
