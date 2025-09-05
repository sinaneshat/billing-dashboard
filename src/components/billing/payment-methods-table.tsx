'use client';

import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  Shield,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
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
import { createLocaleFormatters } from '@/lib/i18n/locale-formatters';

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
  isLoading?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  onTabChange?: (tab: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  selectedItems?: Record<string, boolean>;
};

// Default values to prevent React unstable prop warnings
const defaultSelectedItems: Record<string, boolean> = {};

export const PaymentMethodsTable = memo(({
  paymentMethods,
  isLoading = false,
  onSelectionChange,
  onTabChange,
  onFilterChange,
  selectedItems = defaultSelectedItems,
}: PaymentMethodsTableProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const formatters = createLocaleFormatters(locale);

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
      header: t('paymentMethods.table.paymentMethod'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{row.original.contractDisplayName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {t('paymentMethods.table.directDebitContract')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contractMobile',
      header: t('paymentMethods.table.mobile'),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.contractMobile || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contractStatus',
      header: t('status.status'),
      cell: ({ row }) => (
        <ContractStatusBadge
          status={row.original.contractStatus}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'isPrimary',
      header: t('paymentMethods.defaultMethod'),
      cell: ({ row }) => (
        <DefaultBadge isPrimary={row.original.isPrimary} />
      ),
    },
    {
      accessorKey: 'lastUsedAt',
      header: createSortableHeader(t('paymentMethods.table.lastUsed')),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.lastUsedAt
            ? formatters.date(row.original.lastUsedAt, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : t('paymentMethods.table.never')}
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
              aria-label={t('paymentMethods.table.actions.openActions')}
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{t('paymentMethods.table.actions.viewContract')}</DropdownMenuItem>
            {!row.original.isPrimary && (
              <DropdownMenuItem>{t('paymentMethods.table.actions.setAsDefault')}</DropdownMenuItem>
            )}
            <DropdownMenuItem>{t('paymentMethods.table.actions.managePermissions')}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Trash2 className="h-4 w-4 me-2" />
              {t('paymentMethods.table.actions.removeMethod')}
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
    'loading': isLoading,
    'enableSelection': true,
    'rowSelection': selectedItems,
    'onRowSelectionChange': handleSelectionChange,
    'getRowId': row => row.id,

    // Tabs configuration
    'tabs': [
      { value: 'all', label: t('paymentMethods.table.tabs.allMethods'), count: paymentMethods.length },
      {
        value: 'active',
        label: t('paymentMethods.table.tabs.active'),
        count: paymentMethods.filter(m => m.isActive).length,
      },
      {
        value: 'inactive',
        label: t('paymentMethods.table.tabs.inactive'),
        count: paymentMethods.filter(m => !m.isActive).length,
      },
    ],
    onTabChange,

    // Advanced filters
    'filters': [
      {
        key: 'status',
        label: t('status.status'),
        placeholder: t('paymentMethods.table.filters.selectStatus'),
        options: [
          { value: 'all', label: t('paymentMethods.table.filters.allStatus') },
          { value: 'signed', label: t('paymentMethods.table.filters.signed') },
          { value: 'pending', label: t('status.pending') },
          { value: 'expired', label: t('status.expired') },
        ],
        defaultValue: 'all',
      },
      {
        key: 'type',
        label: t('forms.type'),
        placeholder: t('paymentMethods.table.filters.selectStatus'),
        options: [
          { value: 'all', label: t('paymentMethods.table.filters.allTypes') },
          { value: 'primary', label: t('paymentMethods.primary') },
          { value: 'secondary', label: t('paymentMethods.table.filters.secondary') },
        ],
        defaultValue: 'all',
      },
    ],
    onFilterChange,

    // Search functionality
    'searchKey': 'contractDisplayName',
    'searchPlaceholder': t('paymentMethods.table.searchPlaceholder'),

    // Pagination
    'enablePagination': true,
    'pageSize': 10,

    // Empty state
    'emptyStateTitle': t('paymentMethods.table.emptyStateTitle'),
    'emptyStateDescription': t('paymentMethods.table.emptyStateDescription'),
    'emptyStateAction': (
      <Button>
        <PlusIcon className="h-4 w-4 me-2" />
        {t('paymentMethods.addPaymentMethod')}
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
          <h2 className="text-2xl font-semibold">{t('paymentMethods.title')}</h2>
          <p className="text-muted-foreground">
            {t('paymentMethods.subtitle')}
          </p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 me-2" />
          {t('paymentMethods.table.addMethod')}
        </Button>
      </FadeIn>

      {/* Enhanced Data Table */}
      <DataTable {...dataTableProps} />
    </div>
  );
});

PaymentMethodsTable.displayName = 'PaymentMethodsTable';
