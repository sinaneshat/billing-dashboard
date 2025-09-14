import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthForm } from '@/components/auth/auth-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta.signUp');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function SignUpPage() {
  return <AuthForm />;
}
