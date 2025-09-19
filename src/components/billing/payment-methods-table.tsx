'use client';

import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import {
  AlertTriangle,
  EllipsisVerticalIcon,
  PlusIcon,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useCallback } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ContractStatusBadge, DefaultBadge } from '@/components/ui/status-badge';
import { useDeletePaymentMethodMutation, useSetDefaultPaymentMethodMutation } from '@/hooks/mutations/payment-methods';
import { createLocaleFormatters } from '@/lib/i18n/locale-formatters';
import { toastManager } from '@/lib/toast/toast-manager';

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
  onViewContract?: (paymentMethodId: string) => void;
  onManagePermissions?: (paymentMethodId: string) => void;
  error?: Error | null;
  retryFn?: () => void;
  enableBulkActions?: boolean;
  compactView?: boolean;
  showQuickActions?: boolean;
};

// Default values to prevent React unstable prop warnings
const defaultSelectedItems: Record<string, boolean> = {};

// Enhanced loading skeleton for payment methods table
function PaymentMethodsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table header skeleton */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>

        {/* Table rows skeleton */}
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              {' '}
              {/* Checkbox */}
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Error state component for payment methods
function PaymentMethodsErrorState({ error, retryFn, t }: {
  error: Error;
  retryFn?: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{t('paymentMethods.title')}</h2>
          <p className="text-muted-foreground">{t('paymentMethods.subtitle')}</p>
        </div>
      </div>

      <Alert variant="destructive" className="max-w-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <div>
            <p className="font-medium">{t('paymentMethods.loadError')}</p>
            <p className="text-sm">{error.message}</p>
          </div>
          {retryFn && (
            <Button variant="outline" size="sm" onClick={retryFn}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('actions.tryAgain')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Quick actions component for selected payment methods
function BulkActionsBar({
  selectedCount,
  onBulkDelete,
  onBulkSetDefault,
  onClearSelection,
  t,
}: {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkSetDefault: () => void;
  onClearSelection: () => void;
  t: (key: string) => string;
}) {
  if (selectedCount === 0)
    return null;

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t('paymentMethods.selectedCount').replace('{count}', selectedCount.toString())}
        </span>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          {t('actions.clearSelection')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBulkSetDefault}>
          <Shield className="h-4 w-4 mr-2" />
          {t('paymentMethods.setAsDefault')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onBulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t('actions.delete')}
        </Button>
      </div>
    </div>
  );
}

export const PaymentMethodsTable = memo(({
  paymentMethods,
  isLoading = false,
  onSelectionChange,
  onTabChange,
  onFilterChange,
  selectedItems = defaultSelectedItems,
  onViewContract,
  onManagePermissions,
  error,
  retryFn,
  enableBulkActions = true,
  compactView: _compactView = false,
  showQuickActions = true,
}: PaymentMethodsTableProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const formatters = createLocaleFormatters(locale);

  // Mutations for payment method actions
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();
  const setDefaultPaymentMethodMutation = useSetDefaultPaymentMethodMutation();

  // Handler functions for dropdown actions
  const handleViewContract = (paymentMethodId: string) => {
    if (onViewContract) {
      onViewContract(paymentMethodId);
    } else {
      // Default implementation - could navigate to contract view
      toastManager.success(t('paymentMethods.table.actions.viewContract'));
    }
  };

  const handleSetAsDefault = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethodMutation.mutateAsync({ param: { id: paymentMethodId } });
      toastManager.success(t('paymentMethods.successMessages.defaultPaymentMethodUpdated'));
    } catch {
      toastManager.error(t('paymentMethods.errorMessages.failedToUpdateDefault'));
    }
  };

  const handleManagePermissions = (paymentMethodId: string) => {
    if (onManagePermissions) {
      onManagePermissions(paymentMethodId);
    } else {
      // Default implementation - could open permissions modal
      toastManager.success(t('paymentMethods.table.actions.managePermissions'));
    }
  };

  const handleRemoveMethod = async (paymentMethodId: string) => {
    try {
      await deletePaymentMethodMutation.mutateAsync({ param: { id: paymentMethodId } });
      toastManager.success(t('paymentMethods.successMessages.paymentMethodRemoved'));
    } catch {
      toastManager.error(t('paymentMethods.errorMessages.failedToRemove'));
    }
  };

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedIds.length === 0)
      return;

    try {
      await Promise.all(
        selectedIds.map(id => deletePaymentMethodMutation.mutateAsync({ param: { id } })),
      );
      toastManager.success(t('paymentMethods.bulkDeleteSuccess', { count: selectedIds.length }));
      onSelectionChange?.([]);
    } catch {
      toastManager.error(t('paymentMethods.bulkDeleteError'));
    }
  }, [selectedItems, deletePaymentMethodMutation, onSelectionChange, t]);

  const handleBulkSetDefault = useCallback(async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedIds.length !== 1) {
      toastManager.warning(t('paymentMethods.selectSingleForDefault'));
      return;
    }

    try {
      if (selectedIds[0]) {
        await setDefaultPaymentMethodMutation.mutateAsync({ param: { id: selectedIds[0] } });
      }
      toastManager.success(t('paymentMethods.successMessages.defaultPaymentMethodUpdated'));
      onSelectionChange?.([]);
    } catch {
      toastManager.error(t('paymentMethods.errorMessages.failedToUpdateDefault'));
    }
  }, [selectedItems, setDefaultPaymentMethodMutation, onSelectionChange, t]);

  const handleClearSelection = useCallback(() => {
    onSelectionChange?.([]);
  }, [onSelectionChange]);

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
            <DropdownMenuItem onClick={() => handleViewContract(row.original.id)}>
              {t('paymentMethods.table.actions.viewContract')}
            </DropdownMenuItem>
            {!row.original.isPrimary && (
              <DropdownMenuItem
                onClick={() => handleSetAsDefault(row.original.id)}
                disabled={setDefaultPaymentMethodMutation.isPending}
              >
                {setDefaultPaymentMethodMutation.isPending
                  ? t('paymentMethods.loadingMessages.setting')
                  : t('paymentMethods.table.actions.setAsDefault')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleManagePermissions(row.original.id)}>
              {t('paymentMethods.table.actions.managePermissions')}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleRemoveMethod(row.original.id)}
              disabled={deletePaymentMethodMutation.isPending}
            >
              <Trash2 className="h-4 w-4 me-2" />
              {deletePaymentMethodMutation.isPending
                ? t('paymentMethods.loadingMessages.removingPaymentMethod')
                : t('paymentMethods.table.actions.removeMethod')}
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
      <Button onClick={() => toastManager.success(t('paymentMethods.addPaymentMethod'))}>
        <PlusIcon className="h-4 w-4 me-2" />
        {t('paymentMethods.addPaymentMethod')}
      </Button>
    ),

    // Styling
    'className': 'w-full',
    'aria-label': t('paymentMethods.table.tableAriaLabel'),
  };

  // Handle error state
  if (error && !isLoading) {
    return <PaymentMethodsErrorState error={error} retryFn={retryFn} t={t} />;
  }

  // Loading state
  if (isLoading) {
    return <PaymentMethodsTableSkeleton />;
  }

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

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
        {showQuickActions && (
          <div className="flex items-center gap-3">
            {paymentMethods.length > 0 && (
              <Button
                variant="outline"
                onClick={() => toastManager.info(t('paymentMethods.syncData'))}
              >
                <RefreshCw className="h-4 w-4 me-2" />
                {t('actions.refresh')}
              </Button>
            )}
            <Button onClick={() => toastManager.success(t('paymentMethods.addPaymentMethod'))}>
              <PlusIcon className="h-4 w-4 me-2" />
              {t('paymentMethods.table.addMethod')}
            </Button>
          </div>
        )}
      </FadeIn>

      {/* Bulk Actions Bar */}
      {enableBulkActions && (
        <BulkActionsBar
          selectedCount={selectedCount}
          onBulkDelete={handleBulkDelete}
          onBulkSetDefault={handleBulkSetDefault}
          onClearSelection={handleClearSelection}
          t={t}
        />
      )}

      {/* Enhanced Data Table */}
      <DataTable {...dataTableProps} />
    </div>
  );
});

PaymentMethodsTable.displayName = 'PaymentMethodsTable';

// Export additional components for custom implementations
export { BulkActionsBar, PaymentMethodsErrorState, PaymentMethodsTableSkeleton };
