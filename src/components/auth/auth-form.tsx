'use client';

// Google icon SVG component
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { authFormSchema } from '@/db/validation/auth';
import { useBoolean } from '@/hooks/utils/useBoolean';
import { authClient } from '@/lib/auth/client';

function GoogleIcon() {
  return (
    <svg
      className="mr-2 h-4 w-4"
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
          title: 'Error',
          description: error.message || 'Something went wrong. Please try again.',
        });
        return;
      }

      setIsEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a sign in link. Be sure to check your spam too.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
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
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      isGoogleLoading.onFalse();
    }
  }

  if (isEmailSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a sign in link to
            {' '}
            <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {isSignUp && name && `Hi ${name}! `}
            Click the link in your email to continue. The link will expire in 10 minutes.
          </p>
          <Button
            onClick={() => {
              setIsEmailSent(false);
              form.reset();
            }}
            variant="outline"
            className="w-full"
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
        <CardDescription>
          {isSignUp ? 'Get started with Billing Dashboard' : 'Welcome back to Billing Dashboard'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider methods={form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSignUp && (
              <RHFShadcnTextField
                name="name"
                title="Full Name"
                placeholder="Jane Smith"
              />
            )}
            <RHFShadcnTextField
              name="email"
              title="Email"
              fieldType="email"
              placeholder="jane@acme.com"
            />
            <Button
              type="submit"
              className="w-full"
              loading={isLoading.value}
              loadingText={isSignUp ? 'Creating Account...' : 'Signing In...'}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
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
            loadingText="Connecting to Google..."
            startIcon={!isGoogleLoading.value ? <GoogleIcon /> : undefined}
            className="w-full"
          >
            Continue with Google
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
          {' '}
          <Link
            href={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}
            className="text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
