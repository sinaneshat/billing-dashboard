/**
 * RTL Hooks
 * React hooks for RTL functionality
 */

'use client';

import { createContext, use } from 'react';

export type RTLContextType = {
  direction: 'rtl' | 'ltr';
  language: string;
  setLanguage: (lang: string) => void;
  setDirection: (dir: 'rtl' | 'ltr') => void;
  isRTL: boolean;
  isLTR: boolean;
  toggleDirection: () => void;
};

export const RTLContext = createContext<RTLContextType | undefined>(undefined);

/**
 * Hook to use RTL context
 */
export function useRTL(): RTLContextType {
  const context = use(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within RTLProvider');
  }
  return context;
}

/**
 * Utility hook for direction-aware styling
 */
export function useDirectionStyles() {
  const { direction, isRTL, isLTR } = useRTL();

  return {
    direction,
    isRTL,
    isLTR,
    // Direction-aware margin/padding utilities
    marginStart: isRTL ? 'mr' : 'ml',
    marginEnd: isRTL ? 'ml' : 'mr',
    paddingStart: isRTL ? 'pr' : 'pl',
    paddingEnd: isRTL ? 'pl' : 'pr',
    // Text alignment
    textAlign: isRTL ? 'text-right' : 'text-left',
    textAlignOpposite: isRTL ? 'text-left' : 'text-right',
    // Float utilities
    floatStart: isRTL ? 'float-right' : 'float-left',
    floatEnd: isRTL ? 'float-left' : 'float-right',
    // Border utilities
    borderStart: isRTL ? 'border-r' : 'border-l',
    borderEnd: isRTL ? 'border-l' : 'border-r',
  };
}
