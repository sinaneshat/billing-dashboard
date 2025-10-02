'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';

import { GoogleButton } from './google-button';

export function AuthForm() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email)
      return;

    setIsLoading(true);
    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: '/dashboard',
        newUserCallbackURL: '/dashboard',
        errorCallbackURL: '/auth/error',
      });
      setMagicLinkSent(true);
    } catch (error) {
      console.error('Magic link failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="relative">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>{t('auth.magicLink.title')}</CardTitle>
            <CardDescription>
              {t('auth.magicLink.emailSentMessage', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              {t('auth.magicLink.useDifferentEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>{t('auth.signIn.title')}</CardTitle>
          <CardDescription>
            {t('auth.signIn.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('actions.loading') : t('auth.magicLink.sendButton')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('common.or')}
              </span>
            </div>
          </div>

          <GoogleButton className="w-full" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.secureAuthentication')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
