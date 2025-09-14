'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function PrivacyScreen() {
  const t = useTranslations();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/auth/sign-in">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('actions.back')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('legal.privacy.title')}</CardTitle>
          <CardDescription>
            {t('legal.privacy.lastUpdated', { date: '2024-01-01' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.collection.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.collection.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.usage.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.usage.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.sharing.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.sharing.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.security.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.security.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.cookies.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.cookies.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.rights.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.rights.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.children.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.children.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.changes.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.changes.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.contact.title')}</h2>
              <p className="text-muted-foreground">{t('legal.privacy.contact.content')}</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
