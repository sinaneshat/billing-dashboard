/**
 * RTL Provider Component
 * Manages RTL/LTR text direction context throughout the application
 */

'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RTLContextType } from '@/hooks/use-rtl';
import { RTLContext } from '@/hooks/use-rtl';

export type RTLProviderProps = {
  children: ReactNode;
  defaultLanguage?: string;
  defaultDirection?: 'rtl' | 'ltr';
  autoDetectFromLanguage?: boolean;
};

// RTL languages configuration
const RTL_LANGUAGES = ['fa', 'ar', 'he', 'ur', 'yi', 'ps', 'sd'];

export function RTLProvider({
  children,
  defaultLanguage = 'en',
  defaultDirection = 'ltr',
  autoDetectFromLanguage = true,
}: RTLProviderProps) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [direction, setDirectionState] = useState<'rtl' | 'ltr'>(defaultDirection);

  // Auto-detect direction based on language
  useEffect(() => {
    if (autoDetectFromLanguage) {
      const newDirection = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setDirectionState((prevDirection) => {
        if (prevDirection !== newDirection) {
          return newDirection;
        }
        return prevDirection;
      });
    }
  }, [language, autoDetectFromLanguage]);

  // Update document attributes when direction changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;

      // Add CSS class for styling
      document.documentElement.classList.toggle('rtl', direction === 'rtl');
      document.documentElement.classList.toggle('ltr', direction === 'ltr');

      // Add language-specific classes
      document.documentElement.className = document.documentElement.className
        .replace(/\blang-\w+\b/g, ''); // Remove existing lang classes
      document.documentElement.classList.add(`lang-${language}`);
    }
  }, [direction, language]);

  const setDirection = useCallback((dir: 'rtl' | 'ltr') => {
    setDirectionState(dir);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirectionState(current => current === 'rtl' ? 'ltr' : 'rtl');
  }, []);

  const contextValue: RTLContextType = useMemo(() => ({
    direction,
    language,
    setLanguage,
    setDirection,
    isRTL: direction === 'rtl',
    isLTR: direction === 'ltr',
    toggleDirection,
  }), [direction, language, setLanguage, setDirection, toggleDirection]);

  return (
    <RTLContext value={contextValue}>
      <div
        dir={direction}
        className={`${direction === 'rtl' ? 'rtl-container' : 'ltr-container'} lang-${language}`}
        data-direction={direction}
        data-language={language}
      >
        {children}
      </div>
    </RTLContext>
  );
}
