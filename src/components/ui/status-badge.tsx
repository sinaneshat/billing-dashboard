'use client'

import * as React from 'react'
import { CheckCircle, Clock, AlertCircle, X, Shield, User } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib'

/**
 * Enhanced Status Badge System following Shadcn/UI v4 patterns
 * 
 * Features:
 * - Official badge variants with proper data-slot attributes
 * - Semantic status mapping for different contexts
 * - Consistent iconography and color schemes
 * - Accessibility attributes and proper ARIA labels
 * - Animation support with smooth transitions
 * - Type-safe status configuration
 * - Backward compatibility with existing usage
 * 
 * @example
 * // Basic usage
 * <StatusBadge status="active" type="subscription" />
 * 
 * // Custom styling
 * <StatusBadge status="pending" type="payment" className="animate-pulse" />
 * 
 * // Specialized variants
 * <SubscriptionStatusBadge status="active" />
 * <PaymentStatusBadge status="completed" />
 * <ContractStatusBadge status="signed" />
 */

// Enhanced status configuration with semantic colors
const statusVariants = cva(
  "inline-flex items-center justify-center gap-1 transition-all duration-200",
  {
    variants: {
      status: {
        // Success states
        active: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
        completed: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
        signed: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
        success: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800",
        
        // Warning states
        pending: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800 animate-pulse",
        processing: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 dark:text-primary dark:border-primary/20",
        
        // Error states
        failed: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
        canceled: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
        expired: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
        rejected: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
        
        // Neutral states
        inactive: "bg-muted text-muted-foreground border-border hover:bg-muted",
        draft: "bg-muted text-muted-foreground border-border hover:bg-muted",
        
        // Special states
        primary: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10",
      },
      size: {
        sm: "text-xs px-2 py-0.5 rounded-md",
        md: "text-sm px-2.5 py-0.5 rounded-md",
        lg: "text-sm px-3 py-1 rounded-lg",
      }
    },
    defaultVariants: {
      status: "inactive",
      size: "sm",
    }
  }
)

// Icon mapping for different status types
const statusIcons = {
  // Success icons
  active: CheckCircle,
  completed: CheckCircle,
  signed: Shield,
  success: CheckCircle,
  
  // Warning icons
  pending: Clock,
  processing: Clock,
  
  // Error icons
  failed: X,
  canceled: X,
  expired: X,
  rejected: X,
  
  // Neutral icons
  inactive: AlertCircle,
  draft: AlertCircle,
  
  // Special icons
  primary: CheckCircle,
} as const

// Translation key mapping for context-aware labels
const statusLabelKeys = {
  subscription: {
    active: 'status.subscription.active',
    canceled: 'status.subscription.canceled',
    expired: 'status.subscription.expired',
    pending: 'status.subscription.pending',
    inactive: 'status.subscription.inactive',
  },
  payment: {
    completed: 'status.payment.completed',
    failed: 'status.payment.failed',
    pending: 'status.payment.pending',
    processing: 'status.payment.processing',
    canceled: 'status.payment.canceled',
  },
  contract: {
    signed: 'status.contract.signed',
    pending: 'status.contract.pending',
    expired: 'status.contract.expired',
    rejected: 'status.contract.rejected',
    draft: 'status.contract.draft',
  },
  default: {
    primary: 'status.default.primary',
    active: 'status.default.active',
    inactive: 'status.default.inactive',
  },
} as const

const statusBadgePropsSchema = z.object({
  /** Status value to display - accepts any string for backend flexibility */
  status: z.string(),
  /** Context type for semantic labeling */
  type: z.enum(['subscription', 'payment', 'contract', 'default']).optional(),
  /** Size variant */
  size: z.enum(['sm', 'md', 'lg']).optional(),
  /** Show status icon */
  showIcon: z.boolean().optional(),
  /** Icon size override */
  iconSize: z.enum(['sm', 'md', 'lg']).optional(),
  /** Pulse animation for pending states */
  pulse: z.boolean().optional(),
});

export type StatusBadgeProps = z.infer<typeof statusBadgePropsSchema> & 
  Omit<React.HTMLAttributes<HTMLSpanElement>, 'variant' | keyof z.infer<typeof statusBadgePropsSchema>> & {
  /** Custom icon component */
  icon?: React.ComponentType<{ className?: string }>
};

/**
 * Enhanced StatusBadge component following Shadcn/UI v4 patterns
 * with semantic status mapping and proper accessibility
 */
export function StatusBadge({
  status,
  type = 'default',
  showIcon = true,
  iconSize = 'sm',
  icon,
  pulse = false,
  size = 'sm',
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const t = useTranslations()
  const normalizedStatus = status.toLowerCase() as keyof typeof statusIcons
  const IconComponent = icon || statusIcons[normalizedStatus] || AlertCircle
  
  // Get translation key and translate it
  const translationKey = statusLabelKeys[type]?.[normalizedStatus as keyof typeof statusLabelKeys[typeof type]]
  const statusLabel = children || 
    (translationKey ? t(translationKey as any) : undefined) ||
    status.charAt(0).toUpperCase() + status.slice(1)
  
  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-4 w-4',
  }[iconSize]
  
  const shouldPulse = pulse || normalizedStatus === 'pending' || normalizedStatus === 'processing'

  return (
    <Badge
      variant="outline"
      data-slot="status-badge"
      data-status={normalizedStatus}
      data-type={type}
      className={cn(
        statusVariants({ status: normalizedStatus, size }),
        shouldPulse && "animate-pulse",
        className
      )}
      role="status"
      aria-label={`Status: ${statusLabel}`}
      {...props}
    >
      {showIcon && (
        <IconComponent 
          className={cn(iconSizeClass, "shrink-0")} 
          aria-hidden="true" 
        />
      )}
      <span className="font-medium leading-none">
        {statusLabel}
      </span>
    </Badge>
  )
}

// Specialized status badge components with proper typing
export function SubscriptionStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type'>) {
  return (
    <StatusBadge 
      status={status} 
      type="subscription" 
      {...props} 
    />
  )
}

export function PaymentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type'>) {
  return (
    <StatusBadge 
      status={status} 
      type="payment" 
      {...props} 
    />
  )
}

export function ContractStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'type'>) {
  return (
    <StatusBadge 
      status={status} 
      type="contract" 
      {...props} 
    />
  )
}

// Enhanced default badge with proper primary state handling
export function DefaultBadge({ 
  isPrimary, 
  children,
  className,
  ...props 
}: { 
  isPrimary?: boolean 
} & Omit<StatusBadgeProps, 'status' | 'type'>) {
  const t = useTranslations()
  
  if (isPrimary) {
    return (
      <StatusBadge 
        status="primary" 
        type="default" 
        icon={CheckCircle}
        className={cn("bg-primary/10 text-primary border-primary/20", className)}
        {...props}
      >
        {children || t('billing.default')}
      </StatusBadge>
    )
  }
  
  return (
    <span 
      className="text-sm text-muted-foreground" 
      aria-label={t('accessibility.notSetAsDefault')}
    >
      —
    </span>
  )
}

// Additional utility badges for common use cases
export function PriorityBadge({ 
  priority, 
  ...props 
}: { 
  priority: 'low' | 'medium' | 'high' | 'critical' 
} & Omit<StatusBadgeProps, 'status' | 'type'>) {
  const t = useTranslations()
  const priorityConfig = {
    low: { status: 'inactive' as const, className: "bg-muted text-muted-foreground" },
    medium: { status: 'pending' as const, className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400" },
    high: { status: 'processing' as const, className: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400" },
    critical: { status: 'failed' as const, className: "bg-destructive/10 text-destructive" },
  }
  
  const config = priorityConfig[priority]
  
  return (
    <StatusBadge
      status={config.status}
      className={cn(config.className, props.className)}
      {...props}
    >
      {t(`priority.${priority}`, { default: priority.charAt(0).toUpperCase() + priority.slice(1) })}
    </StatusBadge>
  )
}

export function UserRoleBadge({ 
  role,
  ...props 
}: { 
  role: 'admin' | 'user' | 'guest' | 'moderator'
} & Omit<StatusBadgeProps, 'status' | 'type'>) {
  const t = useTranslations()
  const roleConfig = {
    admin: { status: 'primary' as const, icon: Shield },
    moderator: { status: 'active' as const, icon: User },
    user: { status: 'inactive' as const, icon: User },
    guest: { status: 'draft' as const, icon: User },
  }
  
  const config = roleConfig[role]
  
  return (
    <StatusBadge
      status={config.status}
      icon={config.icon}
      {...props}
    >
      {t(`roles.${role}`, { default: role.charAt(0).toUpperCase() + role.slice(1) })}
    </StatusBadge>
  )
}

// Export variants for external usage
export { statusVariants, type StatusBadgeProps as StatusBadgeVariants }