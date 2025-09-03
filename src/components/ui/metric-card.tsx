'use client';

import { type LucideIcon } from 'lucide-react';
import { memo } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    icon?: LucideIcon;
  };
  badge?: {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    label: string;
  };
  className?: string;
  footer?: string;
}

export const MetricCard = memo(({
  title,
  value,
  description,
  icon: Icon,
  trend,
  badge,
  className,
  footer,
}: MetricCardProps) => {
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn('h-full flex flex-col', className)} data-slot="card">
      <CardHeader className="pb-3">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
          {value}
        </CardTitle>
        {badge && (
          <CardAction>
            <Badge variant={badge.variant || 'outline'}>
              {trend?.icon && <trend.icon className="h-3 w-3" />}
              {badge.label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(footer || trend || description) && (
        <CardFooter className="flex-col items-start gap-2 text-sm pt-0 mt-auto">
          {trend && (
            <div className={cn('flex items-center gap-1 font-medium', getTrendColor(trend.direction))}>
              {trend.icon && <trend.icon className="h-3 w-3" />}
              <span className="line-clamp-1">{trend.value}</span>
            </div>
          )}
          {footer && (
            <div className="text-muted-foreground line-clamp-2">
              {footer}
            </div>
          )}
          {description && !footer && (
            <div className="text-muted-foreground line-clamp-2">
              {description}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';