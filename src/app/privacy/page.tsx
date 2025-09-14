import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PrivacyScreen } from '@/containers/screens/legal';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta.legal');

  return {
    title: t('privacy.title'),
    description: t('privacy.description'),
  };
}

export default async function PrivacyPage() {
  return <PrivacyScreen />;
}
