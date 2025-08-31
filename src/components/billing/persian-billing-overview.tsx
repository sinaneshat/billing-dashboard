'use client';

import { Calendar, CreditCard, Package, Plus } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { usePaymentHistoryQuery } from '@/hooks/queries/payments';
import { useProductsQuery } from '@/hooks/queries/products';
import { useCurrentSubscriptionQuery } from '@/hooks/queries/subscriptions';
import {
  formatPersianCurrency,
  formatPersianDate,
  formatTomanCurrency,
  rtlClass,
  t,
} from '@/lib/i18n/persian-utils';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'canceled':
      return 'secondary';
    case 'expired':
      return 'destructive';
    case 'pending':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function PersianBillingOverviewPage() {
  const { data: currentSubscription, isLoading: subscriptionLoading, error: subscriptionError } = useCurrentSubscriptionQuery();
  const { data: paymentHistory, isLoading: paymentsLoading } = usePaymentHistoryQuery({ query: { limit: '5' } });
  const { data: products } = useProductsQuery({ query: { limit: '10' } });

  const recentPayments = paymentHistory?.success && Array.isArray(paymentHistory.data)
    ? paymentHistory.data.slice(0, 3)
    : [];

  const availableProducts = products?.success && Array.isArray(products.data)
    ? products.data.filter(product => product.isActive)
    : [];

  if (subscriptionLoading) {
    return (
      <div className={rtlClass('flex items-center justify-center min-h-96')}>
        <LoadingSpinner className="h-8 w-8 ml-2" />
        <span>{t('actions.loadingSubscriptions')}</span>
      </div>
    );
  }

  return (
    <div className={rtlClass('space-y-6 font-iranian-sans')} dir="rtl">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className={rtlClass('flex items-center gap-2')}>
            <Package className="h-5 w-5" />
            {t('billing.currentSubscription')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionError || !currentSubscription
            ? (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">هیچ اشتراک فعالی ندارید</h3>
                  <p className="text-muted-foreground mb-4">
                    شما اشتراک فعالی ندارید. برای شروع، یک طرح انتخاب کنید.
                  </p>
                  <Button asChild>
                    <Link href="/billing/plans">
                      <Plus className="h-4 w-4 ml-2" />
                      انتخاب طرح
                    </Link>
                  </Button>
                </div>
              )
            : (
                <div className="space-y-4">
                  <div className={rtlClass('flex items-start justify-between')}>
                    <div className={rtlClass('text-right')}>
                      <h3 className="font-semibold text-lg">{currentSubscription.product?.name}</h3>
                      <p className="text-muted-foreground">{currentSubscription.product?.description}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(currentSubscription.status)}>
                      {t(`status.${currentSubscription.status}`)}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={rtlClass('text-right')}>
                      <p className="text-sm font-medium text-muted-foreground">{t('billing.currentPrice')}</p>
                      <p className="text-2xl font-bold">
                        {formatTomanCurrency(currentSubscription.currentPrice)}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        (
                        {formatPersianCurrency(currentSubscription.currentPrice)}
                        )
                      </p>
                      <p className="text-sm text-muted-foreground">
                        هر
                        {' '}
                        {currentSubscription.billingPeriod === 'monthly' ? 'ماه' : 'سال'}
                      </p>
                    </div>

                    <div className={rtlClass('text-right')}>
                      <p className="text-sm font-medium text-muted-foreground">{t('billing.startDate')}</p>
                      <p className="text-lg">{formatPersianDate(currentSubscription.startDate)}</p>
                    </div>

                    <div className={rtlClass('text-right')}>
                      <p className="text-sm font-medium text-muted-foreground">{t('billing.nextBilling')}</p>
                      <p className="text-lg">
                        {currentSubscription.nextBillingDate
                          ? formatPersianDate(currentSubscription.nextBillingDate)
                          : 'ندارد'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className={rtlClass('flex gap-2')}>
                    <Button variant="outline" asChild>
                      <Link href="/billing/subscriptions">جزئیات بیشتر</Link>
                    </Button>
                    {currentSubscription.status === 'active' && (
                      <Button variant="outline" asChild>
                        <Link href="/billing/subscriptions/cancel">لغو اشتراک</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className={rtlClass('flex items-center gap-2')}>
            <CreditCard className="h-5 w-5" />
            {t('billing.recentPayments')}
          </CardTitle>
          <CardDescription>آخرین تراکنش‌های پرداختی شما</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading
            ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner className="h-6 w-6 ml-2" />
                  <span>{t('actions.loadingPayments')}</span>
                </div>
              )
            : recentPayments.length === 0
              ? (
                  <div className="text-center py-6">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">هیچ سابقه پرداختی یافت نشد</p>
                  </div>
                )
              : (
                  <div className="space-y-4">
                    {recentPayments.map(payment => (
                      <div key={payment.id} className={rtlClass('flex items-center justify-between p-4 border rounded-lg')}>
                        <div className="flex-1 text-right">
                          <p className="font-medium">{payment.product?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPersianDate(payment.createdAt)}
                            {' '}
                            •
                            {payment.paymentMethod}
                          </p>
                        </div>
                        <div className={rtlClass('text-left')}>
                          <p className="font-medium">
                            {formatTomanCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPersianCurrency(payment.amount, payment.currency)}
                          </p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {t(`status.${payment.status}`)}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/billing/payments">مشاهده همه پرداخت‌ها</Link>
                    </Button>
                  </div>
                )}
        </CardContent>
      </Card>

      {/* Available Plans (if no active subscription) */}
      {(!currentSubscription || currentSubscription.status !== 'active') && availableProducts.length > 0 && (
        <Card>
          <CardHeader className={rtlClass('text-right')}>
            <CardTitle>{t('billing.availablePlans')}</CardTitle>
            <CardDescription>طرح اشتراکی را انتخاب کنید که با نیازهای شما مطابقت دارد</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableProducts.slice(0, 3).map(product => (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  <div className={rtlClass('text-right')}>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  <div className={rtlClass('text-right')}>
                    <p className="text-2xl font-bold">{formatTomanCurrency(product.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      (
                      {formatPersianCurrency(product.price)}
                      )
                    </p>
                    <p className="text-sm text-muted-foreground">
                      هر
                      {' '}
                      {product.billingPeriod === 'monthly' ? 'ماه' : 'سال'}
                    </p>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={`/billing/subscribe?product=${product.id}`}>
                      اشتراک همین حالا
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {availableProducts.length > 3 && (
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/billing/plans">مشاهده همه طرح‌ها</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Method Alert */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>پرداخت خودکار</AlertTitle>
        <AlertDescription>
          پرداخت خودکار را تنظیم کنید تا از خدمات بدون وقفه اطمینان حاصل کنید.
          اشتراک شما با استفاده از روش پرداخت انتخابی، به‌طور خودکار تمدید می‌شود.
        </AlertDescription>
      </Alert>
    </div>
  );
}
