'use client';

import {
  ArrowUpDownIcon,
  CheckCircle,
  EllipsisVerticalIcon,
  ListFilterIcon,
  PlusIcon,
  Shield,
  Trash2,
} from 'lucide-react';
import { memo } from 'react';

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

// Follow products-01 pattern exactly for payment methods
export const PaymentMethodsTable = memo(({
  paymentMethods,
}: {
  paymentMethods: {
    id: string;
    contractDisplayName: string;
    contractMobile: string | null;
    contractStatus: string;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
  }[];
}) => {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Methods</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="add-method" asChild>
              <button type="button">
                <PlusIcon />
              </button>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 **:data-[slot=button]:size-8 **:data-[slot=select-trigger]:h-8">
          <Select defaultValue="all">
            <SelectTrigger>
              <span className="text-muted-foreground text-sm">Status:</span>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger>
              <span className="text-muted-foreground text-sm">Type:</span>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Filter payment methods">
            <ListFilterIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Sort payment methods">
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
              <TableHead>Payment Method</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="rounded-r-lg" />
            </TableRow>
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:py-2.5">
            {paymentMethods.map(method => (
              <TableRow key={method.id}>
                <TableCell className="px-4">
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>{method.contractDisplayName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Direct Debit Contract
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {method.contractMobile || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      method.contractStatus === 'signed'
                        ? 'default'
                        : method.contractStatus === 'expired'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={
                      method.contractStatus === 'signed'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100'
                        : method.contractStatus === 'pending'
                          ? 'border-orange-500 bg-transparent text-orange-500 hover:bg-orange-50 dark:border-orange-500 dark:bg-transparent dark:text-orange-500'
                          : undefined
                    }
                  >
                    {method.contractStatus.charAt(0).toUpperCase() + method.contractStatus.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {method.isPrimary
                    ? (
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )
                    : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {method.lastUsedAt
                      ? new Date(method.lastUsedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </span>
                </TableCell>
                <TableCell>
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
});
