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

export default function TermsScreen() {
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
          <CardTitle className="text-3xl">{t('legal.terms.title')}</CardTitle>
          <CardDescription>
            {t('legal.terms.lastUpdated', { date: '2024-01-01' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.acceptance.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.acceptance.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.services.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.services.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.billing.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.billing.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.privacy.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.privacy.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.termination.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.termination.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.liability.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.liability.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.governing.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.governing.content')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3">{t('legal.terms.contact.title')}</h2>
              <p className="text-muted-foreground">{t('legal.terms.contact.content')}</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
