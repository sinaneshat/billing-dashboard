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

// Import Zod-inferred types from backend API schemas - simplified
import type { PaymentMethod } from '@/api/routes/payment-methods/schema';
import type { Payment } from '@/api/routes/payments/schema';
import type { Product } from '@/api/routes/products/schema';
import { convertRialToToman } from '@/lib/currency/conversion';
import { formatBillingDate, formatNextBillingDate } from '@/lib/format';
import { formatTomanCurrency } from '@/lib/format/currency';

import type { ActionConfig, ContentConfig, StatusConfig } from './billing-display';

// =============================================================================
// UNIFIED BILLING DATA MAPPERS
// Converts existing billing data types to the unified ContentConfig format
// Eliminates the need for each component to handle data transformation differently
// =============================================================================

// Subscription data types (from existing codebase) - SOLID-compliant without cross-domain data
// Raw database values - NO transformations from backend
export type SubscriptionData = {
  id: string;
  productId: string; // Reference to product - fetch separately
  paymentMethod?: {
    id: string;
    contractDisplayName: string;
    contractMobile?: string | null;
    contractStatus: string;
    bankCode?: string | null;
    isPrimary?: boolean | null;
    isActive?: boolean | null;
  } | null;
  status: string;
  currentPrice: number; // USD price from database - frontend converts to Toman
  startDate: string;
  nextBillingDate?: string | null;
  endDate?: string | null;
};

// Use raw API types directly
export type ProductData = Product;
export type PaymentData = Payment;

// Use raw PaymentMethod type from backend schema
export type PaymentMethodData = PaymentMethod;

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
 * Maps subscription data to unified ContentConfig with separate product data
 */
export function mapSubscriptionToContent(
  subscription: SubscriptionData,
  product: Product | null,
  t: (key: string) => string,
  locale: string,
  onManage?: (id: string) => void,
  onCancel?: (id: string) => void,
): ContentConfig {
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
      value: formatNextBillingDate(subscription.nextBillingDate, locale),
      icon: Calendar,
    });
  }

  // Add payment method information to metadata
  if (subscription.paymentMethod) {
    const bankContractInfo = formatBankContractInfo(subscription.paymentMethod);

    metadata.push({
      label: t('subscription.paymentMethod'),
      value: bankContractInfo,
      icon: CreditCard,
    });

    // Add mobile number if available and different from contract display name
    if (subscription.paymentMethod.contractMobile) {
      metadata.push({
        label: t('paymentMethods.mobile'),
        value: subscription.paymentMethod.contractMobile,
      });
    }
  }

  // TEMPORARY: Subscription still needs conversion until backend updated
  // TODO: Update subscription endpoints to return converted prices like products
  // For now, show raw USD price to avoid wrong conversions
  const formattedPrice = subscription.currentPrice === 0
    ? 'Free'
    : `$${subscription.currentPrice}/month`; // Show USD until backend conversion implemented

  return {
    title: product?.name || t('subscription.unknownProduct'),
    description: product?.description || undefined,
    icon: <Package className="h-5 w-5" />,
    badge: getStatusConfig(subscription.status),
    // Frontend handles all formatting
    primaryValue: formattedPrice,
    primaryLabel: t('subscription.price'),
    metadata,
    primaryAction,
    secondaryActions,
  };
}

/**
 * Maps payment data to unified ContentConfig with separate product data
 */
export function mapPaymentToContent(
  payment: PaymentData,
  product: Product | null,
  t: (key: string) => string,
  locale: string,
): ContentConfig {
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

  // Show payment method type if direct debit was used
  // Note: Payment method details should be fetched separately following SOLID principles
  if (payment.zarinpalDirectDebitUsed) {
    metadata.push({
      label: t('payment.paymentMethod'),
      value: t('payment.directDebitUsed'),
      icon: CreditCard,
    });
  } else if (payment.paymentMethod === 'zarinpal') {
    metadata.push({
      label: t('payment.paymentMethod'),
      value: t('payment.zarinpal'),
      icon: CreditCard,
    });
  }

  // Show payment date separately from amount
  if (payment.paidAt || payment.createdAt) {
    metadata.push({
      label: t('payment.date'),
      value: formatBillingDate(payment.paidAt || payment.createdAt, locale, 'short'),
      icon: Calendar,
    });
  }

  // Frontend handles currency conversion and formatting
  // Payment amounts are stored in IRR in database, convert to Toman for display
  const tomanAmount = convertRialToToman(payment.amount);
  const formattedAmount = formatTomanCurrency(tomanAmount, {
    locale: locale as 'en' | 'fa',
    showUnit: true,
  });

  return {
    title: product?.name || t('payment.unknownProduct'),
    description: payment.status === 'failed' && payment.failureReason
      ? payment.failureReason
      : undefined,
    icon: <ShoppingBag className="h-4 w-4" />,
    badge: getStatusConfig(payment.status),
    // Frontend handles all formatting
    primaryValue: formattedAmount,
    primaryLabel: t('payment.amount'),
    metadata,
  };
}

/**
 * Maps plan/product data to unified ContentConfig
 */
export function mapPlanToContent(plan: Product, t: (key: string) => string, locale: string, onSelect?: (id: string) => void, canSelect?: boolean, contractMessage?: string): ContentConfig {
  const isFree = plan.price === 0;

  // Safely access metadata with type assertion
  const planMetadata = plan.metadata as { popular?: boolean; features?: string[]; tier?: string; badgeText?: string } | null;
  const isPopular = planMetadata?.popular === true;
  const isPro = plan.name.toLowerCase().includes('pro');
  const isPower = plan.name.toLowerCase().includes('power');

  // Features from metadata or default i18n keys
  const features = planMetadata?.features && planMetadata.features.length > 0
    ? planMetadata.features
    : (() => {
        const planType = isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter';
        const baseKey = `plans.pricing.${planType}`;
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
        label: planMetadata?.badgeText || (isPower ? t('plans.bestValue') : t('plans.mostPopular')),
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

  // Metadata (features) with enhanced styling
  const featureMetadata = features.map((feature, _index) => ({
    label: '',
    value: (
      <div className="flex items-start gap-3 py-1">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/25 flex items-center justify-center mt-0.5 shadow-sm transition-all duration-200">
          <Check className="h-3 w-3 text-primary font-bold drop-shadow-sm" />
        </div>
        <span className="text-sm text-foreground/90 leading-relaxed font-medium tracking-tight group-hover:text-foreground transition-colors duration-200">
          {feature}
        </span>
      </div>
    ),
  }));

  // Frontend handles currency conversion and formatting
  const getPrimaryValue = () => {
    if (isFree) {
      return t('plans.free');
    }

    // Use backend-converted price (backend handles exchange rate conversion)
    // Backend fails if exchange rate API unavailable - no fallbacks
    const planWithConvertedPrices = plan as ProductData & {
      formattedPrice?: string;
      priceToman?: number;
    };
    const formattedPrice = planWithConvertedPrices.formattedPrice || formatTomanCurrency(planWithConvertedPrices.priceToman || 0, {
      locale: locale as 'en' | 'fa',
      showUnit: true,
    });

    // Add billing period to the formatted price
    const periodLabel = locale === 'fa' ? 'ماه' : 'month';
    return `${formattedPrice}/${periodLabel}`;
  };

  return {
    title: plan.name,
    description: plan.description || t(`plans.pricing.${isFree ? 'free' : isPro ? 'pro' : isPower ? 'power' : 'starter'}.description`),
    icon: <FileText className="h-5 w-5" />,
    badge,
    primaryValue: getPrimaryValue(),
    primaryLabel: isFree ? t('time.forever') : t('time.perMonth'),
    primaryAction,
    metadata: featureMetadata,
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
 * Maps payment method data to unified ContentConfig with enhanced bank contract information
 */
export function mapPaymentMethodToContent(paymentMethod: PaymentMethodData, t: (key: string) => string, locale: string, onSetPrimary?: (id: string) => void, onRemove?: (id: string) => void): ContentConfig {
  // Enhanced status configuration with comprehensive states
  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'active':
        return { variant: 'success', label: t('paymentMethods.status.active'), color: 'success' };
      case 'pending_signature':
        return { variant: 'warning', label: t('paymentMethods.status.pendingSignature'), color: 'warning' };
      case 'cancelled_by_user':
        return { variant: 'destructive', label: t('paymentMethods.status.cancelled'), color: 'error' };
      case 'verification_failed':
        return { variant: 'destructive', label: t('paymentMethods.status.verificationFailed'), color: 'error' };
      case 'expired':
        return { variant: 'outline', label: t('paymentMethods.status.expired'), color: 'warning' };
      default:
        return { variant: 'outline', label: status, color: 'default' };
    }
  };

  // Enhanced actions with proper conditions
  const actions: ActionConfig[] = [];

  if (onSetPrimary && !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active' && paymentMethod.isActive) {
    actions.push({
      label: t('paymentMethods.setAsDefault'),
      variant: 'outline',
      size: 'sm',
      icon: FileText,
      onClick: () => onSetPrimary(paymentMethod.id),
    });
  }

  if (onRemove && ['active', 'cancelled_by_user', 'expired'].includes(paymentMethod.contractStatus)) {
    actions.push({
      label: t('actions.remove'),
      variant: 'ghost',
      size: 'sm',
      icon: Trash2,
      onClick: () => onRemove(paymentMethod.id),
    });
  }

  // Enhanced metadata with bank contract information
  const metadata = [];

  // Bank information
  if (paymentMethod.bankCode) {
    const bankName = getBankName(paymentMethod.bankCode);
    metadata.push({
      label: t('paymentMethods.bankName'),
      value: bankName,
      icon: CreditCard,
    });
  }

  // Mobile number with proper masking
  if (paymentMethod.contractMobile) {
    const maskedMobile = paymentMethod.contractMobile.length > 4
      ? `****${paymentMethod.contractMobile.slice(-4)}`
      : paymentMethod.contractMobile;
    metadata.push({
      label: t('paymentMethods.phoneNumber'),
      value: maskedMobile,
    });
  }

  // Contract reference
  if (paymentMethod.contractSignatureHash) {
    metadata.push({
      label: t('paymentMethods.reference'),
      value: `#${paymentMethod.contractSignatureHash.slice(-8)}`,
    });
  }

  // Last used date - using string timestamp from API
  if (paymentMethod.lastUsedAt) {
    const dateStr = paymentMethod.lastUsedAt;
    metadata.push({
      label: t('paymentMethods.table.lastUsed'),
      value: formatBillingDate(dateStr, locale, 'short'),
      icon: Calendar,
    });
  }

  // Contract expiration - using string timestamp from API
  if (paymentMethod.contractExpiresAt) {
    const dateStr = paymentMethod.contractExpiresAt;
    const expiryDate = formatBillingDate(dateStr, locale, 'short');
    metadata.push({
      label: t('paymentMethods.expires'),
      value: expiryDate,
      icon: AlertTriangle,
    });
  }

  // Security verification indicator - using string timestamp from API
  if (paymentMethod.contractVerifiedAt) {
    const dateStr = paymentMethod.contractVerifiedAt;
    metadata.push({
      label: t('paymentMethods.directDebit.bankVerified'),
      value: formatBillingDate(dateStr, locale, 'short'),
      icon: Check,
    });
  }

  // Transaction limits - simplified (amounts already in IRR, convert to Toman for display)
  if (paymentMethod.maxTransactionAmount) {
    const tomanAmount = paymentMethod.maxTransactionAmount / 10; // Convert IRR to Toman
    metadata.push({
      label: t('paymentMethods.maxTransactionAmount'),
      value: `${tomanAmount.toLocaleString()} تومان`,
    });
  }

  // Daily limit - simplified (amounts already in IRR, convert to Toman for display)
  if (paymentMethod.maxDailyAmount) {
    const tomanAmount = paymentMethod.maxDailyAmount / 10; // Convert IRR to Toman
    metadata.push({
      label: t('paymentMethods.maxDailyAmount'),
      value: `${tomanAmount.toLocaleString()} تومان`,
    });
  }

  // Daily transaction count
  if (paymentMethod.maxDailyCount) {
    metadata.push({
      label: t('paymentMethods.maxDailyCount'),
      value: `${paymentMethod.maxDailyCount} ${t('transactions.perDay')}`,
    });
  }

  // Monthly transaction count
  if (paymentMethod.maxMonthlyCount) {
    metadata.push({
      label: t('paymentMethods.maxMonthlyCount'),
      value: `${paymentMethod.maxMonthlyCount} ${t('transactions.perMonth')}`,
    });
  }

  // Contract duration
  if (paymentMethod.contractDurationDays) {
    metadata.push({
      label: t('paymentMethods.contractDuration'),
      value: `${paymentMethod.contractDurationDays} ${t('time.days')}`,
    });
  }

  // Contract display name with bank info
  const displayTitle = paymentMethod.contractDisplayName !== 'Direct Debit Contract'
    ? paymentMethod.contractDisplayName
    : formatBankContractDisplayName(paymentMethod, t);

  // Primary value with status-based display
  const primaryValue = paymentMethod.isPrimary
    ? t('paymentMethods.defaultMethod')
    : paymentMethod.contractStatus === 'active'
      ? t('paymentMethods.zarinpalDirectDebit')
      : t(`paymentMethods.status.${paymentMethod.contractStatus}`);

  return {
    title: displayTitle,
    subtitle: paymentMethod.contractType === 'direct_debit_contract'
      ? t('paymentMethods.directDebitContract')
      : t('paymentMethods.contract'),
    description: getStatusConfig(paymentMethod.contractStatus).color === 'error'
      ? t(`paymentMethods.status.${paymentMethod.contractStatus}Description`)
      : undefined,
    icon: <CreditCard className="h-5 w-5" />,
    badge: getStatusConfig(paymentMethod.contractStatus),
    primaryValue,
    primaryLabel: t('paymentMethods.type'),
    metadata,
    primaryAction: actions.find(a => a.label === t('paymentMethods.setAsDefault')),
    secondaryActions: actions.filter(a => a.label !== t('paymentMethods.setAsDefault')),
  };
}

/**
 * Helper function to format bank contract display name with bank information
 * Now uses proper PaymentMethod type from Zod schema
 */
function formatBankContractDisplayName(paymentMethod: PaymentMethod, _t: (key: string) => string): string {
  const bankName = getBankName(paymentMethod.bankCode);

  // If we have mobile number, show last 4 digits
  let accountInfo = '';
  if (paymentMethod.contractMobile) {
    const last4 = paymentMethod.contractMobile.slice(-4);
    accountInfo = ` ••••${last4}`;
  }

  return `${bankName}${accountInfo}`;
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
    primaryValue: `${bill.amount.toLocaleString()} تومان • ${isToday
      ? t('time.today')
      : formatBillingDate(dueDate, locale, 'short')}`,
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
 * Bank code to bank name mapping for Iranian banks
 */
const IRANIAN_BANKS: Record<string, string> = {
  '011': 'بانک صنعت و معدن',
  '012': 'بانک ملت',
  '013': 'بانک رفاه کارگران',
  '014': 'بانک مسکن',
  '015': 'بانک سپه',
  '016': 'بانک کشاورزی',
  '017': 'بانک ملی ایران',
  '018': 'بانک تجارت',
  '019': 'بانک صادرات ایران',
  '020': 'بانک توسعه تعاون',
  '021': 'پست بانک ایران',
  '022': 'بانک توسعه صادرات ایران',
  '051': 'موسسه اعتباری توسعه',
  '053': 'بانک کارآفرین',
  '054': 'بانک پارسیان',
  '055': 'بانک اقتصاد نوین',
  '056': 'بانک سامان',
  '057': 'بانک پاسارگاد',
  '058': 'بانک سرمایه',
  '059': 'بانک سینا',
  '060': 'بانک تات',
  '061': 'بانک شهر',
  '062': 'بانک آینده',
  '063': 'بانک انصار',
  '064': 'بانک گردشگری',
  '065': 'بانک حکمت ایرانیان',
  '066': 'بانک دی',
  '069': 'بانک ایران زمین',
  '070': 'بانک رسالت',
  '073': 'بانک کوثر',
  '075': 'بانک مهر اقتصاد',
  '076': 'بانک مور',
  '078': 'بانک مهر ایران',
  '079': 'بانک نور',
  '080': 'بانک مرکزی جمهوری اسلامی ایران',
  '090': 'بانک قوامین',
  '095': 'بانک ایران اروپا',
};

/**
 * Helper function to get bank name from bank code
 */
function getBankName(bankCode?: string | null): string {
  if (!bankCode)
    return 'بانک نامشخص';
  return IRANIAN_BANKS[bankCode] || `بانک ${bankCode}`;
}

/**
 * Helper function to format bank contract display name
 * Updated to handle both PaymentMethod and subscription paymentMethod types
 */
function formatBankContractInfo(paymentMethod: NonNullable<SubscriptionData['paymentMethod']>): string {
  const bankName = getBankName(paymentMethod.bankCode);

  // If contractDisplayName already contains bank info, use it
  if (paymentMethod.contractDisplayName && paymentMethod.contractDisplayName !== 'Direct Debit Contract') {
    return paymentMethod.contractDisplayName;
  }

  // Extract last 4 digits from contract mobile or use default
  let accountInfo = '';
  if (paymentMethod.contractMobile) {
    const last4 = paymentMethod.contractMobile.slice(-4);
    accountInfo = ` - ${last4}`;
  }

  return `${bankName}${accountInfo}`;
}

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
