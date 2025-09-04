"use client"

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ArrowUpDown,
  ListFilter,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/motion"
import { cn } from "@/lib"

// Enhanced filter configuration
export type DataTableFilter = {
  key: string
  label: string
  placeholder?: string
  options: Array<{ value: string; label: string }>
  defaultValue?: string
}

// Tab configuration
export type DataTableTab = {
  value: string
  label: string
  count?: number
}

// Enhanced DataTable props following Shadcn patterns but with billing features
export type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  
  // Search functionality
  searchKey?: string
  searchPlaceholder?: string
  
  // Selection
  enableSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData) => string
  
  // Tabs
  tabs?: DataTableTab[]
  activeTab?: string
  onTabChange?: (tab: string) => void
  
  // Advanced filters
  filters?: DataTableFilter[]
  onFilterChange?: (key: string, value: string) => void
  
  // Pagination - supports server-side
  currentPage?: number
  pageSize?: number
  totalPages?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  enablePagination?: boolean
  
  // Loading and states
  loading?: boolean
  loadingRowCount?: number
  
  // Empty state
  emptyStateTitle?: string
  emptyStateDescription?: string
  emptyStateAction?: React.ReactNode
  
  // Styling and layout
  className?: string
  tableClassName?: string
  showColumnToggle?: boolean
  showToolbar?: boolean
  
  // Accessibility
  "aria-label"?: string
}

// Loading skeleton for table rows
function TableRowSkeleton({ columnsCount }: { columnsCount: number }) {
  return (
    <TableRow>
      {Array.from({ length: columnsCount }, (_, i) => (
        <TableCell key={i} className="py-4">
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

// Enhanced DataTable component following official Shadcn patterns
export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  enableSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  getRowId = (row: TData) => row.id as string,
  tabs,
  activeTab,
  onTabChange,
  filters = [],
  onFilterChange,
  currentPage = 1,
  pageSize = 10,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  enablePagination = true,
  loading = false,
  loadingRowCount = 5,
  emptyStateTitle = "No data found",
  emptyStateDescription = "There are no items to display.",
  emptyStateAction,
  className,
  tableClassName,
  showColumnToggle = true,
  showToolbar = true,
  "aria-label": ariaLabel = "Data table",
  ...props
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [localFilters, setLocalFilters] = React.useState<Record<string, string>>({})
  
  // Calculate pagination
  const calculatedTotalPages = totalPages || Math.ceil(data.length / pageSize)
  const paginatedData = totalItems ? data : data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  
  const table = useReactTable({
    data: paginatedData,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination: !!totalItems,
  })
  
  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
    onFilterChange?.(key, value)
  }
  
  const handlePageChange = (page: number) => {
    onPageChange?.(page)
  }
  
  // Handle select all for current page
  const handleSelectAll = (checked: boolean) => {
    if (!onRowSelectionChange) return
    
    const currentPageIds = paginatedData.map(getRowId)
    
    onRowSelectionChange((prev) => {
      const newSelection = { ...prev }
      
      if (checked) {
        currentPageIds.forEach(id => {
          newSelection[id] = true
        })
      } else {
        currentPageIds.forEach(id => {
          delete newSelection[id]
        })
      }
      
      return newSelection
    })
  }
  
  const selectedCount = Object.keys(rowSelection).length
  const currentPageIds = paginatedData.map(getRowId)
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => rowSelection[id])
  
  return (
    <div className={cn("flex w-full flex-col gap-4", className)} {...props}>
      {/* Header with tabs and filters */}
      {(showToolbar || tabs || filters.length > 0) && (
        <FadeIn className="flex items-center justify-between gap-4">
          {tabs && (
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList>
                {tabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} data-slot="tab">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-1 text-xs">({tab.count})</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          {/* Filters and search */}
          <div className="flex items-center gap-2">
            {searchKey && (
              <Input
                placeholder={searchPlaceholder || `Search ${searchKey}...`}
                value={table.getColumn(searchKey)?.getFilterValue() as string ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                data-slot="search-input"
              />
            )}
            
            {filters.map(filter => (
              <Select
                key={filter.key}
                value={localFilters[filter.key] || filter.defaultValue || 'all'}
                onValueChange={value => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger data-slot="filter-trigger" className="w-[180px]">
                  <span className="text-muted-foreground text-sm">
                    {filter.label}:
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
            
            {filters.length > 0 && (
              <Button variant="outline" size="icon" aria-label="Open filters menu">
                <ListFilter className="h-4 w-4" />
              </Button>
            )}
            
            {showColumnToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </FadeIn>
      )}
      
      {/* Data Table */}
      <FadeIn className="overflow-hidden rounded-lg border border-border/50">
        <Table className={tableClassName} aria-label={ariaLabel}>
          <TableHeader data-slot="table-header">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/50">
                {enableSelection && (
                  <TableHead className="w-12 px-4" data-slot="selection-header">
                    <Checkbox
                      checked={allCurrentSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} data-slot="table-head">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          
          <TableBody data-slot="table-body">
            {loading ? (
              // Loading state
              Array.from({ length: loadingRowCount }, (_, i) => (
                <TableRowSkeleton
                  key={`loading-${i}`}
                  columnsCount={columns.length + (enableSelection ? 1 : 0)}
                />
              ))
            ) : table.getRowModel().rows?.length ? (
              // Data rows with stagger animation
              <StaggerContainer>
                {table.getRowModel().rows.map((row, index) => {
                  const rowId = getRowId(row.original)
                  return (
                    <StaggerItem key={row.id} delay={index * 0.02}>
                      <TableRow
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        data-slot="table-row"
                      >
                        {enableSelection && (
                          <TableCell className="px-4" data-slot="selection-cell">
                            <Checkbox
                              checked={!!rowSelection[rowId]}
                              onCheckedChange={(checked) => {
                                if (!onRowSelectionChange) return
                                onRowSelectionChange((prev) => {
                                  const newSelection = { ...prev }
                                  if (checked) {
                                    newSelection[rowId] = true
                                  } else {
                                    delete newSelection[rowId]
                                  }
                                  return newSelection
                                })
                              }}
                              aria-label={`Select row ${rowId}`}
                            />
                          </TableCell>
                        )}
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} data-slot="table-cell">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            ) : (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="text-center py-12"
                >
                  <div className="flex flex-col items-center gap-4">
                    <h3 className="text-lg font-semibold">{emptyStateTitle}</h3>
                    <p className="text-muted-foreground">{emptyStateDescription}</p>
                    {emptyStateAction && <div className="mt-2">{emptyStateAction}</div>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </FadeIn>
      
      {/* Enhanced Pagination */}
      {enablePagination && calculatedTotalPages > 1 && (
        <FadeIn className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {enableSelection && selectedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {totalItems || data.length} row(s) selected
              </p>
            )}
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Rows per page</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={cn(
                    currentPage <= 1 && "pointer-events-none opacity-50",
                    "cursor-pointer"
                  )}
                />
              </PaginationItem>
              
              {/* Page numbers with ellipsis */}
              {Array.from({ length: Math.min(5, calculatedTotalPages) }, (_, i) => {
                let pageNum
                if (calculatedTotalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= calculatedTotalPages - 2) {
                  pageNum = calculatedTotalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              {calculatedTotalPages > 5 && currentPage < calculatedTotalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(calculatedTotalPages, currentPage + 1))}
                  className={cn(
                    currentPage >= calculatedTotalPages && "pointer-events-none opacity-50",
                    "cursor-pointer"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </FadeIn>
      )}
    </div>
  )
}

// Column helper for sortable headers
export function createSortableHeader(title: string) {
  return ({ column }: { column: any }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-4 h-8 data-[state=open]:bg-accent"
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

// Selection column helper
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

