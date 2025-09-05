'use client';

import { Languages, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import React, { useState, useTransition } from 'react';

import { setUserLocale } from '@/lib/i18n/locale-cookies';
import { type Locale, locales } from '@/i18n/routing';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

// Update HTML attributes for RTL/LTR without page refresh
function updateHTMLAttributes(locale: Locale) {
  const direction = locale === 'fa' ? 'rtl' : 'ltr';
  const html = document.documentElement;
  
  // Update HTML attributes
  html.lang = locale;
  html.dir = direction;
  
  // Preserve all existing classes except lang-* and dir-*
  const existingClasses = html.className
    .split(' ')
    .filter(cls => cls && !cls.match(/^lang-\w+$/) && !cls.match(/^dir-\w+$/))
    .join(' ');
  
  // Set new className with preserved classes + new lang/dir classes
  html.className = `${existingClasses} lang-${locale} dir-${direction}`.trim();
}

export function LocaleSwitcher({
  className,
  variant = 'ghost',
  size = 'default',
  showLabel = true,
}: LocaleSwitcherProps) {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Note: translations are available but not used in this component
  // const t = useTranslations('language');

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    setIsChanging(true);
    
    try {
      // Update the cookie first
      await setUserLocale(newLocale);
      
      // Update HTML attributes immediately for RTL/LTR
      updateHTMLAttributes(newLocale);
      
      // Use next-intl router for smooth client-side navigation
      startTransition(() => {
        // This will trigger a re-render with new translations without page refresh
        router.replace(pathname, { locale: newLocale });
        setIsChanging(false);
      });
    } catch (error) {
      console.error('Failed to change locale:', error);
      setIsChanging(false);
    }
  };

  const isLoading = isPending || isChanging;

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
export function SimpleLocaleSwitcher({ className }: { className?: string }) {
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale = currentLocale === 'en' ? 'fa' : 'en';
  const isLoading = isPending || isChanging;

  const handleToggle = async () => {
    setIsChanging(true);
    
    try {
      // Update the cookie first  
      await setUserLocale(otherLocale);
      
      // Update HTML attributes immediately for RTL/LTR
      updateHTMLAttributes(otherLocale);
      
      // Use next-intl router for smooth client-side navigation
      startTransition(() => {
        router.replace(pathname, { locale: otherLocale });
        setIsChanging(false);
      });
    } catch (error) {
      console.error('Failed to toggle locale:', error);
      setIsChanging(false);
    }
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
