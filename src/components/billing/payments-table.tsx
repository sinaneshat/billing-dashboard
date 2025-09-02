'use client';

import {
  Calendar,
  Download,
  EllipsisVerticalIcon,
  Receipt,
} from 'lucide-react';

import type { BillingTableColumn, BillingTableFilter, BillingTableTab } from '@/components/billing/billing-data-table';
import { BillingDataTable } from '@/components/billing/billing-data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

type Payment = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  hasReceipt: boolean;
};

type PaymentsTableProps = {
  payments: Payment[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onTabChange?: (tab: string) => void;
  onFilterChange?: (key: string, value: string) => void;
  selectedItems?: string[];
};

// Modern payments table using reusable components
// Default values to prevent React unstable prop warnings
const defaultSelectedItems: string[] = [];

export function PaymentsTable({
  payments,
  onSelectionChange,
  onTabChange,
  onFilterChange,
  selectedItems = defaultSelectedItems,
}: PaymentsTableProps) {
  // Define columns for payments table
  const columns: BillingTableColumn<Payment>[] = [
    {
      key: 'productName',
      title: 'Product',
      className: 'font-medium',
      render: value => (
        <>
          {value}
          <div className="text-sm text-muted-foreground">
            Subscription payment
          </div>
        </>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      className: 'text-right',
      render: value => formatTomanCurrency(value as number),
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: value => (
        <div className="text-sm">
          {value === 'direct-debit-contract' ? 'Direct Debit' : 'ZarinPal'}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: value => <PaymentStatusBadge status={value as string} />,
    },
    {
      key: 'date',
      title: 'Date',
      render: (_, payment) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (_, payment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="Open payment actions"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            {payment.hasReceipt && (
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Receipt className="h-4 w-4 mr-2" />
              Generate Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Define tabs
  const tabs: BillingTableTab[] = [
    { value: 'all', label: 'All Payments' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ];

  // Define filters
  const filters: BillingTableFilter[] = [
    {
      key: 'amount',
      label: 'Amount',
      placeholder: 'Select amount range',
      options: [
        { value: 'all', label: 'All Amounts' },
        { value: '0-500000', label: '0 - 500,000 ﷼' },
        { value: '500000-1000000', label: '500,000 - 1,000,000 ﷼' },
        { value: '1000000+', label: '1,000,000+ ﷼' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'method',
      label: 'Method',
      placeholder: 'Select payment method',
      options: [
        { value: 'all', label: 'All Methods' },
        { value: 'direct-debit', label: 'Direct Debit' },
        { value: 'zarinpal', label: 'ZarinPal' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'date',
      label: 'Date',
      placeholder: 'Select date range',
      options: [
        { value: 'all', label: 'All Time' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' },
      ],
      defaultValue: 'all',
    },
  ];

  return (
    <BillingDataTable
      data={payments}
      columns={columns}
      selectable
      selectedItems={selectedItems}
      onSelectionChange={onSelectionChange}
      tabs={tabs}
      onTabChange={onTabChange}
      filters={filters}
      onFilterChange={onFilterChange}
      emptyStateTitle="No Payments Found"
      emptyStateDescription="No payment records match your current filters. Try adjusting your search criteria."
    />
  );
}
