import { Suspense } from 'react';

import { AuthErrorScreen } from '@/containers/screens/errors';

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AuthErrorScreen />
    </Suspense>
  );
}
