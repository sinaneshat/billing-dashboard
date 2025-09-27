# Translation Patterns and Guidelines

> 🌍 **SINGLE SOURCE OF TRUTH** for all internationalization (i18n) and translation patterns in the Roundtable Billing Dashboard

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [File Structure](#file-structure)
- [Translation Key Conventions](#translation-key-conventions)
- [Implementation Patterns](#implementation-patterns)
- [Dynamic Content](#dynamic-content)
- [Translation Workflow](#translation-workflow)
- [Quality Assurance](#quality-assurance)
- [Common Patterns](#common-patterns)
- [Anti-Patterns](#anti-patterns)

## Overview

The Roundtable Billing Dashboard supports multiple languages with a focus on English and Farsi (Persian). The translation system is built on `next-intl` and follows strict patterns to ensure consistency, maintainability, and complete coverage of all user-facing text.

### Key Technologies
- **next-intl**: Core internationalization library
- **JSON files**: Translation storage format
- **TypeScript**: Type-safe translation keys
- **RTL Support**: Full right-to-left language support

### Translation Files Location
```
src/i18n/locales/
├── en/
│   └── common.json    # English translations
└── fa/
    └── common.json    # Farsi translations
```

## Core Principles

### 1. No Hardcoded Strings
**NEVER** include hardcoded strings in user-facing components:

```tsx
// ❌ WRONG - Hardcoded string
<Button>Save Changes</Button>

// ✅ CORRECT - Using translation
<Button>{t('actions.save')}</Button>
```

### 2. Consistent Key Naming
Follow hierarchical, semantic naming:

```json
{
  "paymentMethods": {
    "title": "Payment Methods",
    "status": {
      "active": "Active",
      "expired": "Expired"
    }
  }
}
```

### 3. Complete Translation Coverage
Every user-facing string must exist in ALL locale files:
- English (`en/common.json`)
- Farsi (`fa/common.json`)

### 4. Type Safety
Use TypeScript for translation keys to catch errors at compile time.

## File Structure

### Translation File Organization

```json
{
  // Top-level categories
  "common": {},           // Shared, generic terms
  "actions": {},          // Button labels, actions
  "forms": {},            // Form fields, validation
  "errors": {},           // Error messages
  "success": {},          // Success messages
  "status": {},           // Status indicators

  // Feature-specific sections
  "auth": {},             // Authentication
  "billing": {},          // Billing features
  "paymentMethods": {},   // Payment method management
  "subscription": {},     // Subscription management
  "dashboard": {},        // Dashboard specific

  // Component-specific (if needed)
  "components": {
    "navbar": {},
    "footer": {}
  }
}
```

## Translation Key Conventions

### Naming Rules

1. **Use dot notation** for nested structures:
   ```
   paymentMethods.status.active
   ```

2. **Use camelCase** for multi-word keys:
   ```
   maxDailyAmount, contractExpired, usedToday
   ```

3. **Be semantic**, not technical:
   ```json
   // ❌ WRONG
   "btn_save_text": "Save"

   // ✅ CORRECT
   "actions.save": "Save"
   ```

4. **Group related keys**:
   ```json
   {
     "paymentMethods": {
       "status": {
         "active": "Active",
         "expired": "Expired"
       },
       "limits": {
         "daily": "Daily Limit",
         "monthly": "Monthly Limit"
       }
     }
   }
   ```

### Key Categories

| Category | Purpose | Example Keys |
|----------|---------|--------------|
| `actions.*` | User actions, buttons | `actions.save`, `actions.cancel` |
| `forms.*` | Form labels, placeholders | `forms.email`, `forms.required` |
| `errors.*` | Error messages | `errors.networkError`, `errors.invalidInput` |
| `success.*` | Success messages | `success.saved`, `success.deleted` |
| `status.*` | Status indicators | `status.active`, `status.pending` |
| `titles.*` | Page/section titles | `titles.dashboard`, `titles.settings` |
| `descriptions.*` | Explanatory text | `descriptions.featureInfo` |

## Implementation Patterns

### Basic Usage

```tsx
// src/components/example.tsx
import { useTranslations } from 'next-intl';

export function PaymentMethodCard() {
  const t = useTranslations();

  return (
    <div>
      <h2>{t('paymentMethods.title')}</h2>
      <p>{t('paymentMethods.description')}</p>
    </div>
  );
}
```

### With Namespace

```tsx
// Focus on specific translation section
export function BillingSection() {
  const t = useTranslations('billing');

  return <h1>{t('title')}</h1>; // Accesses 'billing.title'
}
```

### Server Components

```tsx
// src/app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations();

  return <h1>{t('dashboard.title')}</h1>;
}
```

## Dynamic Content

### Variable Interpolation

Translation file:
```json
{
  "paymentMethods": {
    "expiresInDays": "Expires in {days} days",
    "welcomeUser": "Welcome, {name}!"
  }
}
```

Usage:
```tsx
const t = useTranslations();

// Simple interpolation
<p>{t('paymentMethods.expiresInDays', { days: 30 })}</p>
// Output: "Expires in 30 days"

// With user data
<h1>{t('welcomeUser', { name: user.name })}</h1>
// Output: "Welcome, John!"
```

### Pluralization

Translation file:
```json
{
  "transactions": {
    "count": {
      "zero": "No transactions",
      "one": "1 transaction",
      "other": "{count} transactions"
    }
  }
}
```

Usage:
```tsx
<p>{t('transactions.count', { count: itemCount })}</p>
```

### Date and Time Formatting

```tsx
import { useFormatter } from 'next-intl';

export function PaymentDate({ date }: { date: Date }) {
  const format = useFormatter();
  const t = useTranslations();

  return (
    <div>
      <span>{t('payment.date')}: </span>
      <span>{format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</span>
    </div>
  );
}
```

### Currency Formatting

```tsx
// Consistent currency formatting across locales
export function formatTomanCurrency(amount: number, locale: string) {
  const formatter = new Intl.NumberFormat(
    locale === 'fa' ? 'fa-IR' : 'en-US',
    {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  );

  return formatter.format(amount);
}
```

## Translation Workflow

### Adding New Translations

1. **Add to English first** (`en/common.json`):
   ```json
   {
     "newFeature": {
       "title": "New Feature",
       "description": "This is a new feature"
     }
   }
   ```

2. **Add to Farsi** (`fa/common.json`):
   ```json
   {
     "newFeature": {
       "title": "ویژگی جدید",
       "description": "این یک ویژگی جدید است"
     }
   }
   ```

3. **Use in component**:
   ```tsx
   const t = useTranslations();
   return <h1>{t('newFeature.title')}</h1>;
   ```

### Validation Commands

```bash
# Check for missing translations
./scripts/check-translations.sh

# Verbose output with suggestions
./scripts/check-translations.sh -v -f

# Run full i18n validation
pnpm i18n:full-check

# Check specific patterns
pnpm i18n:validate        # Structure validation
pnpm i18n:check-unused     # Find unused keys
pnpm i18n:find-hardcoded   # Find hardcoded strings
```

## Quality Assurance

### Pre-commit Checks

The translation system includes automated checks that run before commits:

1. **Structure Validation**: Ensures JSON files are valid
2. **Key Synchronization**: All keys exist in all locales
3. **Hardcoded String Detection**: Finds untranslated text
4. **Naming Convention**: Validates key naming patterns

### Manual Review Checklist

- [ ] All new UI text uses translation keys
- [ ] Keys exist in both English and Farsi files
- [ ] Variable interpolation uses correct syntax
- [ ] RTL languages display correctly
- [ ] Dates/times/currencies format properly
- [ ] Pluralization handles all cases
- [ ] No console warnings about missing translations

## Common Patterns

### Payment Method Status Messages

```tsx
// src/lib/utils/payment-method-utils.ts
export function getUsageStats(
  lastUsedAt: Date | null,
  t: (key: string) => string
): string {
  if (!lastUsedAt) {
    return t('paymentMethods.neverUsed');
  }

  const diffDays = getDaysSince(lastUsedAt);

  if (diffDays === 0) return t('paymentMethods.usedToday');
  if (diffDays === 1) return t('paymentMethods.usedYesterday');
  if (diffDays < 7) {
    return t('paymentMethods.usedDaysAgo', { days: diffDays });
  }

  // ... more conditions
}
```

### Toast Messages

```tsx
// Consistent toast message patterns
import { toastManager } from '@/lib/toast/toast-manager';

// Success
toastManager.success(t('paymentMethods.successMessages.contractSetup'));

// Error with fallback
toastManager.error(
  error?.message || t('paymentMethods.errorMessages.genericError')
);

// With interpolation
toastManager.info(
  t('subscription.upgradeSuccess', { planName: product.name })
);
```

### Form Validation Messages

```tsx
// Validation with translated messages
const schema = z.object({
  email: z.string().email(t('forms.validation.invalidEmail')),
  password: z.string().min(8, t('forms.validation.passwordTooShort')),
});
```

### Conditional Messages

```tsx
// Show different messages based on state
function StatusMessage({ status }: { status: string }) {
  const t = useTranslations();

  const getMessage = () => {
    switch (status) {
      case 'active':
        return t('paymentMethods.status.activeDescription');
      case 'expired':
        return t('paymentMethods.status.expiredDescription');
      default:
        return t('paymentMethods.status.unknownDescription');
    }
  };

  return <p>{getMessage()}</p>;
}
```

## Anti-Patterns

### ❌ Don't Concatenate Translations

```tsx
// WRONG - Breaks in different languages
const message = t('hello') + ' ' + userName + '!';

// CORRECT - Use interpolation
const message = t('hello', { name: userName });
```

### ❌ Don't Use Dynamic Keys Without Fallback

```tsx
// WRONG - May fail if key doesn't exist
const label = t(`status.${dynamicStatus}`);

// CORRECT - Validate and provide fallback
const label = t(`status.${dynamicStatus}` as any, {
  defaultValue: t('status.unknown')
});
```

### ❌ Don't Mix Languages

```tsx
// WRONG - Mixing English and Farsi
return (
  <div>
    {t('paymentMethods.title')}
    <span>({activeCount} active)</span>  {/* Hardcoded! */}
  </div>
);

// CORRECT - Fully translated
return (
  <div>
    {t('paymentMethods.title')}
    <span>({t('paymentMethods.activeCount', { count: activeCount })})</span>
  </div>
);
```

### ❌ Don't Translate Technical Terms

```tsx
// WRONG - Technical IDs shouldn't be translated
t('api.endpoints.getUserById');

// CORRECT - Keep technical terms as constants
const API_ENDPOINTS = {
  GET_USER: '/api/users/:id'
} as const;
```

### ❌ Don't Duplicate Translation Logic

```tsx
// WRONG - Duplicated formatting logic
function Component1() {
  const date = new Date();
  return format(date, 'yyyy-MM-dd');
}

function Component2() {
  const date = new Date();
  return format(date, 'yyyy-MM-dd');
}

// CORRECT - Centralized formatting utility
// src/lib/format/date.ts
export function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale).format(date);
}
```

## RTL Support

### Farsi/Persian Considerations

1. **Text Direction**: Automatically handled by `next-intl`
2. **Number Display**: Use proper Farsi numerals
3. **Date Format**: Persian calendar when appropriate
4. **Currency**: Display as "تومان" not "Toman"

```tsx
// Proper RTL support
export function Price({ amount }: { amount: number }) {
  const locale = useLocale();
  const t = useTranslations();

  const formattedAmount = new Intl.NumberFormat(
    locale === 'fa' ? 'fa-IR' : 'en-US'
  ).format(amount);

  return (
    <span>
      {formattedAmount} {t('currency.toman')}
    </span>
  );
}
```

## Testing Translations

### Unit Tests

```tsx
import { render } from '@testing-library/react';
import { IntlProvider } from 'next-intl';

const messages = {
  'paymentMethods.title': 'Payment Methods'
};

test('renders with translations', () => {
  const { getByText } = render(
    <IntlProvider messages={messages} locale="en">
      <PaymentMethodCard />
    </IntlProvider>
  );

  expect(getByText('Payment Methods')).toBeInTheDocument();
});
```

### E2E Tests

```tsx
// Check both languages in E2E tests
test('displays in correct language', async ({ page }) => {
  // Test English
  await page.goto('/en/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');

  // Test Farsi
  await page.goto('/fa/dashboard');
  await expect(page.locator('h1')).toContainText('داشبورد');
});
```

## Migration Guide

### Converting Hardcoded Strings

1. **Identify hardcoded string**:
   ```tsx
   <Button>Delete Payment Method</Button>
   ```

2. **Add to translation files**:
   ```json
   // en/common.json
   "paymentMethods.delete": "Delete Payment Method"

   // fa/common.json
   "paymentMethods.delete": "حذف روش پرداخت"
   ```

3. **Update component**:
   ```tsx
   <Button>{t('paymentMethods.delete')}</Button>
   ```

4. **Test both languages**:
   - Switch to English: Verify "Delete Payment Method"
   - Switch to Farsi: Verify "حذف روش پرداخت"

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [MDN Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [Persian Language Resources](https://persian.date/)
- Run `./scripts/check-translations.sh -h` for CLI help

---

**Remember**: Every string a user sees must come from a translation file. No exceptions.