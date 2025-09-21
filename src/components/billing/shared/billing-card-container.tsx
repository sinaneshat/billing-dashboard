'use client';

import { useTranslations } from 'next-intl';
import { memo } from 'react';

import { EmptyState, LoadingState } from '@/components/dashboard/dashboard-states';
import { StaggerContainer, StaggerItem } from '@/components/ui/motion';

type BillingCardContainerProps<T> = {
  items: T[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  children: (item: T, index: number) => React.ReactNode;
};

function BillingCardContainerImpl<T>({
  items,
  isLoading = false,
  emptyStateTitle,
  emptyStateDescription,
  className,
  children,
}: BillingCardContainerProps<T>) {
  const t = useTranslations();
  // Loading state
  if (isLoading) {
    return (
      <LoadingState
        variant="card"
        style="dashed"
        size="lg"
        className={className}
      />
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyStateTitle || t('states.empty.noItemsFound')}
        description={emptyStateDescription || t('states.empty.noItemsDescription')}
        variant="general"
        size="lg"
        style="dashed"
        className={className}
      />
    );
  }

  // Items grid
  return (
    <StaggerContainer className={className}>
      {items.map((item, index) => {
        // Try to use item.id if available, otherwise fallback to index
        const key = (item as { id?: string })?.id || `item-${index}`;
        return (
          <StaggerItem key={key} delay={index * 0.1}>
            {children(item, index)}
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

export const BillingCardContainer = memo(BillingCardContainerImpl) as typeof BillingCardContainerImpl;
