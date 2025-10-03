'use client';

import { useTranslations } from 'next-intl';

import { Logo } from '@/components/logo';
import { LayoutTextFlip } from '@/components/ui/layout-text-flip';

export default function DashboardOverviewScreen() {
  const t = useTranslations();

  // Prepare rotating words from translations
  const rotatingWords = [
    t('dashboard.hero.rotatingWords.multipleAI'),
    t('dashboard.hero.rotatingWords.expertSystems'),
    t('dashboard.hero.rotatingWords.smartAssistants'),
    t('dashboard.hero.rotatingWords.aiThinkTanks'),
  ];

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start px-4 pt-24">
      {/* Main content block - positioned in upper portion */}
      <div className="flex flex-col items-center gap-12 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <Logo size="md" variant="full" />
        </div>

        {/* Hero Section with Animated Text */}
        <div className="flex flex-col items-center gap-6">
          <LayoutTextFlip
            text={t('dashboard.hero.staticText')}
            words={rotatingWords}
            duration={3000}
          />

          <p className="text-lg text-muted-foreground max-w-2xl">
            {t('dashboard.hero.subtitle')}
          </p>
        </div>

        {/* Getting Started Hint */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground/70">
            {t('chat.selectOrCreate')}
          </p>
        </div>
      </div>
    </div>
  );
}
