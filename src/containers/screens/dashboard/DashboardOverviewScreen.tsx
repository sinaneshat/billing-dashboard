'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageHeader } from '@/components/dashboard/dashboard-header';
import { DashboardContainer } from '@/components/dashboard/dashboard-layout';
import { DashboardPage } from '@/components/dashboard/dashboard-states';
import { useSession } from '@/lib/auth/client';

export default function DashboardOverviewScreen() {
  const t = useTranslations();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={`${t('dashboard.welcome')}, ${user?.name || user?.email?.split('@')[0] || t('user.defaultName')}!`}
        description={t('dashboard.description')}
      />

      <DashboardContainer>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <h2 className="text-2xl font-semibold">{t('dashboard.overview.title')}</h2>
          <p className="text-muted-foreground">{t('chat.selectOrCreate')}</p>
        </div>
      </DashboardContainer>
    </DashboardPage>
  );
}
