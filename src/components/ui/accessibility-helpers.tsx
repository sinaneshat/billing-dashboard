'use client';

import { useTranslations } from 'next-intl';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

// Accessibility context for managing global a11y settings
interface AccessibilityContextValue {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Provider component for accessibility settings
interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Detect system preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for reduced motion preference
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(motionQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      motionQuery.addEventListener('change', handleMotionChange);

      // Check for high contrast preference
      const contrastQuery = window.matchMedia('(prefers-contrast: high)');
      setHighContrast(contrastQuery.matches);

      const handleContrastChange = (e: MediaQueryListEvent) => setHighContrast(e.matches);
      contrastQuery.addEventListener('change', handleContrastChange);

      // Detect keyboard navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          setKeyboardNavigation(true);
        }
      };

      const handleMouseDown = () => {
        setKeyboardNavigation(false);
      };

      // Detect screen reader
      const checkScreenReader = () => {
        const isScreenReader = window.navigator.userAgent.includes('NVDA') ||
          window.navigator.userAgent.includes('JAWS') ||
          window.speechSynthesis?.speaking ||
          document.querySelector('[aria-live]') !== null;
        setScreenReaderMode(isScreenReader);
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleMouseDown);
      checkScreenReader();

      return () => {
        motionQuery.removeEventListener('change', handleMotionChange);
        contrastQuery.removeEventListener('change', handleContrastChange);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleMouseDown);
      };
    }

    return undefined;
  }, []);

  // Apply accessibility preferences to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('reduce-motion', reducedMotion);
      document.documentElement.classList.toggle('high-contrast', highContrast);
      document.documentElement.classList.toggle('large-text', largeText);
      document.documentElement.classList.toggle('keyboard-navigation', keyboardNavigation);
    }
  }, [reducedMotion, highContrast, largeText, keyboardNavigation]);

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const contextValue: AccessibilityContextValue = {
    reducedMotion,
    highContrast,
    largeText,
    keyboardNavigation,
    screenReaderMode,
    setReducedMotion,
    setHighContrast,
    setLargeText,
    announceToScreenReader,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Screen reader announcer */}
      <div
        ref={announcerRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </AccessibilityContext.Provider>
  );
}

// Skip link component for keyboard navigation
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'absolute -top-40 left-6 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md',
        'focus:top-6 transition-all duration-300',
        'font-medium text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
}

// Focus trap component for modals and dropdowns
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

export function FocusTrap({ 
  children, 
  active = true, 
  restoreFocus = true,
  className 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Store previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        // Allow escape to close
        e.stopPropagation();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, restoreFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Responsive text component that adapts to screen size
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function ResponsiveText({
  children,
  size = 'base',
  weight = 'normal',
  className,
  as: Component = 'span',
}: ResponsiveTextProps) {
  const responsiveClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-sm sm:text-base lg:text-lg',
    lg: 'text-base sm:text-lg lg:text-xl',
    xl: 'text-lg sm:text-xl lg:text-2xl',
    '2xl': 'text-xl sm:text-2xl lg:text-3xl',
    '3xl': 'text-2xl sm:text-3xl lg:text-4xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <Component 
      className={cn(
        responsiveClasses[size],
        weightClasses[weight],
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </Component>
  );
}

// Screen reader only text component
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: 'span' | 'div' | 'p';
}

export function ScreenReaderOnly({ 
  children, 
  as: Component = 'span' 
}: ScreenReaderOnlyProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

// High contrast mode toggle
export function HighContrastToggle() {
  const { highContrast, setHighContrast } = useAccessibility();
  const t = useTranslations();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setHighContrast(!highContrast)}
      aria-label={highContrast ? t('accessibility.disableHighContrast') : t('accessibility.enableHighContrast')}
      className="relative"
    >
      <div className={cn(
        'w-4 h-4 rounded-sm border-2 mr-2',
        highContrast ? 'bg-foreground border-foreground' : 'bg-background border-foreground'
      )} />
      {t('accessibility.highContrast')}
    </Button>
  );
}

// Reduced motion toggle
export function ReducedMotionToggle() {
  const { reducedMotion, setReducedMotion } = useAccessibility();
  const t = useTranslations();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setReducedMotion(!reducedMotion)}
      aria-label={reducedMotion ? t('accessibility.enableMotion') : t('accessibility.disableMotion')}
    >
      <div className={cn(
        'w-4 h-4 rounded-full mr-2 transition-transform',
        reducedMotion ? 'bg-red-500' : 'bg-green-500',
        !reducedMotion && 'animate-pulse'
      )} />
      {t('accessibility.reducedMotion')}
    </Button>
  );
}

// Large text toggle
export function LargeTextToggle() {
  const { largeText, setLargeText } = useAccessibility();
  const t = useTranslations();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLargeText(!largeText)}
      aria-label={largeText ? t('accessibility.normalText') : t('accessibility.largeText')}
      className={cn(largeText && 'text-lg')}
    >
      <span className="mr-2 font-bold" style={{ fontSize: largeText ? '1.2em' : '1em' }}>
        A
      </span>
      {t('accessibility.largeText')}
    </Button>
  );
}

// Accessibility toolbar
export function AccessibilityToolbar({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations();

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t('accessibility.openToolbar')}
      >
        {t('accessibility.accessibility')}
      </Button>

      {isOpen && (
        <FocusTrap active={isOpen}>
          <div className="absolute top-full left-0 mt-2 p-4 bg-background border rounded-lg shadow-lg space-y-3 min-w-64 z-50">
            <h3 className="font-medium text-sm">{t('accessibility.settings')}</h3>
            
            <div className="space-y-2">
              <HighContrastToggle />
              <ReducedMotionToggle />
              <LargeTextToggle />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              {t('actions.close')}
            </Button>
          </div>
        </FocusTrap>
      )}
    </div>
  );
}

// Live region for dynamic content announcements
interface LiveRegionProps {
  message?: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export function LiveRegion({ 
  message = '', 
  priority = 'polite',
  className 
}: LiveRegionProps) {
  return (
    <div
      className={cn('sr-only', className)}
      aria-live={priority}
      aria-atomic="true"
      role="status"
    >
      {message}
    </div>
  );
}

// Responsive container with breakpoint-aware classes
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md',
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
  };

  return (
    <div 
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

