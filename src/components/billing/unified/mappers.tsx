'use client';

import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  CreditCard,
  FileText,
  Package,
  Settings,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import React from 'react';

import { formatTomanCurrency } from '@/lib/format';

import type { ActionConfig, ContentConfig, StatusConfig } from './billing-display';

// =============================================================================
// UNIFIED BILLING DATA MAPPERS
// Converts existing billing data types to the unified ContentConfig format
// Eliminates the need for each component to handle data transformation differently
// =============================================================================

// Subscription data types (from existing codebase)
export type SubscriptionData = {
  id: string;
  product?: {
    name: string;
    description?: string | null;
    billingPeriod?: string;
  } | null;
  status: string;
  currentPrice: number;
  startDate: string;
  nextBillingDate?: string | null;
  endDate?: string | null;
};

// Payment data types (from existing codebase)
export type PaymentData = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  failureReason?: string | null;
  zarinpalRefId?: string | null;
};

// Plan/Product data types (from existing codebase)
export type PlanData = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  metadata?: {
    popular?: boolean;
    features?: string[];
    tier?: string;
    badgeText?: string;
  } | null;
};

// Payment method data types (for future use)
export type PaymentMethodData = {
  id: string;
  contractDisplayName: string;
  contractMobile?: string | null;
  contractStatus: string;
  isPrimary: boolean | null;
  isActive: boolean | null;
  lastUsedAt?: string | null;
};

// Upcoming bill data types (from existing codebase)
export type UpcomingBillData = {
  id: string;
  productName: string;
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'processing';
  subscriptionId: string;
};

// Overview/metric data types
export type MetricData = {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number | string;
    direction?: 'up' | 'down' | 'neutral';
    label?: string;
  };
  status?: string;
};

// =============================================================================
// MAPPER FUNCTIONS
// =============================================================================

/**
 * Maps subscription data to unified ContentConfig
 */
export function mapSubscriptionToContent(subscription: SubscriptionData, t: (key: string) => string, locale: string, onManage?: (id: string) => void, onCancel?: (id: string) => void): ContentConfig {
  // Status configuration
  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'active':
        return { variant: 'default', label: t('status.active'), color: 'success' };
      case 'trial':
        return { variant: 'secondary', label: t('status.trial'), color: 'info' };
      case 'cancelled':
        return { variant: 'destructive', label: t('status.cancelled'), color: 'error' };
      case 'expired':
        return { variant: 'outline', label: t('status.expired'), color: 'warning' };
      default:
        return { variant: 'outline', label: status, color: 'default' };
    }
  };

  // Primary action (main button)
  const primaryAction: ActionConfig | undefined = onManage && subscription.status === 'active'
    ? {
        label: t('subscription.manage'),
        variant: 'outline',
        size: 'sm',
        icon: Settings,
        onClick: () => onManage(subscription.id),
      }
    : undefined;

  // Secondary actions (additional buttons)
  const secondaryActions: ActionConfig[] = [];

  if (onCancel && ['active', 'trial'].includes(subscription.status)) {
    secondaryActions.push({
      label: t('actions.cancel'),
      variant: 'ghost',
      size: 'sm',
      icon: Trash2,
      onClick: () => onCancel(subscription.id),
    });
  }

  // Metadata
  const metadata = [];
  if (subscription.nextBillingDate) {
    metadata.push({
      label: t('subscription.nextBilling'),
      value: new Date(subscription.nextBillingDate).toLocaleDateString(locale),
      icon: Calendar,
    });
  }

  return {
    title: subscription.product?.name || t('subscription.unknownProduct'),
    description: subscription.product?.description || undefined,
    icon: <Package className="h-5 w-5" />,
    badge: getStatusConfig(subscription.status),
    primaryValue: `${formatTomanCurrency(subscription.currentPrice)}${subscription.product?.billingPeriod ? `/${subscription.product.billingPeriod}` : ''}`,
    primaryLabel: t('subscription.price'),
    metadata,
    primaryAction,
    secondaryActions,
  };
}

/**
 * Maps payment data to unified ContentConfig
 */
export function mapPaymentToContent(payment: PaymentData, t: (key: string) => string, locale: string): ContentConfig {
  // Status configuration
  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'completed':
      case 'paid':
        return { variant: 'default', label: t('status.paid'), color: 'success' };
      case 'pending':
        return { variant: 'secondary', label: t('status.pending'), color: 'warning' };
      case 'failed':
        return { variant: 'destructive', label: t('status.failed'), color: 'error' };
      case 'refunded':
        return { variant: 'outline', label: t('status.refunded'), color: 'info' };
      default:
        return { variant: 'outline', label: status, color: 'default' };
    }
  };

  // Metadata
  const metadata = [];
  if (payment.zarinpalRefId) {
    metadata.push({
      label: t('payment.referenceId'),
      value: `#${payment.zarinpalRefId.slice(-6)}`,
    });
  }

  return {
    title: payment.productName,
    description: payment.status === 'failed' && payment.failureReason
      ? payment.failureReason
      : undefined,
    icon: <ShoppingBag className="h-4 w-4" />,
    badge: getStatusConfig(payment.status),
    primaryValue: `${formatTomanCurrency(payment.amount)} • ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })}`,
    primaryLabel: t('payment.amount'),
    metadata,
  };
}

/**
 * Maps plan/product data to unified ContentConfig
 */
export function mapPlanToContent(plan: PlanData, t: (key: string) => string, onSelect?: (id: string) => void, canSelect?: boolean, contractMessage?: string): ContentConfig {
  const isFree = plan.price === 0;
  const isPopular = plan.metadata?.popular === true;
  const isPro = plan.name.toLowerCase().includes('pro');
  const isPower = plan.name.toLowerCase().includes('power');

  // Features from metadata or default i18n keys
  const features = plan.metadata?.features && plan.metadata.features.length > 0
    ? plan.metadata.features
    : (() => {
        const planType = isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter';
        const baseKey = `pricing.${planType}`;
        return [
          t(`${baseKey}.features.messagesPerMonth`),
          t(`${baseKey}.features.aiModels`),
          t(`${baseKey}.features.conversationsPerMonth`),
          ...(isFree
            ? [t(`${baseKey}.features.basicSupport`)]
            : [t(`${baseKey}.features.premiumModels`)]
          ),
        ];
      })();

  // Badge configuration
  const badge = isPopular
    ? {
        variant: 'default' as const,
        label: plan.metadata?.badgeText || (isPower ? t('plans.bestValue') : t('plans.mostPopular')),
      }
    : undefined;

  // Primary action
  const primaryAction: ActionConfig | undefined = isFree
    ? {
        label: t('status.active'),
        variant: 'outline',
        disabled: true,
      }
    : canSelect && onSelect
      ? {
          label: t('actions.choosePlan'),
          variant: isPopular ? 'default' : 'outline',
          onClick: () => onSelect(plan.id),
        }
      : undefined;

  // Metadata (features)
  const metadata = features.map(feature => ({
    label: '',
    value: (
      <div className="flex items-start gap-2">
        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
        <span className="text-sm text-foreground leading-relaxed">{feature}</span>
      </div>
    ),
  }));

  return {
    title: plan.name,
    description: plan.description || t(`pricing.${isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter'}.description`),
    icon: <FileText className="h-5 w-5" />,
    badge,
    primaryValue: isFree
      ? t('plans.free')
      : `${plan.price.toLocaleString('fa-IR')} ${t('pricing.currency')}`,
    primaryLabel: isFree ? t('time.forever') : t('time.perMonth'),
    primaryAction,
    metadata,
    contentExtra: contractMessage && !canSelect && !isFree
      ? (
          <div className="text-xs text-muted-foreground text-center px-2">
            {contractMessage}
          </div>
        )
      : undefined,
  };
}

/**
 * Maps payment method data to unified ContentConfig
 */
export function mapPaymentMethodToContent(paymentMethod: PaymentMethodData, t: (key: string) => string, onSetPrimary?: (id: string) => void, onRemove?: (id: string) => void): ContentConfig {
  // Status configuration
  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'active':
        return { variant: 'default', label: t('status.active'), color: 'success' };
      case 'pending_signature':
        return { variant: 'secondary', label: t('status.pendingSignature'), color: 'warning' };
      case 'cancelled_by_user':
        return { variant: 'destructive', label: t('status.cancelled'), color: 'error' };
      case 'expired':
        return { variant: 'outline', label: t('status.expired'), color: 'warning' };
      default:
        return { variant: 'outline', label: status, color: 'default' };
    }
  };

  // Actions
  const actions: ActionConfig[] = [];

  if (onSetPrimary && !paymentMethod.isPrimary && paymentMethod.isActive) {
    actions.push({
      label: t('paymentMethods.setPrimary'),
      variant: 'outline',
      size: 'sm',
      onClick: () => onSetPrimary(paymentMethod.id),
    });
  }

  if (onRemove && paymentMethod.contractStatus === 'active') {
    actions.push({
      label: t('actions.remove'),
      variant: 'ghost',
      size: 'sm',
      icon: Trash2,
      onClick: () => onRemove(paymentMethod.id),
    });
  }

  // Metadata
  const metadata = [];
  if (paymentMethod.contractMobile) {
    metadata.push({
      label: t('paymentMethods.mobile'),
      value: paymentMethod.contractMobile,
    });
  }
  if (paymentMethod.lastUsedAt) {
    metadata.push({
      label: t('paymentMethods.lastUsed'),
      value: new Date(paymentMethod.lastUsedAt).toLocaleDateString(),
    });
  }

  return {
    title: paymentMethod.contractDisplayName,
    icon: <CreditCard className="h-5 w-5" />,
    badge: getStatusConfig(paymentMethod.contractStatus),
    primaryValue: paymentMethod.isPrimary ? t('paymentMethods.defaultMethod') : t('paymentMethods.zarinpalDirectDebit'),
    primaryLabel: t('paymentMethods.type'),
    metadata,
    primaryAction: actions.find(a => a.label === t('paymentMethods.setPrimary')),
    secondaryActions: actions.filter(a => a.label !== t('paymentMethods.setPrimary')),
  };
}

/**
 * Maps upcoming bill data to unified ContentConfig
 */
export function mapUpcomingBillToContent(bill: UpcomingBillData, t: (key: string) => string, locale: string): ContentConfig {
  // Status and icon configuration
  const getStatusInfo = (status: string, dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    switch (status) {
      case 'overdue':
        return {
          status: { variant: 'destructive' as const, label: t('status.overdue'), color: 'error' as const },
          icon: AlertTriangle,
          iconColor: 'text-destructive',
          bgColor: 'bg-destructive/10',
        };
      case 'processing':
        return {
          status: { variant: 'secondary' as const, label: t('status.processing'), color: 'warning' as const },
          icon: Clock,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        };
      default:
        if (daysUntilDue <= 3) {
          return {
            status: { variant: 'outline' as const, label: t('status.due'), color: 'warning' as const },
            icon: Calendar,
            iconColor: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          };
        }
        return {
          status: { variant: 'outline' as const, label: t('status.upcoming'), color: 'default' as const },
          icon: Calendar,
          iconColor: 'text-primary',
          bgColor: 'bg-primary/10',
        };
    }
  };

  const statusInfo = getStatusInfo(bill.status, bill.dueDate);
  const dueDate = new Date(bill.dueDate);
  const isToday = dueDate.toDateString() === new Date().toDateString();

  return {
    title: bill.productName,
    icon: React.createElement(statusInfo.icon, { className: 'h-4 w-4' }),
    badge: statusInfo.status,
    primaryValue: `${formatTomanCurrency(bill.amount)} • ${isToday
      ? t('time.today')
      : dueDate.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        })}`,
    primaryLabel: t('billing.amount'),
  };
}

/**
 * Maps metric data to unified ContentConfig
 */
export function mapMetricToContent(metric: MetricData, _t: (key: string) => string): ContentConfig {
  // Trend configuration
  let trendExtra;
  if (metric.trend) {
    const trendValue = typeof metric.trend.value === 'string'
      ? Number.parseFloat(metric.trend.value) || 0
      : metric.trend.value || 0;
    const isPositive = metric.trend.direction === 'up'
      || (metric.trend.direction !== 'down' && metric.trend.direction !== 'neutral' && trendValue > 0);
    const isNegative = metric.trend.direction === 'down'
      || (metric.trend.direction !== 'up' && metric.trend.direction !== 'neutral' && trendValue < 0);

    trendExtra = (
      <div className="flex items-center gap-1 text-xs">
        {isPositive && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        {isNegative && <div className="h-3 w-3 text-red-500 rotate-180"><TrendingUp className="h-3 w-3" /></div>}
        <span className={isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}>
          {trendValue > 0 ? '+' : ''}
          {typeof metric.trend.value === 'string' ? metric.trend.value : `${metric.trend.value}%`}
        </span>
        {metric.trend.label && <span className="text-muted-foreground">{metric.trend.label}</span>}
      </div>
    );
  }

  return {
    title: metric.title,
    description: metric.description,
    primaryValue: metric.value,
    contentExtra: trendExtra,
  };
}

// =============================================================================
// HELPER FUNCTIONS FOR COMMON TRANSFORMATIONS
// =============================================================================

/**
 * Creates a welcome/hero content configuration
 */
export function createWelcomeContent(t: (key: string) => string, onChoosePlan?: () => void, onSetupPayment?: () => void): ContentConfig {
  return {
    title: t('billing.welcome.title'),
    description: t('billing.welcome.description'),
    icon: <TrendingUp className="h-12 w-12 text-primary/60" />,
    primaryAction: onChoosePlan
      ? {
          label: t('billing.choosePlan'),
          variant: 'default',
          size: 'lg',
          icon: Package,
          onClick: onChoosePlan,
        }
      : undefined,
    secondaryActions: onSetupPayment
      ? [{
          label: t('billing.setupPayment'),
          variant: 'outline',
          size: 'lg',
          icon: CreditCard,
          onClick: onSetupPayment,
        }]
      : undefined,
  };
}

/**
 * Creates an empty state content configuration
 */
export function createEmptyContent(title: string, description: string, icon?: React.ReactNode, action?: ActionConfig): ContentConfig {
  return {
    title,
    description,
    icon: icon || <Package className="h-8 w-8 text-muted-foreground" />,
    primaryAction: action,
  };
}

/**
 * Gets the appropriate icon for a billing data type
 */
export function getBillingIcon(dataType: string) {
  switch (dataType) {
    case 'subscription':
      return <Package className="h-5 w-5" />;
    case 'payment':
      return <ShoppingBag className="h-5 w-5" />;
    case 'plan':
      return <FileText className="h-5 w-5" />;
    case 'paymentMethod':
      return <CreditCard className="h-5 w-5" />;
    case 'bill':
      return <Calendar className="h-5 w-5" />;
    case 'metric':
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
}
