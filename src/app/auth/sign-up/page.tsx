import type { Metadata } from 'next';

import { AuthForm } from '@/components/auth/auth-form';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your account to get started',
};

export default async function SignUpPage() {
  return <AuthForm isSignUp />;
}
