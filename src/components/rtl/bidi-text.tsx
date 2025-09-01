/**
 * Bidirectional Text Component
 * Automatically handles RTL/LTR text rendering with proper direction detection
 */

'use client';

import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { detectTextDirection, insertDirectionalMarks } from '@/utils/text-direction';

export type BidiTextProps = {
  children: string;
  as?: ElementType;
  forceDirection?: 'rtl' | 'ltr' | 'auto';
  isolate?: boolean; // Use CSS isolation for mixed content
  insertMarks?: boolean; // Insert Unicode directional marks
  detectThreshold?: number; // Custom detection threshold
} & HTMLAttributes<HTMLElement>;

export function BidiText({
  children,
  className,
  as: Component = 'span',
  forceDirection,
  isolate = false,
  insertMarks = false,
  detectThreshold = 0.3,
  ...props
}: BidiTextProps) {
  // Detect text direction
  const detectedDirection = useMemo(() => {
    if (forceDirection && forceDirection !== 'auto')
      return forceDirection;
    return detectTextDirection(children, { threshold: detectThreshold });
  }, [children, forceDirection, detectThreshold]);

  // Prepare text with directional marks if needed
  const processedText = useMemo(() => {
    if (insertMarks && detectedDirection !== 'neutral') {
      return insertDirectionalMarks(children);
    }
    return children;
  }, [children, insertMarks, detectedDirection]);

  // Determine final direction
  const finalDirection = useMemo(() => {
    if (forceDirection === 'auto')
      return 'auto';
    if (detectedDirection === 'neutral')
      return 'ltr';
    return detectedDirection;
  }, [detectedDirection, forceDirection]);

  // Generate CSS classes based on direction
  const directionClasses = useMemo(() => {
    const classes = [];

    // Base direction class
    if (finalDirection === 'rtl') {
      classes.push('text-right', 'persian-text');
    } else if (finalDirection === 'ltr') {
      classes.push('text-left');
    }

    // Isolation for mixed content
    if (isolate) {
      classes.push('isolate');
    }

    return classes.join(' ');
  }, [finalDirection, isolate]);

  return (
    <Component
      dir={finalDirection}
      className={cn(directionClasses, className)}
      lang={detectedDirection === 'rtl' ? 'fa' : 'en'}
      style={{
        unicodeBidi: isolate ? 'isolate' : 'normal',
        ...props.style,
      }}
      {...props}
    >
      {processedText}
    </Component>
  );
}

/**
 * Specialized component for Persian text with optimized rendering
 */
export type PersianTextProps = {
  persianNumbers?: boolean;
} & Omit<BidiTextProps, 'forceDirection'>;

export function PersianText({
  children,
  className,
  persianNumbers = true,
  ...props
}: PersianTextProps) {
  const processedText = useMemo(() => {
    if (!persianNumbers)
      return children;

    // Convert English digits to Persian
    return children.replace(/\d/g, (digit) => {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      const digitIndex = Number.parseInt(digit, 10);
      return persianDigits[digitIndex] || digit;
    });
  }, [children, persianNumbers]);

  return (
    <BidiText
      forceDirection="rtl"
      className={cn('persian-text font-persian', className)}
      {...props}
    >
      {processedText}
    </BidiText>
  );
}

/**
 * Component for mixed RTL/LTR content with proper isolation
 */
export type MixedTextProps = {
  children: ReactNode;
  defaultDirection?: 'rtl' | 'ltr';
} & HTMLAttributes<HTMLDivElement>;

export function MixedText({
  children,
  className,
  defaultDirection = 'ltr',
  ...props
}: MixedTextProps) {
  return (
    <div
      className={cn('mixed-content', className)}
      dir={defaultDirection}
      style={{
        unicodeBidi: 'plaintext',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
