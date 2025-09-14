import type React from 'react';

import { AuthLayout } from '@/containers/layouts/auth';

type PrivacyLayoutProps = {
  children: React.ReactNode;
};

export default async function PrivacyLayout({ children }: PrivacyLayoutProps) {
  return <AuthLayout>{children}</AuthLayout>;
}
