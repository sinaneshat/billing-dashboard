'use client';

import {
  ArrowUpDownIcon,
  ListFilterIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Base types for billing data table functionality
export type BillingTableColumn<T = Record<string, unknown>> = {
  key: string;
  title: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
};

export type BillingTableFilter = {
  key: string;
  label: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
};

export type BillingTableTab = {
  value: string;
  label: string;
  count?: number;
};

export type BillingDataTableProps<T = Record<string, unknown>> = {
  data: T[];
  columns: BillingTableColumn<T>[];

  // Selection
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getItemId?: (item: T) => string;

  // Tabs
  tabs?: BillingTableTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;

  // Filters
  filters?: BillingTableFilter[];
  onFilterChange?: (key: string, value: string) => void;

  // Pagination - supports both client-side and server-side
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;

  // Loading state
  loading?: boolean;

  // Empty state
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;

  // Table styling
  className?: string;
};

// Default values to prevent React unstable prop warnings
const defaultSelectedItems: string[] = [];
const defaultFilters: BillingTableFilter[] = [];
const defaultGetItemId = (item: Record<string, unknown>) => item.id as string;

export function BillingDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  selectable = false,
  selectedItems = defaultSelectedItems,
  onSelectionChange,
  getItemId = defaultGetItemId,
  tabs,
  activeTab,
  onTabChange,
  filters = defaultFilters,
  onFilterChange,
  currentPage = 1,
  itemsPerPage = 10,
  totalItems,
  onPageChange,
  showPagination = true,
  loading = false,
  emptyStateTitle = 'No data found',
  emptyStateDescription = 'There are no items to display.',
  emptyStateAction,
  className,
}: BillingDataTableProps<T>) {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  // Calculate pagination
  const totalPages = totalItems ? Math.ceil(totalItems / itemsPerPage) : Math.ceil(data.length / itemsPerPage);
  const displayData = totalItems ? data : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    if (checked) {
      const allIds = displayData.map(getItemId);
      onSelectionChange([...new Set([...selectedItems, ...allIds])]);
    } else {
      const currentIds = displayData.map(getItemId);
      onSelectionChange(selectedItems.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    onFilterChange?.(key, value);
  };

  // Check if all current page items are selected
  const currentPageIds = displayData.map(getItemId);
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedItems.includes(id));

  if (data.length === 0 && !loading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">{emptyStateTitle}</h3>
          <p className="text-muted-foreground mt-2">{emptyStateDescription}</p>
          {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-col gap-4 ${className}`}>
      {/* Header with tabs and filters */}
      <div className="flex items-center justify-between gap-4">
        {tabs && (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList>
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 text-xs">
                      (
                      {tab.count}
                      )
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {filters.length > 0 && (
          <div className="flex items-center gap-2 **:data-[slot=button]:size-8 **:data-[slot=select-trigger]:h-8">
            {filters.map(filter => (
              <Select
                key={filter.key}
                value={localFilters[filter.key] || filter.defaultValue || 'all'}
                onValueChange={value => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger>
                  <span className="text-muted-foreground text-sm">
                    {filter.label}
                    :
                  </span>
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            <Button variant="outline" size="icon" aria-label="Filter items">
              <ListFilterIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Sort items">
              <ArrowUpDownIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="!border-0">
              {selectable && (
                <TableHead className="w-12 rounded-l-lg px-4">
                  <Checkbox
                    checked={allCurrentSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all items"
                  />
                </TableHead>
              )}

              {columns.map((column, index) => (
                <TableHead
                  key={column.key}
                  className={`${column.className || ''} ${
                    !selectable && index === 0 ? 'rounded-l-lg' : ''
                  } ${index === columns.length - 1 ? 'rounded-r-lg' : ''}`}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="**:data-[slot=table-cell]:py-2.5">
            {loading
              ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                )
              : (
                  displayData.map((item) => {
                    const itemId = getItemId(item);
                    return (
                      <TableRow key={itemId}>
                        {selectable && (
                          <TableCell className="px-4">
                            <Checkbox
                              checked={selectedItems.includes(itemId)}
                              onCheckedChange={checked => handleSelectItem(itemId, checked as boolean)}
                              aria-label={`Select ${itemId}`}
                            />
                          </TableCell>
                        )}

                        {columns.map(column => (
                          <TableCell key={column.key} className={column.className}>
                            {column.render
                              ? column.render(item[column.key], item)
                              : (item[column.key] as React.ReactNode)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
          </TableBody>
        </Table>
      </div>

      {/* Dynamic Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {/* Generate page numbers with ellipsis logic */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => onPageChange?.(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
