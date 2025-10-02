'use client';

import { Calendar, CalendarDays, Clock } from 'lucide-react';
import { useLocale } from 'next-intl';
import { memo } from 'react';

import {
  formatBillingDate,
  formatNextBillingDate,
  formatRelativeTime,
  getDaysUntil,
  isOverdue,
  isValidDate,
} from '@/lib/format';
import { cn } from '@/lib/ui';

import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

// =============================================================================
// DATE DISPLAY COMPONENT
// Unified component for consistent date display across the billing dashboard
// =============================================================================

export interface DateDisplayProps {
  /**
   * The date to display (string, Date, or timestamp)
   */
  date: Date | string | number;

  /**
   * Display format variant
   * - 'billing': For subscription next billing dates (contextual)
   * - 'short': Compact format (Jan 15, 2024)
   * - 'medium': Standard format (January 15, 2024)
   * - 'long': Full format with weekday (Monday, January 15, 2024)
   * - 'relative': Relative time (2 hours ago, 3 days ago)
   */
  variant?: 'billing' | 'short' | 'medium' | 'long' | 'relative';

  /**
   * Show an icon alongside the date
   */
  showIcon?: boolean;

  /**
   * Icon to display (defaults based on variant)
   */
  icon?: React.ReactNode;

  /**
   * Show status indicator for overdue dates
   */
  showStatus?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Text size variant
   */
  size?: 'xs' | 'sm' | 'base' | 'lg';

  /**
   * Text color/emphasis
   */
  emphasis?: 'default' | 'muted' | 'primary' | 'warning' | 'error';

  /**
   * Show tooltip with additional date information
   */
  showTooltip?: boolean;

  /**
   * Custom tooltip content
   */
  tooltipContent?: string;
}

/**
 * DateDisplay Component
 *
 * A comprehensive date display component that handles:
 * - English locale formatting
 * - Contextual billing date formatting
 * - Overdue status indication
 * - Consistent styling across the app
 *
 * @example
 * ```tsx
 * // Next billing date
 * <DateDisplay
 *   date={subscription.nextBillingDate}
 *   variant="billing"
 *   showIcon
 *   showStatus
 * />
 *
 * // Payment history
 * <DateDisplay
 *   date={payment.createdAt}
 *   variant="relative"
 *   size="sm"
 *   emphasis="muted"
 * />
 *
 * // Subscription start date
 * <DateDisplay
 *   date={subscription.startDate}
 *   variant="medium"
 *   showTooltip
 * />
 * ```
 */
export const DateDisplay = memo<DateDisplayProps>(({
  date,
  variant = 'medium',
  showIcon = false,
  icon,
  showStatus = false,
  className,
  size = 'base',
  emphasis = 'default',
  showTooltip = false,
  tooltipContent,
}) => {
  const locale = useLocale();

  // Validate date
  if (!isValidDate(date)) {
    const invalidText = locale === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
    return (
      <span className={cn('text-destructive', getSizeClasses(size), className)}>
        {invalidText}
      </span>
    );
  }

  // Format date based on variant
  const formattedDate = formatDateByVariant(date, variant, locale);

  // Determine status for overdue dates
  const dateStatus = showStatus ? getDateStatus(date, locale) : null;

  // Get appropriate icon
  const displayIcon = getDisplayIcon(variant, icon, showIcon);

  // Build CSS classes
  const textClasses = cn(
    getSizeClasses(size),
    getEmphasisClasses(emphasis),
    className,
  );

  // Generate tooltip content
  const tooltip = generateTooltipContent(date, variant, locale, tooltipContent);

  const content = (
    <span className={cn('inline-flex items-center gap-1.5', textClasses)}>
      {displayIcon}
      <span>{formattedDate}</span>
      {dateStatus && (
        <Badge variant={dateStatus.variant} className="text-xs">
          {dateStatus.label}
        </Badge>
      )}
    </span>
  );

  // Wrap with tooltip if requested
  if (showTooltip && tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

DateDisplay.displayName = 'DateDisplay';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format date based on variant
 */
function formatDateByVariant(
  date: Date | string | number,
  variant: DateDisplayProps['variant'],
  locale: string,
): string {
  switch (variant) {
    case 'billing':
      return formatNextBillingDate(date, locale);
    case 'short':
      return formatBillingDate(date, locale, 'short');
    case 'medium':
      return formatBillingDate(date, locale, 'medium');
    case 'long':
      return formatBillingDate(date, locale, 'long');
    case 'relative':
      return formatRelativeTime(date, locale);
    default:
      return formatBillingDate(date, locale, 'medium');
  }
}

/**
 * Get date status for overdue dates
 */
function getDateStatus(
  date: Date | string | number,
  locale: string,
): { variant: 'destructive' | 'secondary' | 'outline'; label: string } | null {
  const daysUntil = getDaysUntil(date);

  if (isOverdue(date)) {
    return {
      variant: 'destructive',
      label: locale === 'fa' ? 'عقب‌افتاده' : 'Overdue',
    };
  }

  if (daysUntil <= 3 && daysUntil > 0) {
    return {
      variant: 'secondary',
      label: locale === 'fa' ? 'نزدیک' : 'Due Soon',
    };
  }

  return null;
}

/**
 * Get display icon based on variant
 */
function getDisplayIcon(
  variant: DateDisplayProps['variant'],
  customIcon?: React.ReactNode,
  showIcon?: boolean,
): React.ReactNode {
  if (!showIcon) {
    return null;
  }

  if (customIcon) {
    return customIcon;
  }

  switch (variant) {
    case 'billing':
      return <CalendarDays className="h-4 w-4" />;
    case 'relative':
      return <Clock className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

/**
 * Get CSS classes for text size
 */
function getSizeClasses(size: DateDisplayProps['size']): string {
  switch (size) {
    case 'xs':
      return 'text-xs';
    case 'sm':
      return 'text-sm';
    case 'base':
      return 'text-base';
    case 'lg':
      return 'text-lg';
    default:
      return 'text-base';
  }
}

/**
 * Get CSS classes for text emphasis
 */
function getEmphasisClasses(emphasis: DateDisplayProps['emphasis']): string {
  switch (emphasis) {
    case 'default':
      return 'text-foreground';
    case 'muted':
      return 'text-muted-foreground';
    case 'primary':
      return 'text-primary';
    case 'warning':
      return 'text-chart-2';
    case 'error':
      return 'text-destructive';
    default:
      return 'text-foreground';
  }
}

/**
 * Generate tooltip content
 */
function generateTooltipContent(
  date: Date | string | number,
  variant: DateDisplayProps['variant'],
  locale: string,
  customContent?: string,
): string | null {
  if (customContent) {
    return customContent;
  }

  // For billing dates, show detailed information
  if (variant === 'billing') {
    const daysUntil = getDaysUntil(date);
    const fullDate = formatBillingDate(date, locale, 'long');

    if (daysUntil === 0) {
      return `${fullDate} (${locale === 'fa' ? 'امروز' : 'Today'})`;
    }

    if (daysUntil === 1) {
      return `${fullDate} (${locale === 'fa' ? 'فردا' : 'Tomorrow'})`;
    }

    if (daysUntil > 0) {
      const daysText = locale === 'fa' ? `${daysUntil} روز دیگر` : `in ${daysUntil} days`;
      return `${fullDate} (${daysText})`;
    }

    if (daysUntil < 0) {
      const daysText = locale === 'fa'
        ? `${Math.abs(daysUntil)} روز پیش`
        : `${Math.abs(daysUntil)} days ago`;
      return `${fullDate} (${daysText})`;
    }
  }

  // For relative dates, show full date
  if (variant === 'relative') {
    return formatBillingDate(date, locale, 'long');
  }

  return null;
}

// =============================================================================
// SPECIALIZED DATE DISPLAY VARIANTS
// =============================================================================

/**
 * NextBillingDate - Specialized component for subscription cards
 */
export interface NextBillingDateProps {
  date: Date | string | number;
  className?: string;
  showTooltip?: boolean;
}

export const NextBillingDate = memo<NextBillingDateProps>(({
  date,
  className,
  showTooltip = true,
}) => (
  <DateDisplay
    date={date}
    variant="billing"
    showIcon
    showStatus
    size="sm"
    emphasis="muted"
    showTooltip={showTooltip}
    className={className}
  />
));

NextBillingDate.displayName = 'NextBillingDate';

/**
 * PaymentDate - Specialized component for payment history
 */
export interface PaymentDateProps {
  date: Date | string | number;
  variant?: 'short' | 'relative';
  className?: string;
}

export const PaymentDate = memo<PaymentDateProps>(({
  date,
  variant = 'short',
  className,
}) => (
  <DateDisplay
    date={date}
    variant={variant}
    size="sm"
    emphasis="muted"
    className={className}
  />
));

PaymentDate.displayName = 'PaymentDate';

/**
 * CreatedAtDate - Specialized component for creation dates
 */
export interface CreatedAtDateProps {
  date: Date | string | number;
  showRelative?: boolean;
  className?: string;
}

export const CreatedAtDate = memo<CreatedAtDateProps>(({
  date,
  showRelative = true,
  className,
}) => (
  <DateDisplay
    date={date}
    variant={showRelative ? 'relative' : 'short'}
    showIcon={!showRelative}
    size="sm"
    emphasis="muted"
    showTooltip={showRelative}
    className={className}
  />
));

CreatedAtDate.displayName = 'CreatedAtDate';