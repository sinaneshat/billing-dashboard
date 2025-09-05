'use client';

import { Settings, Globe, Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SidebarMenuButton } from '@/components/ui/sidebar';

type SettingsPanelProps = {
  variant?: 'sidebar' | 'button';
  className?: string;
};

export const SettingsPanel = memo(({ variant = 'button', className }: SettingsPanelProps) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const TriggerComponent = variant === 'sidebar' 
    ? (
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          tooltip={t('settings.title')}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings className="size-4" />
          </div>
          <div className="grid flex-1 text-start text-sm leading-tight">
            <span className="truncate font-semibold">
              {t('settings.title')}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {t('settings.description')}
            </span>
          </div>
        </SidebarMenuButton>
      )
    : (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t('settings.title')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {TriggerComponent}
      </SheetTrigger>
      <SheetContent side="end" className="w-80">
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.title')}
          </SheetTitle>
          <SheetDescription>
            {t('settings.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                {t('settings.theme.title')}
              </Label>
            </div>
            <div className="ps-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {t('settings.theme.mode')}
                </Label>
                <ThemeToggle />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.theme.description')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Language Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                {t('settings.language.title')}
              </Label>
            </div>
            <div className="ps-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {t('settings.language.current')}
                </Label>
                <LocaleSwitcher variant="outline" size="sm" showLabel={false} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.language.description')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            {t('actions.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

SettingsPanel.displayName = 'SettingsPanel';