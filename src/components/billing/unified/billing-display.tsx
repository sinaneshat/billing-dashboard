'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardWithStates } from '@/components/ui/card-states';
import { cn } from '@/lib/ui/cn';

// =============================================================================
// UNIFIED BILLING DISPLAY SYSTEM
// Eliminates all inconsistencies across billing sections by providing:
// - Single component for ALL billing data types (subscriptions, payments, plans, methods, overview)
// - Consistent layout patterns (card, row, compact, detailed)
// - Unified state management with TanStack Query integration
// - Complete configurability through props/variants
// - Full TypeScript safety with generic data support
// =============================================================================

// Core billing data types that this component can handle
export type BillingDataType
  = | 'subscription'
    | 'payment'
    | 'plan'
    | 'paymentMethod'
    | 'metric'
    | 'bill'
    | 'overview'
    | 'custom';

// Layout variants
export type BillingDisplayVariant
  = | 'card' // Standard card with full information
    | 'row' // Horizontal row layout (for tables/lists)
    | 'compact' // Minimal card with essential info only
    | 'detailed' // Expanded card with all possible information
    | 'hero' // Large featured card (for overview/welcome)
    | 'mini'; // Very small card for metrics

// Display sizes
export type BillingDisplaySize = 'sm' | 'md' | 'lg' | 'xl';

// Status configuration
export type StatusConfig = {
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';
  label: string;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
};

// Action configuration
export type ActionConfig = {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

// Main content configuration
export type ContentConfig = {
  // Header information
  title: string;
  subtitle?: string;
  description?: string;

  // Visual elements
  icon?: React.ReactNode;
  status?: StatusConfig;
  badge?: StatusConfig;

  // Primary data display
  primaryValue?: string | number | React.ReactNode;
  primaryLabel?: string;

  // Secondary information
  secondaryValue?: string | number | React.ReactNode;
  secondaryLabel?: string;

  // Additional metadata
  metadata?: Array<{
    label: string;
    value: string | number | React.ReactNode;
    icon?: LucideIcon;
  }>;

  // Actions
  primaryAction?: ActionConfig;
  secondaryActions?: ActionConfig[];

  // Custom content areas
  headerExtra?: React.ReactNode;
  contentExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
};

// Styling configuration
export type StyleConfig = {
  cardClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  actionClassName?: string;
  hoverEffect?: boolean;
  borderStyle?: 'default' | 'dashed' | 'solid' | 'none';
  background?: 'default' | 'muted' | 'gradient' | 'transparent';
};

// Main component props
export type BillingDisplayItemProps = {
  // Core configuration
  variant?: BillingDisplayVariant;
  size?: BillingDisplaySize;
  dataType?: BillingDataType;

  // Content
  content: ContentConfig;

  // Styling
  style?: StyleConfig;
  className?: string;

  // Behavior
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
};

// Container props for handling multiple items
export type BillingDisplayContainerProps<T> = {
  // Data and state
  data?: T[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;

  // Display configuration
  variant?: BillingDisplayVariant;
  size?: BillingDisplaySize;
  dataType?: BillingDataType;

  // Layout
  columns?: 1 | 2 | 3 | 4 | 'auto';
  gap?: 'sm' | 'md' | 'lg';

  // Content transformation
  mapItem: (item: T, index: number) => ContentConfig;

  // Empty state customization
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;

  // Header
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;

  // Styling
  containerClassName?: string;
  itemClassName?: string;

  // Callbacks
  onItemClick?: (item: T, index: number) => void;
};

// Individual billing display item component
export const BillingDisplayItem = React.memo<BillingDisplayItemProps>(({
  variant = 'card',
  size = 'md',
  dataType: _dataType = 'custom',
  content,
  style = {},
  className,
  onClick,
  selectable = false,
  selected = false,
}) => {
  const t = useTranslations();

  // Size configurations
  const sizeConfig = {
    sm: {
      card: 'p-3',
      header: 'pb-2',
      content: 'space-y-2',
      title: 'text-sm font-medium',
      subtitle: 'text-xs',
      icon: 'h-4 w-4',
      iconContainer: 'h-6 w-6',
      primaryValue: 'text-lg',
      action: 'h-7 px-2 text-xs',
    },
    md: {
      card: 'p-4',
      header: 'pb-3',
      content: 'space-y-3',
      title: 'text-base font-medium',
      subtitle: 'text-sm',
      icon: 'h-5 w-5',
      iconContainer: 'h-8 w-8',
      primaryValue: 'text-xl',
      action: 'h-8 px-3 text-sm',
    },
    lg: {
      card: 'p-6',
      header: 'pb-4',
      content: 'space-y-4',
      title: 'text-lg font-semibold',
      subtitle: 'text-base',
      icon: 'h-6 w-6',
      iconContainer: 'h-10 w-10',
      primaryValue: 'text-2xl',
      action: 'h-9 px-4',
    },
    xl: {
      card: 'p-8',
      header: 'pb-6',
      content: 'space-y-6',
      title: 'text-xl font-bold',
      subtitle: 'text-lg',
      icon: 'h-8 w-8',
      iconContainer: 'h-12 w-12',
      primaryValue: 'text-3xl',
      action: 'h-10 px-6',
    },
  };

  const config = sizeConfig[size];

  // Variant-specific layouts
  const renderCardLayout = () => {
    // Determine if this is a pricing card by checking for plan-related content
    const isPricingCard = content.metadata?.some(meta =>
      !meta.label && React.isValidElement(meta.value),
    );

    // Determine if this card should use premium styling
    const isPremium = content.badge && (content.badge.variant === 'default'
      || (typeof content.badge.label === 'string'
        && (content.badge.label.toLowerCase().includes('popular')
          || content.badge.label.toLowerCase().includes('recommended')
          || content.badge.label.toLowerCase().includes('best')
          || content.badge.label.toLowerCase().includes('محبوب'))));

    return (
      <Card
        className={cn(
          'group relative h-full transition-all duration-300 overflow-hidden',
          style.hoverEffect !== false && 'hover:shadow-lg',
          selectable && 'cursor-pointer',
          selected && 'ring-2 ring-primary',
          onClick && 'cursor-pointer',
          // Enhanced backgrounds for pricing cards
          isPricingCard && !isPremium && 'border-border/60 shadow-md hover:shadow-xl hover:border-border bg-gradient-to-br from-card via-card/95 to-muted/20',
          isPricingCard && isPremium && 'border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/[0.02] via-card to-primary/[0.08] hover:shadow-2xl hover:border-primary/50 hover:from-primary/[0.04] hover:to-primary/[0.12] relative',
          // Original style overrides
          style.background === 'muted' && 'bg-muted/50',
          style.background === 'gradient' && 'bg-gradient-to-br from-card to-card/80',
          style.background === 'transparent' && 'bg-transparent shadow-none',
          style.borderStyle === 'dashed' && 'border-dashed border-2',
          style.borderStyle === 'none' && 'border-0 shadow-none',
          style.cardClassName,
          className,
        )}
        onClick={onClick}
      >
        {/* Premium card glow effect */}
        {isPricingCard && isPremium && (
          <>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          </>
        )}

        {/* Enhanced background pattern for pricing cards */}
        {isPricingCard && (
          <div className="absolute inset-0 -z-10 opacity-5 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 group-hover:opacity-10 transition-opacity duration-300" />
        )}
        {/* Header */}
        <CardHeader className={cn(config.header, style.headerClassName, 'relative z-10')}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon */}
              {content.icon && (
                <div className={cn(
                  config.iconContainer,
                  'flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/8 border border-primary/25 shrink-0 shadow-sm transition-all duration-300',
                  isPricingCard && 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 shadow-md',
                  isPricingCard && isPremium && 'ring-1 ring-primary/20 shadow-lg',
                )}
                >
                  {React.isValidElement(content.icon)
                    ? React.cloneElement(content.icon as React.ReactElement<{ className?: string }>, {
                        className: cn(config.icon, 'text-primary group-hover:text-primary/80 transition-colors drop-shadow-sm'),
                      })
                    : content.icon}
                </div>
              )}

              {/* Title and subtitle */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <CardTitle className={cn(
                    config.title,
                    'font-semibold tracking-tight',
                    isPricingCard && 'text-base sm:text-lg font-bold text-foreground/90',
                    !isPricingCard && 'truncate',
                  )}
                  >
                    {content.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {content.status && (
                      <Badge
                        variant={content.status.variant}
                        className="shrink-0 shadow-sm font-medium text-xs"
                      >
                        {content.status.label}
                      </Badge>
                    )}
                    {content.badge && content.badge !== content.status && (
                      <Badge
                        variant={content.badge.variant}
                        className={cn(
                          'shrink-0 shadow-sm font-medium transition-all duration-200 text-xs',
                          isPremium && 'bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/20 px-2 sm:px-3 py-0.5 sm:py-1 font-bold uppercase tracking-wider',
                        )}
                      >
                        {content.badge.label}
                      </Badge>
                    )}
                  </div>
                </div>
                {content.subtitle && (
                  <CardDescription className={cn(
                    config.subtitle,
                    'truncate',
                    isPricingCard && 'text-muted-foreground/80 font-medium',
                  )}
                  >
                    {content.subtitle}
                  </CardDescription>
                )}
                {content.description && (variant === 'detailed' || isPricingCard) && (
                  <CardDescription className={cn(
                    'text-xs text-muted-foreground leading-relaxed',
                    isPricingCard && 'text-sm mt-2 text-muted-foreground/90 leading-relaxed',
                  )}
                  >
                    {content.description}
                  </CardDescription>
                )}
              </div>
            </div>

            {/* Header action - hidden on mobile for pricing cards */}
            {content.primaryAction && !isPricingCard && (
              <CardAction className="shrink-0">
                <Button
                  variant={content.primaryAction.variant || 'outline'}
                  size={content.primaryAction.size || 'sm'}
                  onClick={(e) => {
                    e.stopPropagation();
                    content.primaryAction?.onClick?.();
                  }}
                  disabled={content.primaryAction.disabled || content.primaryAction.loading}
                  className={cn(
                    config.action,
                    style.actionClassName,
                    'transition-all duration-200 shadow-sm hover:shadow-md font-medium',
                  )}
                >
                  {content.primaryAction.icon && (
                    <content.primaryAction.icon className={cn(config.icon, 'mr-1')} />
                  )}
                  {content.primaryAction.label}
                </Button>
              </CardAction>
            )}

            {content.headerExtra}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className={cn(
          config.content,
          style.contentClassName,
          'relative z-10',
          isPricingCard && 'space-y-4',
        )}
        >
          {/* Primary value */}
          {content.primaryValue && (
            <div className={cn(
              'flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-4 rounded-lg border transition-all duration-200 gap-2',
              isPricingCard && 'bg-gradient-to-r from-muted/40 to-muted/20 border-muted/30 shadow-sm hover:shadow-md hover:from-muted/50 hover:to-muted/30',
              !isPricingCard && 'bg-muted/20 border-muted/40',
            )}
            >
              <span className={cn(
                'text-xs sm:text-sm text-muted-foreground',
                isPricingCard && 'font-medium text-muted-foreground/90 uppercase tracking-wide',
              )}
              >
                {content.primaryLabel || t('billing.amount')}
              </span>
              <span className={cn(
                'text-xl sm:text-2xl font-bold',
                isPricingCard && 'font-extrabold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent drop-shadow-sm',
              )}
              >
                {content.primaryValue}
              </span>
            </div>
          )}

          {/* Secondary value */}
          {content.secondaryValue && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {content.secondaryLabel || t('billing.date')}
              </span>
              <span className="text-sm font-medium">
                {content.secondaryValue}
              </span>
            </div>
          )}

          {/* Metadata */}
          {content.metadata && content.metadata.length > 0 && (
            <div className="space-y-2">
              {content.metadata.map((meta, metaIndex) => {
              // Check if this is a feature item (empty label with React element value)
                const isFeatureItem = !meta.label && React.isValidElement(meta.value);

                if (isFeatureItem) {
                // Feature items should not use justify-between layout
                  return (
                    <div key={`feature-item-${metaIndex}`} className="flex items-start">
                      {meta.value}
                    </div>
                  );
                }

                // Regular metadata items use the original layout
                return (
                  <div key={`${meta.label}-${typeof meta.value === 'string' ? meta.value : 'value'}-${metaIndex}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {meta.icon && <meta.icon className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">{meta.label}</span>
                    </div>
                    <span className="text-xs font-medium">{meta.value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Secondary actions */}
          {content.secondaryActions && content.secondaryActions.length > 0 && (
            <div className={cn(
              'flex flex-col sm:flex-row sm:items-center gap-2 pt-2',
              isPricingCard && 'pt-4',
            )}
            >
              {content.secondaryActions.map(action => (
                <Button
                  key={action.label || action.icon?.toString() || 'secondary-action'}
                  variant={action.variant || 'outline'}
                  size={action.size || 'sm'}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick?.();
                  }}
                  disabled={action.disabled || action.loading}
                  className={cn(
                    'w-full sm:flex-1 transition-all duration-200',
                    config.action,
                    isPricingCard && 'shadow-sm hover:shadow-md font-medium border-2 hover:border-primary/50 hover:bg-primary/5',
                  )}
                >
                  {action.icon && <action.icon className={cn(config.icon, 'mr-1')} />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Primary action for pricing cards - moved to content area on mobile */}
          {content.primaryAction && isPricingCard && (
            <div className="mt-4">
              <Button
                variant={content.primaryAction.variant || 'outline'}
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  content.primaryAction?.onClick?.();
                }}
                disabled={content.primaryAction.disabled || content.primaryAction.loading}
                className={cn(
                  'w-full transition-all duration-200 shadow-sm hover:shadow-md font-medium h-11',
                  isPremium && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg ring-1 ring-primary/20',
                  !isPremium && 'border-2 hover:border-primary/50 hover:bg-primary/5',
                )}
              >
                {content.primaryAction.icon && (
                  <content.primaryAction.icon className="h-5 w-5 mr-2" />
                )}
                {content.primaryAction.label}
              </Button>
            </div>
          )}

          {content.contentExtra}
        </CardContent>

        {content.footerExtra}
      </Card>
    );
  };

  const renderRowLayout = () => (
    <div
      className={cn(
        'flex items-center justify-between p-4 border rounded-lg transition-all duration-200',
        style.hoverEffect !== false && 'hover:bg-muted/50',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary',
        onClick && 'cursor-pointer',
        style.borderStyle === 'dashed' && 'border-dashed border-2',
        style.cardClassName,
        className,
      )}
      onClick={onClick}
      onKeyDown={onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon */}
        {content.icon && (
          <div className={cn(
            config.iconContainer,
            'flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shrink-0',
          )}
          >
            {React.isValidElement(content.icon)
              ? React.cloneElement(content.icon as React.ReactElement<{ className?: string }>, {
                  className: cn(config.icon, 'text-primary'),
                })
              : content.icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={cn(config.title, 'truncate')}>{content.title}</h3>
            {content.status && (
              <Badge variant={content.status.variant} className="shrink-0">
                {content.status.label}
              </Badge>
            )}
          </div>
          {content.subtitle && (
            <p className={cn(config.subtitle, 'text-muted-foreground truncate')}>
              {content.subtitle}
            </p>
          )}
        </div>

        {/* Values */}
        <div className="text-right shrink-0">
          {content.primaryValue && (
            <div className={cn(config.primaryValue, 'font-semibold')}>
              {content.primaryValue}
            </div>
          )}
          {content.secondaryValue && (
            <div className="text-sm text-muted-foreground">
              {content.secondaryValue}
            </div>
          )}
        </div>

        {/* Actions */}
        {content.primaryAction && (
          <Button
            variant={content.primaryAction.variant || 'outline'}
            size={content.primaryAction.size || 'sm'}
            onClick={(e) => {
              e.stopPropagation();
              content.primaryAction?.onClick?.();
            }}
            disabled={content.primaryAction.disabled || content.primaryAction.loading}
            className={cn('ml-3', config.action)}
          >
            {content.primaryAction.icon && (
              <content.primaryAction.icon className={cn(config.icon, 'mr-1')} />
            )}
            {content.primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );

  const renderCompactLayout = () => (
    <Card
      className={cn(
        'transition-all duration-200',
        style.hoverEffect !== false && 'hover:shadow-md',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary',
        onClick && 'cursor-pointer',
        style.cardClassName,
        className,
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-3 space-y-2', style.contentClassName)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {content.icon && (
              <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 shrink-0">
                {React.isValidElement(content.icon)
                  ? React.cloneElement(content.icon as React.ReactElement<{ className?: string }>, {
                      className: 'h-4 w-4 text-primary',
                    })
                  : content.icon}
              </div>
            )}
            <span className="text-sm font-medium truncate">{content.title}</span>
            {content.status && (
              <Badge variant={content.status.variant} className="text-xs shrink-0">
                {content.status.label}
              </Badge>
            )}
          </div>
          {content.primaryValue && (
            <span className="text-sm font-semibold shrink-0">
              {content.primaryValue}
            </span>
          )}
        </div>
        {content.secondaryValue && (
          <div className="text-xs text-muted-foreground">
            {content.secondaryValue}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderHeroLayout = () => (
    <Card
      className={cn(
        'bg-gradient-to-br from-card to-card/50 shadow-lg border-dashed border-2 transition-all duration-300',
        style.hoverEffect !== false && 'hover:shadow-xl',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary',
        onClick && 'cursor-pointer',
        style.cardClassName,
        className,
      )}
      onClick={onClick}
    >
      <CardContent className={cn('text-center py-12 space-y-6', style.contentClassName)}>
        {content.icon && (
          <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center mx-auto border-2 border-dashed border-primary/20">
            {React.isValidElement(content.icon)
              ? React.cloneElement(content.icon as React.ReactElement<{ className?: string }>, {
                  className: 'h-12 w-12 text-primary/60',
                })
              : content.icon}
          </div>
        )}
        <div className="space-y-3">
          <CardTitle className="text-2xl font-bold">{content.title}</CardTitle>
          {content.description && (
            <CardDescription className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {content.description}
            </CardDescription>
          )}
        </div>
        {content.primaryAction && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              variant={content.primaryAction.variant}
              onClick={content.primaryAction.onClick}
              disabled={content.primaryAction.disabled || content.primaryAction.loading}
            >
              {content.primaryAction.icon && (
                <content.primaryAction.icon className="h-4 w-4 mr-2" />
              )}
              {content.primaryAction.label}
            </Button>
            {content.secondaryActions && content.secondaryActions[0] && (
              <Button
                size="lg"
                variant={content.secondaryActions[0].variant || 'outline'}
                onClick={content.secondaryActions[0].onClick}
                disabled={content.secondaryActions[0].disabled || content.secondaryActions[0].loading}
              >
                {content.secondaryActions[0].icon && (
                  React.createElement(content.secondaryActions[0].icon, { className: 'h-4 w-4 mr-2' })
                )}
                {content.secondaryActions[0].label}
              </Button>
            )}
          </div>
        )}
        {content.contentExtra}
      </CardContent>
    </Card>
  );

  const renderMiniLayout = () => (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border',
        style.hoverEffect !== false && 'hover:bg-muted/50',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary',
        onClick && 'cursor-pointer',
        style.cardClassName,
        className,
      )}
      onClick={onClick}
      onKeyDown={onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content.icon && (
        <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 shrink-0">
          {React.isValidElement(content.icon)
            ? React.cloneElement(content.icon as React.ReactElement<{ className?: string }>, {
                className: 'h-3 w-3 text-primary',
              })
            : content.icon}
        </div>
      )}
      <span className="text-xs font-medium truncate flex-1">{content.title}</span>
      {content.primaryValue && (
        <span className="text-xs font-semibold shrink-0">
          {content.primaryValue}
        </span>
      )}
      {content.status && (
        <Badge variant={content.status.variant} className="text-xs shrink-0">
          {content.status.label}
        </Badge>
      )}
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'row':
      return renderRowLayout();
    case 'compact':
      return renderCompactLayout();
    case 'hero':
      return renderHeroLayout();
    case 'mini':
      return renderMiniLayout();
    case 'detailed':
    case 'card':
    default:
      return renderCardLayout();
  }
});

BillingDisplayItem.displayName = 'BillingDisplayItem';

// Container component for multiple billing items
export function BillingDisplayContainer<T,>({
  data,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  variant = 'card',
  size = 'md',
  dataType = 'custom',
  columns = 'auto',
  gap = 'md',
  mapItem,
  emptyTitle,
  emptyDescription,
  emptyAction,
  title,
  subtitle,
  headerAction,
  containerClassName,
  itemClassName,
  onItemClick,
}: BillingDisplayContainerProps<T>) {
  // Grid configuration
  const getGridCols = () => {
    if (columns === 'auto') {
      switch (variant) {
        case 'mini':
        case 'compact':
          return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        case 'hero':
          return 'grid-cols-1';
        case 'row':
          return 'grid-cols-1';
        case 'detailed':
          return 'grid-cols-1 lg:grid-cols-2';
        default:
          return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      }
    }
    // Handle specific column counts with responsive behavior
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default:
        return `grid-cols-${columns}`;
    }
  };

  const gapConfig = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('space-y-4', containerClassName)}>
      {/* Header */}
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-medium">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}

      {/* Content with state management */}
      <CardWithStates
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={onRetry}
        loadingProps={{
          variant: 'skeleton',
          size: size === 'xl' ? 'lg' : size,
          rows: variant === 'mini' ? 1 : variant === 'compact' ? 2 : 3,
        }}
        emptyProps={{
          title: emptyTitle,
          description: emptyDescription,
          action: emptyAction,
          variant: dataType === 'subscription'
            ? 'subscriptions'
            : dataType === 'payment'
              ? 'payments'
              : dataType === 'plan'
                ? 'plans'
                : dataType === 'paymentMethod'
                  ? 'methods'
                  : dataType === 'bill'
                    ? 'general'
                    : 'general',
          size: size === 'xl' ? 'lg' : size,
          style: 'dashed',
        }}
        errorProps={{
          variant: 'card',
          severity: 'error',
        }}
      >
        {(items: T[]) => (
          <div className={cn(
            variant === 'row' ? 'space-y-2' : `grid ${getGridCols()} ${gapConfig[gap]}`,
          )}
          >
            {items.map((item, itemIndex) => {
              const content = mapItem(item, itemIndex);
              const itemKey = ('id' in content && typeof content.id === 'string' ? content.id : null) || content.title || `billing-item-${itemIndex}`;
              return (
                <BillingDisplayItem
                  key={itemKey}
                  variant={variant}
                  size={size}
                  dataType={dataType}
                  content={content}
                  className={itemClassName}
                  onClick={onItemClick ? () => onItemClick(item, itemIndex) : undefined}
                />
              );
            })}
          </div>
        )}
      </CardWithStates>
    </div>
  );
}

BillingDisplayContainer.displayName = 'BillingDisplayContainer';
