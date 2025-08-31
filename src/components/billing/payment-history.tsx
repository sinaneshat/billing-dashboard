'use client';

import { CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePaymentHistoryQuery } from '@/hooks/queries/payments';
import { formatPersianDateTime, formatTomanCurrency } from '@/lib/i18n/currency-utils';

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

export function PaymentHistory() {
  // Note: API doesn't support filtering/pagination yet
  const { data: paymentHistory, isLoading, error, refetch } = usePaymentHistoryQuery();

  const paymentList = paymentHistory?.success && Array.isArray(paymentHistory.data)
    ? paymentHistory.data
    : [];

  if (isLoading) {
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
                              <p className="font-medium">{formatPersianDateTime(payment.createdAt)}</p>
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
                            <p className="font-semibold">{formatTomanCurrency(payment.amount)}</p>
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

                </div>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
