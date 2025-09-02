'use client';

import {
  ArrowUpDownIcon,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  EllipsisVerticalIcon,
  ListFilterIcon,
  Receipt,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';

// Follow products-01 pattern exactly for payment data
export function PaymentsTable({
  payments,
}: {
  payments: {
    id: string;
    productName: string;
    amount: number;
    status: string;
    paymentMethod: string;
    paidAt: string | null;
    createdAt: string;
    hasReceipt: boolean;
  }[];
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Payments</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 **:data-[slot=button]:size-8 **:data-[slot=select-trigger]:h-8">
          <Select defaultValue="all">
            <SelectTrigger>
              <span className="text-muted-foreground text-sm">Amount:</span>
              <SelectValue placeholder="Select amount range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amounts</SelectItem>
              <SelectItem value="0-500000">0 - 500,000 ﷼</SelectItem>
              <SelectItem value="500000-1000000">500,000 - 1,000,000 ﷼</SelectItem>
              <SelectItem value="1000000+">1,000,000+ ﷼</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger>
              <span className="text-muted-foreground text-sm">Method:</span>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="direct-debit">Direct Debit</SelectItem>
              <SelectItem value="zarinpal">ZarinPal</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger>
              <span className="text-muted-foreground text-sm">Date:</span>
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Filter payments">
            <ListFilterIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Sort payments">
            <ArrowUpDownIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="!border-0">
              <TableHead className="w-12 rounded-l-lg px-4">
                <Checkbox />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="rounded-r-lg" />
            </TableRow>
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:py-2.5">
            {payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="px-4">
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">
                  {payment.productName}
                  <div className="text-sm text-muted-foreground">
                    Subscription payment
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatTomanCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {payment.paymentMethod === 'direct-debit-contract' ? 'Direct Debit' : 'ZarinPal'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      payment.status === 'completed'
                        ? 'default'
                        : payment.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100'
                        : payment.status === 'pending'
                          ? 'border-orange-500 bg-transparent text-orange-500 hover:bg-orange-50 dark:border-orange-500 dark:bg-transparent dark:text-orange-500'
                          : undefined
                    }
                  >
                    {payment.status === 'completed' && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {payment.status === 'pending' && (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {payment.status === 'failed' && (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
