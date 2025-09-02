'use client';

import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  Shield,
  Trash2,
} from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import type { DataTableProps } from '@/components/ui/data-table';
import { createSortableHeader, DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn } from '@/components/ui/motion';
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
  loading?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onTabChange?: (tab: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  selectedItems?: Record<string, boolean>;
};

// Default values to prevent React unstable prop warnings
const defaultSelectedItems: Record<string, boolean> = {};

export const PaymentMethodsTable = memo(({
  paymentMethods,
  loading = false,
  onSelectionChange,
  onTabChange,
  onFilterChange,
  selectedItems = defaultSelectedItems,
}: PaymentMethodsTableProps) => {
  // Convert selection format for new DataTable
  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updaterOrValue) => {
    const newSelection = typeof updaterOrValue === 'function'
      ? updaterOrValue(selectedItems)
      : updaterOrValue;
    onSelectionChange?.(Object.keys(newSelection));
  };

  // Define columns using TanStack React Table format
  const columns: ColumnDef<PaymentMethod>[] = [
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{row.original.contractDisplayName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Direct Debit Contract
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contractMobile',
      header: 'Mobile',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.contractMobile || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contractStatus',
      header: 'Status',
      cell: ({ row }) => (
        <ContractStatusBadge
          status={row.original.contractStatus}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'isPrimary',
      header: 'Default',
      cell: ({ row }) => (
        <DefaultBadge isPrimary={row.original.isPrimary} />
      ),
    },
    {
      accessorKey: 'lastUsedAt',
      header: createSortableHeader('Last Used'),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.lastUsedAt
            ? new Date(row.original.lastUsedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
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
            {!row.original.isPrimary && (
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
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Enhanced DataTable configuration
  const dataTableProps: DataTableProps<PaymentMethod> = {
    columns,
    'data': paymentMethods,
    loading,
    'enableSelection': true,
    'rowSelection': selectedItems,
    'onRowSelectionChange': handleSelectionChange,
    'getRowId': row => row.id,

    // Tabs configuration
    'tabs': [
      { value: 'all', label: 'All Methods', count: paymentMethods.length },
      {
        value: 'active',
        label: 'Active',
        count: paymentMethods.filter(m => m.isActive).length,
      },
      {
        value: 'inactive',
        label: 'Inactive',
        count: paymentMethods.filter(m => !m.isActive).length,
      },
    ],
    onTabChange,

    // Advanced filters
    'filters': [
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
    ],
    onFilterChange,

    // Search functionality
    'searchKey': 'contractDisplayName',
    'searchPlaceholder': 'Search payment methods...',

    // Pagination
    'enablePagination': true,
    'pageSize': 10,

    // Empty state
    'emptyStateTitle': 'No Payment Methods',
    'emptyStateDescription': 'You haven\'t added any payment methods yet. Add one to get started.',
    'emptyStateAction': (
      <Button>
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Payment Method
      </Button>
    ),

    // Styling
    'className': 'w-full',
    'aria-label': 'Payment methods table',
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <FadeIn className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Payment Methods</h2>
          <p className="text-muted-foreground">
            Manage your payment methods and direct debit contracts.
          </p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Method
        </Button>
      </FadeIn>

      {/* Enhanced Data Table */}
      <DataTable {...dataTableProps} />
    </div>
  );
});

PaymentMethodsTable.displayName = 'PaymentMethodsTable';
