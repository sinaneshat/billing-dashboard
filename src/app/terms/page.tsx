import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TermsScreen } from '@/containers/screens/legal';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta.legal');

  return {
    title: t('terms.title'),
    description: t('terms.description'),
  };
}

export default async function TermsPage() {
  return <TermsScreen />;
}
