'use client';

import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorScreen() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const getErrorInfo = (errorType: string) => {
    const errorKey = errorType.toLowerCase();
    switch (errorKey) {
      case 'configuration':
        return {
          title: t('auth.errors.configuration'),
          description: t('auth.errors.configurationDesc'),
        };
      case 'accessdenied':
        return {
          title: t('auth.errors.accessDenied'),
          description: t('auth.errors.accessDeniedDesc'),
        };
      case 'verification':
        return {
          title: t('auth.errors.verification'),
          description: t('auth.errors.verificationDesc'),
        };
      case 'oauthsignin':
        return {
          title: t('auth.errors.oauthSignin'),
          description: t('auth.errors.oauthSigninDesc'),
        };
      case 'oauthcallback':
        return {
          title: t('auth.errors.oauthCallback'),
          description: t('auth.errors.oauthCallbackDesc'),
        };
      case 'oauthcreateaccount':
        return {
          title: t('auth.errors.oauthCreateAccount'),
          description: t('auth.errors.oauthCreateAccountDesc'),
        };
      case 'emailcreateaccount':
        return {
          title: t('auth.errors.emailCreateAccount'),
          description: t('auth.errors.emailCreateAccountDesc'),
        };
      case 'callback':
        return {
          title: t('auth.errors.callback'),
          description: t('auth.errors.callbackDesc'),
        };
      default:
        return {
          title: t('auth.errors.default'),
          description: t('auth.errors.defaultDesc'),
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <CardTitle>{errorInfo.title}</CardTitle>
        <CardDescription>
          {errorInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.errors.errorCode')}
            {' '}
            <code className="font-mono text-xs">{error}</code>
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          className="w-full"
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('auth.errors.tryAgain')}
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full"
        >
          <Link href="/auth/sign-in">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('auth.errors.backToSignIn')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
