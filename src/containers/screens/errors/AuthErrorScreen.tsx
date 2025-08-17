'use client';

import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support if this persists.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in. Please check your credentials or contact your administrator.',
  },
  Verification: {
    title: 'Verification Required',
    description: 'Please check your email to verify your account before signing in.',
  },
  OAuthSignin: {
    title: 'Sign In Error',
    description: 'There was a problem signing in with your social account. Please try again.',
  },
  OAuthCallback: {
    title: 'Authentication Error',
    description: 'There was a problem with the authentication process. Please try signing in again.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    description: 'Could not create your account. You may already have an account with this email.',
  },
  EmailCreateAccount: {
    title: 'Account Creation Error',
    description: 'Could not create your account. Please try a different email address.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'There was a problem during the authentication callback. Please try again.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during authentication. Please try again.',
  },
};

export default function AuthErrorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorInfo = errorMessages[error] ?? errorMessages.Default;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        <CardTitle>{errorInfo?.title || 'Authentication Error'}</CardTitle>
        <CardDescription>
          {errorInfo?.description || 'An unexpected error occurred during authentication.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground text-center">
            Error code:
            {' '}
            <code className="font-mono text-xs">{error}</code>
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full"
        >
          <Link href="/auth/sign-in">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
