'use client';

import { memo } from 'react';

import { EmptyCard, LoadingCard } from '@/components/dashboard/dashboard-cards';
import { StaggerContainer, StaggerItem } from '@/components/ui/motion';

type BillingCardContainerProps<T> = {
  items: T[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  loadingCardCount?: number;
  children: (item: T, index: number) => React.ReactNode;
};

function BillingCardContainerImpl<T>({
  items,
  isLoading = false,
  emptyStateTitle,
  emptyStateDescription,
  className,
  loadingCardCount = 3,
  children,
}: BillingCardContainerProps<T>) {
  // Loading state
  if (isLoading) {
    return (
      <StaggerContainer className={className}>
        {Array.from({ length: loadingCardCount }, (_, index) => (
          <StaggerItem key={`loading-card-${index}`} delay={index * 0.1}>
            <LoadingCard />
          </StaggerItem>
        ))}
      </StaggerContainer>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <EmptyCard
        title={emptyStateTitle || 'No items found'}
        description={emptyStateDescription || 'There are no items to display at this time.'}
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
