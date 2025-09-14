'use client';

import { Building2, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';

type AuthFormProps = {
  returnUrl?: string;
};

export function AuthForm({ returnUrl: _returnUrl }: AuthFormProps) {
  const t = useTranslations();

  // SSO-only authentication - redirect to source application
  const handleSSORedirect = () => {
    const ssoUrl = process.env.NEXT_PUBLIC_ROUNDTABLE_URL || 'https://roundtable.now';
    const params = new URLSearchParams();
    if (_returnUrl) {
      params.set('returnUrl', _returnUrl);
    }
    const redirectUrl = `${ssoUrl}/auth/billing-dashboard${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = redirectUrl;
  };

  // SSO-only form - no email/password or magic links

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
          <CardTitle>{t('auth.sso.continueWithSSO')}</CardTitle>
          <CardDescription>
            {t('auth.sso.signInThroughOrganization')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSSORedirect}
            className="w-full"
            size="lg"
          >
            <Building2 className="w-4 h-4 mr-2" />
            {t('auth.sso.continueWithRoundtableSSO')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.sso.redirectMessage')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
