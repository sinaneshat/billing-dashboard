'use client';

import { Languages, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import React, { useTransition } from 'react';

import { setUserLocale } from '@/lib/i18n/locale-cookies';
import { type Locale } from '@/i18n/routing';
import { locales } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/ui/cn';

// Language display names
const languageNames: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  fa: { native: 'فارسی', english: 'Persian' },
};

interface LocaleSwitcherProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showLabel?: boolean;
}

// Note: HTML attributes and classes are now handled by the layout
// This avoids conflicts with next-themes' class management

export function LocaleSwitcher({
  className,
  variant = 'ghost',
  size = 'default',
  showLabel = true,
}: LocaleSwitcherProps) {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  
  // Note: translations are available but not used in this component
  // const t = useTranslations('language');

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    
    // OFFICIAL PATTERN: Server Action sets cookie, client handles refresh
    // This preserves theme state and prevents UI flash
    startTransition(async () => {
      try {
        await setUserLocale(newLocale);
        // Gentle refresh that preserves theme and other state
        window.location.reload();
      } catch (error) {
        console.error('Failed to change locale:', error);
      }
    });
  };

  const isLoading = isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'flex items-center gap-2',
            isLoading && 'pointer-events-none opacity-50',
            className
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="hidden sm:inline-block">
              {languageNames[currentLocale].native}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {locales.map((locale) => {
          const isActive = locale === currentLocale;
          const languageInfo = languageNames[locale];
          
          return (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={cn(
                'flex items-center justify-between',
                isActive && 'bg-accent'
              )}
              disabled={isActive || isLoading}
            >
              <div className="flex flex-col">
                <span className="font-medium">{languageInfo.native}</span>
                <span className="text-xs text-muted-foreground">
                  {languageInfo.english}
                </span>
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simplified version for specific use cases
export function SimpleLocaleSwitcher({ 
  className 
}: { className?: string }) {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const otherLocale = currentLocale === 'en' ? 'fa' : 'en';
  const isLoading = isPending;

  const handleToggle = async () => {
    // OFFICIAL PATTERN: Server Action sets cookie, client handles refresh
    startTransition(async () => {
      try {
        await setUserLocale(otherLocale);
        // Gentle refresh that preserves theme and other state
        window.location.reload();
      } catch (error) {
        console.error('Failed to change locale:', error);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2',
        isLoading && 'pointer-events-none opacity-50',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Languages className="h-4 w-4" />
      )}
      <span>{languageNames[otherLocale].native}</span>
    </Button>
  );
}
