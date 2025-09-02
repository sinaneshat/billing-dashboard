'use client';

import * as React from 'react';
import { CheckCircle, Clock, AlertCircle, X, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/tailwind-utils';

// Status mapping configurations
const statusConfigs = {
  subscription: {
    active: {
      icon: CheckCircle,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100',
    },
    canceled: {
      icon: X,
      variant: 'destructive' as const,
      className: '',
    },
    expired: {
      icon: X,
      variant: 'destructive' as const,
      className: '',
    },
    pending: {
      icon: Clock,
      variant: 'secondary' as const,
      className: 'border-orange-500 bg-transparent text-orange-500 hover:bg-orange-50 dark:border-orange-500 dark:bg-transparent dark:text-orange-500',
    },
  },
  payment: {
    completed: {
      icon: CheckCircle,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100',
    },
    failed: {
      icon: X,
      variant: 'destructive' as const,
      className: '',
    },
    pending: {
      icon: Clock,
      variant: 'secondary' as const,
      className: 'border-orange-500 bg-transparent text-orange-500 hover:bg-orange-50 dark:border-orange-500 dark:bg-transparent dark:text-orange-500',
    },
  },
  contract: {
    signed: {
      icon: Shield,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100',
    },
    pending: {
      icon: Clock,
      variant: 'secondary' as const,
      className: 'border-orange-500 bg-transparent text-orange-500 hover:bg-orange-50 dark:border-orange-500 dark:bg-transparent dark:text-orange-500',
    },
    expired: {
      icon: X,
      variant: 'destructive' as const,
      className: '',
    },
  },
  default: {
    primary: {
      icon: CheckCircle,
      variant: 'outline' as const,
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    },
  },
} as const;

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'variant'> {
  status: string;
  type?: keyof typeof statusConfigs;
  showIcon?: boolean;
  iconSize?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  type = 'subscription',
  showIcon = true,
  iconSize = 'sm',
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfigs[type]?.[normalizedStatus as keyof typeof statusConfigs[typeof type]] || {
    icon: AlertCircle,
    variant: 'secondary' as const,
    className: '',
  };

  const { icon: Icon, variant, className: statusClassName } = config;
  const iconSizeClass = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge
      variant={variant}
      className={cn(statusClassName, className)}
      {...props}
    >
      {showIcon && React.createElement(Icon, { className: cn(iconSizeClass, 'mr-1') })}
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Specialized status badge components
export function SubscriptionStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="subscription" {...props} />;
}

export function PaymentStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="payment" {...props} />;
}

export function ContractStatusBadge({ status, ...props }: Omit<StatusBadgeProps, 'type'>) {
  return <StatusBadge status={status} type="contract" {...props} />;
}

export function DefaultBadge({ isPrimary, children, ...props }: { isPrimary?: boolean } & Omit<StatusBadgeProps, 'status' | 'type'>) {
  if (isPrimary) {
    return (
      <StatusBadge status="primary" type="default" {...props}>
        <CheckCircle className="h-3 w-3 mr-1" />
        {children || 'Default'}
      </StatusBadge>
    );
  }
  return <span className="text-sm text-muted-foreground">—</span>;
}