'use client';

import { CreditCard, Filter, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePaymentHistoryQuery } from '@/hooks/queries/payments';

function formatCurrency(amount: number, currency: string = 'IRR') {
  return new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'default';
    case 'pending':
      return 'outline';
    case 'failed':
      return 'destructive';
    case 'refunded':
      return 'secondary';
    case 'canceled':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'pending':
      return 'text-yellow-600';
    case 'failed':
      return 'text-red-600';
    case 'refunded':
      return 'text-blue-600';
    case 'canceled':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

type PaymentFilters = {
  status?: string;
  dateRange?: string;
  search?: string;
};

export function PaymentHistory() {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = {
    query: {
      ...(filters.status && filters.status !== 'all' && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      page: page.toString(),
      limit: limit.toString(),
    },
  };

  const { data: paymentHistory, isLoading, error, refetch } = usePaymentHistoryQuery(queryParams);

  const paymentList = paymentHistory?.success && Array.isArray(paymentHistory.data)
    ? paymentHistory.data
    : [];

  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1); // Reset to first page when filtering
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm);
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner className="h-8 w-8 mr-2" />
        <span>Loading payment history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-destructive mb-2">Failed to load payment history</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment History</h2>
          <p className="text-muted-foreground">
            View and manage your payment transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter your payment history to find specific transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="search-input">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Search by product, ID..."
                  className="pl-10"
                  value={filters.search || ''}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={filters.status || 'all'} onValueChange={value => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <Select value={filters.dateRange || 'all'} onValueChange={value => handleFilterChange('dateRange', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {paymentList.length}
            {' '}
            transaction
            {paymentList.length !== 1 ? 's' : ''}
            {' '}
            found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentList.length === 0
            ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payments Found</h3>
                  <p className="text-muted-foreground">
                    No payment transactions match your current filters
                  </p>
                </div>
              )
            : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentList.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{formatDate(payment.createdAt)}</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {payment.id.slice(0, 8)}
                                ...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{payment.product?.name || 'Unknown Product'}</p>
                              {payment.subscription && (
                                <p className="text-sm text-muted-foreground">
                                  Subscription:
                                  {' '}
                                  {payment.subscription.id.slice(0, 8)}
                                  ...
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{formatCurrency(payment.amount, payment.currency)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="capitalize">{payment.paymentMethod}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(payment.status)} className={getStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {paymentList.length >= limit && (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page
                        {' '}
                        {page}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={paymentList.length < limit || isLoading}
                      >
                        {isLoading && <LoadingSpinner className="h-4 w-4 mr-2" />}
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
