import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back,
            {' '}
            {session.user.name || session.user.email}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold">Profile</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Email:
              {' '}
              {session.user.email}
            </p>
            <p className="text-sm text-muted-foreground">
              Verified:
              {' '}
              {session.user.emailVerified ? 'Yes' : 'No'}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold">Session</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Active session
            </p>
            <p className="text-sm text-muted-foreground">
              Expires:
              {' '}
              {session.session?.expiresAt ? new Date(session.session.expiresAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="mt-2 space-y-2">
              <a href="/auth/sign-out" className="block text-sm text-primary hover:underline">
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
