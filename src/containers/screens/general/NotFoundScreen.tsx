'use client';

import { FrownIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFoundScreen() {
  const t = useTranslations();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <FrownIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold tracking-tighter leading-tight text-foreground sm:text-4xl md:text-5xl">
          {t('pages.notFound.title')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          {t('pages.notFound.description')}
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium leading-relaxed text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {t('pages.notFound.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
