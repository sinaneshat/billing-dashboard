'use client';

import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { memo } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FadeIn } from '@/components/ui/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

type UpcomingBill = {
  id: string;
  productName: string;
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'processing';
  subscriptionId: string;
};

type UpcomingBillsProps = {
  bills: UpcomingBill[];
  loading?: boolean;
  className?: string;
};

function UpcomingBillSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
    </div>
  );
}

function getBillStatusInfo(status: string, dueDate: string) {
  const due = new Date(dueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  switch (status) {
    case 'overdue':
      return {
        badge: { variant: 'destructive' as const, label: 'Overdue' },
        icon: AlertTriangle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/30',
      };
    case 'processing':
      return {
        badge: { variant: 'secondary' as const, label: 'Processing' },
        icon: Clock,
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
      };
    default:
      if (daysUntilDue <= 3) {
        return {
          badge: { variant: 'outline' as const, label: 'Due Soon' },
          icon: Calendar,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/30',
        };
      }
      return {
        badge: { variant: 'outline' as const, label: 'Scheduled' },
        icon: Calendar,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      };
  }
}

export const UpcomingBills = memo(({
  bills,
  loading = false,
  className,
}: UpcomingBillsProps) => {
  if (loading) {
    return (
      <FadeIn className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
            <CardDescription>Your scheduled payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <UpcomingBillSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  if (bills.length === 0) {
    return (
      <FadeIn className={className}>
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
            <CardDescription>Your scheduled payments</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-muted-foreground">No upcoming bills</p>
              <p className="text-sm text-muted-foreground mt-1">
                All payments are up to date
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Upcoming Bills</CardTitle>
          <CardDescription>Your scheduled payments</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-3">
            {bills.map((bill) => {
              const statusInfo = getBillStatusInfo(bill.status, bill.dueDate);
              const dueDate = new Date(bill.dueDate);
              const isToday = dueDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors min-h-[4rem]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${statusInfo.bgColor} shrink-0`}>
                      <statusInfo.icon className={`h-4 w-4 ${statusInfo.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm line-clamp-1">{bill.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        Due
                        {' '}
                        {isToday
                          ? 'today'
                          : dueDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: dueDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                            })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-semibold text-sm whitespace-nowrap">{formatTomanCurrency(bill.amount)}</p>
                    <Badge variant={statusInfo.badge.variant} className="text-xs">
                      {statusInfo.badge.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
});

UpcomingBills.displayName = 'UpcomingBills';
