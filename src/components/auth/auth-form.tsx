'use client';

// Google icon SVG component
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { FormProvider, RHFShadcnTextField } from '@/components/RHF';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { authFormSchema } from '@/db/validation/auth';
import { useBoolean } from '@/hooks/utils/useBoolean';
import { authClient } from '@/lib/auth/client';

function GoogleIcon() {
  return (
    <svg
      className="me-2 h-4 w-4"
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="google"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
    >
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    </svg>
  );
}

type AuthFormProps = {
  isSignUp?: boolean;
  returnUrl?: string;
  invitationId?: string;
};

type FormValues = z.infer<typeof authFormSchema>;

export function AuthForm({ isSignUp = false, returnUrl: _returnUrl, invitationId }: AuthFormProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isLoading = useBoolean(false);
  const isGoogleLoading = useBoolean(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const schema = authFormSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isSignUp
      ? { name: '', email: '' }
      : { email: '' },
  });

  const email = form.watch('email');
  const name = isSignUp ? (form.watch('name' as keyof FormValues) as string) : '';

  // Inline buildCallbackUrl function
  function buildCallbackUrl(
    returnUrl: string | null | undefined,
    invitationId: string | null | undefined,
    isSignUp: boolean,
  ) {
    const callbackParams = new URLSearchParams();
    if (returnUrl && returnUrl !== '/dashboard') {
      callbackParams.set('returnUrl', returnUrl);
    }
    if (invitationId && !isSignUp) {
      callbackParams.set('invitationId', invitationId);
    }

    return callbackParams.toString()
      ? `/auth/callback?${callbackParams.toString()}`
      : '/auth/callback';
  }

  async function onSubmit(values: FormValues) {
    try {
      isLoading.onTrue();

      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/dashboard';
      const urlInvitationId = searchParams.get('invitationId') || invitationId;

      const callbackURL = buildCallbackUrl(returnUrl, urlInvitationId || null, isSignUp);

      const magicLinkData = isSignUp
        ? { email: values.email, name: values.name, callbackURL }
        : { email: values.email, callbackURL };

      const { error } = await authClient.signIn.magicLink(magicLinkData);

      if (error) {
        toast({
          variant: 'destructive',
          title: t('auth.form.error'),
          description: error.message || t('auth.form.somethingWentWrong'),
        });
        return;
      }

      setIsEmailSent(true);
      toast({
        title: t('auth.form.checkYourEmail'),
        description: t('auth.form.emailSentMessage'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('auth.form.error'),
        description: t('auth.form.somethingWentWrong'),
      });
    } finally {
      isLoading.onFalse();
    }
  }

  async function handleGoogleAuth() {
    try {
      isGoogleLoading.onTrue();

      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/dashboard';
      const urlInvitationId = searchParams.get('invitationId') || invitationId;

      const callbackURL = buildCallbackUrl(returnUrl, urlInvitationId || null, isSignUp);

      await authClient.signIn.social({
        provider: 'google',
        callbackURL,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('auth.form.error'),
        description: t('auth.form.somethingWentWrong'),
      });
    } finally {
      isGoogleLoading.onFalse();
    }
  }

  if (isEmailSent) {
    return (
      <div className="relative">
        <div className="absolute top-4 end-4 z-10">
          <LocaleSwitcher variant="outline" showLabel={false} />
        </div>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>{t('auth.form.checkYourEmail')}</CardTitle>
            <CardDescription>
              {t('auth.form.emailSentMessage')}
              {' '}
              <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {isSignUp && name && `Hi ${name}! `}
              {t('auth.form.emailExpireMessage')}
            </p>
            <Button
              onClick={() => {
                setIsEmailSent(false);
                form.reset();
              }}
              variant="outline"
              className="w-full"
            >
              {t('auth.form.useDifferentEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 end-4 z-10">
        <LocaleSwitcher variant="outline" showLabel={false} />
      </div>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>{isSignUp ? t('auth.form.createAccount') : t('auth.form.signIn')}</CardTitle>
          <CardDescription>
            {isSignUp ? t('auth.form.getStarted') : t('auth.form.welcomeBack')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider methods={form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && (
                <RHFShadcnTextField
                  name="name"
                  title={t('auth.form.fullName')}
                  placeholder={t('auth.form.fullNamePlaceholder')}
                />
              )}
              <RHFShadcnTextField
                name="email"
                title={t('auth.form.email')}
                fieldType="email"
                placeholder={t('auth.form.emailPlaceholder')}
              />
              <Button
                type="submit"
                className="w-full"
                loading={isLoading.value}
                loadingText={isSignUp ? t('auth.form.creatingAccount') : t('auth.form.signingIn')}
              >
                {isSignUp ? t('auth.form.createAccount') : t('auth.form.signIn')}
              </Button>
            </form>
          </FormProvider>

          <div className="mt-6">
            <Separator />
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              loading={isGoogleLoading.value}
              loadingText={t('auth.form.connectingGoogle')}
              startIcon={!isGoogleLoading.value ? <GoogleIcon /> : undefined}
              className="w-full"
            >
              {t('auth.form.continueWithGoogle')}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-muted-foreground text-center">
            {isSignUp ? t('auth.form.alreadyHaveAccount') : t('auth.form.dontHaveAccount')}
            {' '}
            <Link
              href={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isSignUp ? t('auth.form.signInLink') : t('auth.form.signUpLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
