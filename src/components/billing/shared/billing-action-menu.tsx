'use client';

import type { LucideIcon } from 'lucide-react';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type BillingActionItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

export type BillingActionGroup = {
  items: BillingActionItem[];
  separator?: boolean;
};

type BillingActionMenuProps = {
  actions: (BillingActionItem | BillingActionGroup)[];
  triggerLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
};

export const BillingActionMenu = memo(({
  actions,
  triggerLabel,
  disabled = false,
  size = 'sm',
  variant = 'ghost',
}: BillingActionMenuProps) => {
  const t = useTranslations();
  const label = triggerLabel || t('actions.more');
  const renderActionItem = (action: BillingActionItem) => {
    const Icon = action.icon;

    return (
      <DropdownMenuItem
        key={action.id}
        onClick={action.onClick}
        disabled={action.disabled}
        className={action.variant === 'destructive'
          ? 'text-destructive focus:text-destructive focus:bg-destructive/10'
          : undefined}
      >
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {action.label}
      </DropdownMenuItem>
    );
  };

  const renderActions = () => {
    return actions.map((actionOrGroup, index) => {
      // Check if it's a group
      if ('items' in actionOrGroup) {
        const group = actionOrGroup;
        const groupKey = `group-${group.items.map(item => item.id).join('-')}`;
        return (
          <div key={groupKey}>
            {group.items.map(renderActionItem)}
            {group.separator && index < actions.length - 1 && <DropdownMenuSeparator />}
          </div>
        );
      }

      // Single action
      return renderActionItem(actionOrGroup);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          aria-label={label}
        >
          <EllipsisVerticalIcon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {renderActions()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

BillingActionMenu.displayName = 'BillingActionMenu';
