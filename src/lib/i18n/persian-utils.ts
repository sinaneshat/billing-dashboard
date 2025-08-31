/**
 * Persian/RTL Localization Utilities
 * Basic Persian formatting and RTL support utilities
 */

// Persian number mapping
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert English digits to Persian digits
 */
export function toPersianDigits(str: string): string {
  return str.replace(/\d/g, d => persianDigits[Number.parseInt(d)] || d);
}

/**
 * Convert Persian digits to English digits
 */
export function toEnglishDigits(str: string): string {
  let result = str;

  // Convert Persian digits
  persianDigits.forEach((persian, index) => {
    const regex = new RegExp(persian, 'g');
    result = result.replace(regex, index.toString());
  });

  // Convert Arabic digits
  arabicDigits.forEach((arabic, index) => {
    const regex = new RegExp(arabic, 'g');
    result = result.replace(regex, index.toString());
  });

  return result;
}

/**
 * Format currency in Persian style
 */
export function formatPersianCurrency(amount: number, currency: string = 'IRR'): string {
  const formatted = new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return toPersianDigits(formatted);
}

/**
 * Format currency in Toman (divide by 10)
 */
export function formatTomanCurrency(amount: number): string {
  const tomanAmount = amount / 10;
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tomanAmount);

  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Format date in Persian (Jalali calendar would require additional library)
 */
export function formatPersianDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  const formatted = new Intl.DateTimeFormat('fa-IR', defaultOptions).format(new Date(dateString));
  return toPersianDigits(formatted);
}

/**
 * Format date and time in Persian
 */
export function formatPersianDateTime(dateString: string): string {
  const formatted = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

  return toPersianDigits(formatted);
}

/**
 * Persian translations for common billing terms
 */
export const persianTranslations = {
  // Status translations
  status: {
    active: 'فعال',
    canceled: 'لغو شده',
    expired: 'منقضی شده',
    pending: 'در انتظار',
    completed: 'تکمیل شده',
    failed: 'ناموفق',
    refunded: 'برگشت خورده',
  },

  // Billing terms
  billing: {
    subscription: 'اشتراک',
    subscriptions: 'اشتراک‌ها',
    payment: 'پرداخت',
    payments: 'پرداخت‌ها',
    paymentHistory: 'تاریخچه پرداخت‌ها',
    paymentMethods: 'روش‌های پرداخت',
    billing: 'صورتحساب',
    billingHistory: 'تاریخچه صورتحساب',
    overview: 'نمای کلی',
    currentSubscription: 'اشتراک فعلی',
    recentPayments: 'آخرین پرداخت‌ها',
    availablePlans: 'طرح‌های موجود',
    chooseYourPlan: 'طرح خود را انتخاب کنید',
    subscribeNow: 'همین حالا مشترک شوید',
    cancelSubscription: 'لغو اشتراک',
    reactivateSubscription: 'فعال‌سازی مجدد اشتراک',
    automaticPayment: 'پرداخت خودکار',
    nextBilling: 'صورتحساب بعدی',
    currentPrice: 'قیمت فعلی',
    startDate: 'تاریخ شروع',
    monthly: 'ماهانه',
    yearly: 'سالانه',
    oneTime: 'یک‌بار',
  },

  // Common actions
  actions: {
    cancel: 'لغو',
    confirm: 'تایید',
    save: 'ذخیره',
    edit: 'ویرایش',
    delete: 'حذف',
    add: 'افزودن',
    view: 'مشاهده',
    download: 'دانلود',
    subscribe: 'مشترک شدن',
    unsubscribe: 'لغو اشتراک',
    upgrade: 'ارتقاء',
    downgrade: 'کاهش سطح',
    tryAgain: 'تلاش مجدد',
    loading: 'در حال بارگیری...',
    loadingPayments: 'در حال بارگیری پرداخت‌ها...',
    loadingSubscriptions: 'در حال بارگیری اشتراک‌ها...',
  },

  // Error messages
  errors: {
    general: 'خطایی رخ داده است',
    networkError: 'خطا در ارتباط با سرور',
    paymentFailed: 'پرداخت ناموفق بود',
    subscriptionNotFound: 'اشتراک یافت نشد',
    unauthorizedAccess: 'دسترسی غیرمجاز',
    invalidData: 'داده‌های نامعتبر',
  },

  // Success messages
  success: {
    paymentSuccessful: 'پرداخت با موفقیت انجام شد',
    subscriptionCanceled: 'اشتراک با موفقیت لغو شد',
    subscriptionCreated: 'اشتراک با موفقیت ایجاد شد',
    settingsUpdated: 'تنظیمات به‌روزرسانی شد',
  },
};

/**
 * Get Persian translation for a key path
 */
export function getPersianTranslation(keyPath: string): string {
  const keys = keyPath.split('.');
  let current: Record<string, unknown> = persianTranslations;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key] as Record<string, unknown>;
    } else {
      return keyPath; // Return the key if translation not found
    }
  }

  return typeof current === 'string' ? current : keyPath;
}

/**
 * Simple translation function
 */
export function t(key: string): string {
  return getPersianTranslation(key);
}

/**
 * Check if the current locale is RTL
 */
export function isRTL(): boolean {
  // For now, we'll assume Persian is always RTL
  // In a real implementation, this would check the current locale
  return true;
}

/**
 * Get RTL-aware CSS classes
 */
export function getRTLClasses(baseClasses: string): string {
  if (!isRTL()) {
    return baseClasses;
  }

  // Add RTL-specific classes
  const rtlClasses = baseClasses
    .replace(/text-left/g, 'text-right')
    .replace(/text-right/g, 'text-left')
    .replace(/ml-/g, 'temp-mr-')
    .replace(/mr-/g, 'ml-')
    .replace(/temp-mr-/g, 'mr-')
    .replace(/pl-/g, 'temp-pr-')
    .replace(/pr-/g, 'pl-')
    .replace(/temp-pr-/g, 'pr-')
    .replace(/left-/g, 'temp-right-')
    .replace(/right-/g, 'left-')
    .replace(/temp-right-/g, 'right-')
    .replace(/border-l-/g, 'temp-border-r-')
    .replace(/border-r-/g, 'border-l-')
    .replace(/temp-border-r-/g, 'border-r-')
    .replace(/rounded-l-/g, 'temp-rounded-r-')
    .replace(/rounded-r-/g, 'rounded-l-')
    .replace(/temp-rounded-r-/g, 'rounded-r-');

  return rtlClasses;
}

/**
 * RTL-aware className utility
 */
export function rtlClass(classes: string): string {
  return getRTLClasses(classes);
}
