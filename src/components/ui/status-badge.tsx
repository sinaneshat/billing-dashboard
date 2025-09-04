'use client'

import * as React from 'react'
import { CheckCircle, Clock, AlertCircle, X, Shield, User } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { z } from 'zod'

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
        active: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        completed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        signed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        success: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        
        // Warning states
        pending: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse",
        processing: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        
        // Error states
        failed: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        canceled: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        expired: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        rejected: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        
        // Neutral states
        inactive: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
        draft: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
        
        // Special states
        primary: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
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

// Status type mapping for context-aware labels
const statusLabels = {
  subscription: {
    active: "Active Subscription",
    canceled: "Canceled Subscription",
    expired: "Expired Subscription",
    pending: "Pending Subscription",
    inactive: "Inactive Subscription",
  },
  payment: {
    completed: "Payment Completed",
    failed: "Payment Failed",
    pending: "Payment Pending",
    processing: "Payment Processing",
    canceled: "Payment Canceled",
  },
  contract: {
    signed: "Contract Signed",
    pending: "Contract Pending",
    expired: "Contract Expired",
    rejected: "Contract Rejected",
    draft: "Contract Draft",
  },
  default: {
    primary: "Primary",
    active: "Active",
    inactive: "Inactive",
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
  const normalizedStatus = status.toLowerCase() as keyof typeof statusIcons
  const IconComponent = icon || statusIcons[normalizedStatus] || AlertCircle
  const statusLabel = statusLabels[type]?.[normalizedStatus as keyof typeof statusLabels[typeof type]] 
    || children 
    || status.charAt(0).toUpperCase() + status.slice(1)
  
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
  if (isPrimary) {
    return (
      <StatusBadge 
        status="primary" 
        type="default" 
        icon={CheckCircle}
        className={cn("bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400", className)}
        {...props}
      >
        {children || 'Default'}
      </StatusBadge>
    )
  }
  
  return (
    <span 
      className="text-sm text-muted-foreground" 
      aria-label="Not set as default"
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
  const priorityConfig = {
    low: { status: 'inactive' as const, className: "bg-gray-100 text-gray-600" },
    medium: { status: 'pending' as const, className: "bg-yellow-100 text-yellow-700" },
    high: { status: 'processing' as const, className: "bg-orange-100 text-orange-700" },
    critical: { status: 'failed' as const, className: "bg-red-100 text-red-700" },
  }
  
  const config = priorityConfig[priority]
  
  return (
    <StatusBadge
      status={config.status}
      className={cn(config.className, props.className)}
      {...props}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </StatusBadge>
  )
}

export function UserRoleBadge({ 
  role,
  ...props 
}: { 
  role: 'admin' | 'user' | 'guest' | 'moderator'
} & Omit<StatusBadgeProps, 'status' | 'type'>) {
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
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </StatusBadge>
  )
}

// Export variants for external usage
export { statusVariants, type StatusBadgeProps as StatusBadgeVariants }