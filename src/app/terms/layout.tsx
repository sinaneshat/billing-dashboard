import type React from 'react';

import { AuthLayout } from '@/containers/layouts/auth';

type TermsLayoutProps = {
  children: React.ReactNode;
};

export default async function TermsLayout({ children }: TermsLayoutProps) {
  return <AuthLayout>{children}</AuthLayout>;
}
