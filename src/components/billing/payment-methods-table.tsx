'use client';

import {
  EllipsisVerticalIcon,
  PlusIcon,
  Shield,
  Trash2,
} from 'lucide-react';
import { memo } from 'react';

import type { BillingTableColumn, BillingTableFilter, BillingTableTab } from '@/components/billing/billing-data-table';
import { BillingDataTable } from '@/components/billing/billing-data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContractStatusBadge, DefaultBadge } from '@/components/ui/status-badge';

type PaymentMethod = {
  id: string;
  contractDisplayName: string;
  contractMobile: string | null;
  contractStatus: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

type PaymentMethodsTableProps = {
  paymentMethods: PaymentMethod[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onTabChange?: (tab: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  selectedItems?: string[];
};

// Define table structure using the reusable BillingDataTable
// Default values to prevent React unstable prop warnings
const defaultSelectedItems: string[] = [];

export const PaymentMethodsTable = memo(({
  paymentMethods,
  onSelectionChange,
  onTabChange,
  onFilterChange,
  selectedItems = defaultSelectedItems,
}: PaymentMethodsTableProps) => {
  // Define columns for payment methods table
  const columns: BillingTableColumn<PaymentMethod>[] = [
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      className: 'font-medium',
      render: (_, method) => (
        <>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>{method.contractDisplayName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Direct Debit Contract
          </div>
        </>
      ),
    },
    {
      key: 'contractMobile',
      title: 'Mobile',
      render: value => (
        <span className="text-sm">
          {(value as string) || '—'}
        </span>
      ),
    },
    {
      key: 'contractStatus',
      title: 'Status',
      render: value => <ContractStatusBadge status={value as string} />,
    },
    {
      key: 'isPrimary',
      title: 'Default',
      render: value => <DefaultBadge isPrimary={value as boolean} />,
    },
    {
      key: 'lastUsedAt',
      title: 'Last Used',
      render: value => (
        <span className="text-sm">
          {value
            ? new Date(value as string).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (_, method) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Open payment method actions"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Contract</DropdownMenuItem>
            {!method.isPrimary && (
              <DropdownMenuItem>Set as Default</DropdownMenuItem>
            )}
            <DropdownMenuItem>Manage Permissions</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Method
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Define tabs
  const tabs: BillingTableTab[] = [
    { value: 'all', label: 'All Methods' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'add-method', label: '', count: undefined }, // Special tab for add button
  ];

  // Define filters
  const filters: BillingTableFilter[] = [
    {
      key: 'status',
      label: 'Status',
      placeholder: 'Select status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'signed', label: 'Signed' },
        { value: 'pending', label: 'Pending' },
        { value: 'expired', label: 'Expired' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'type',
      label: 'Type',
      placeholder: 'Select type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
      ],
      defaultValue: 'all',
    },
  ];

  return (
    <>
      {/* Custom tab content for the add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Method
          </Button>
        </div>
      </div>

      <BillingDataTable
        data={paymentMethods}
        columns={columns}
        selectable
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
        tabs={tabs.slice(0, 3)} // Exclude the add-method tab from the reusable component
        onTabChange={onTabChange}
        filters={filters}
        onFilterChange={onFilterChange}
        emptyStateTitle="No Payment Methods"
        emptyStateDescription="You haven't added any payment methods yet. Add one to get started."
        emptyStateAction={(
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        )}
      />
    </>
  );
});
