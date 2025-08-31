# ZarinPal Billing Dashboard - UI/UX Guidelines

## Overview

This document provides comprehensive UI/UX guidelines for implementing the ZarinPal Billing Dashboard with Persian localization and Iranian banking compliance. All designs should prioritize user confidence, clarity, and cultural appropriateness for Iranian users.

## Design Principles

### 1. Persian-First Design
- **RTL Layout**: All interfaces must support right-to-left reading direction
- **Persian Typography**: Use proper Persian fonts (Vazir, IRANSans, or system Persian fonts)
- **Cultural Appropriateness**: Colors, imagery, and terminology appropriate for Iranian market
- **Number Formatting**: Persian numerals (۰۱۲۳۴۵۶۷۸۹) with proper digit grouping

### 2. Financial Trust & Security
- **Security Badges**: Display ZarinPal security certifications and Shetab network compliance
- **Clear Encryption**: Show encryption indicators during sensitive operations
- **Transparent Pricing**: All costs displayed in both Iranian Rial (IRR) and Toman (TMN)
- **Banking Compliance**: Visual indicators of Iranian Central Bank compliance

### 3. Minimal & Functional
- **Progressive Disclosure**: Show information progressively to avoid overwhelming users
- **Clear Hierarchy**: Use typography and spacing to create clear information hierarchy
- **Actionable Interface**: Every screen should have clear next steps
- **Error Prevention**: Validate inputs in real-time with helpful Persian messages

## Color Palette

### Primary Colors
- **ZarinPal Blue**: `#1E40AF` - Primary actions, trust indicators
- **Success Green**: `#059669` - Successful payments, verified status
- **Warning Amber**: `#D97706` - Pending actions, expiration warnings
- **Error Red**: `#DC2626` - Failed payments, critical issues
- **Persian Accent**: `#7C3AED` - Cultural accent color for Persian UI elements

### Neutral Colors
- **Text Primary**: `#111827` - Main text content
- **Text Secondary**: `#6B7280` - Supporting text, metadata
- **Background**: `#F9FAFB` - Page backgrounds
- **Surface**: `#FFFFFF` - Card backgrounds, form areas
- **Border**: `#E5E7EB` - Subtle borders, dividers

## Typography Scale

### Persian Font Stack
```css
font-family: 'Vazir', 'IRANSans', 'Tahoma', sans-serif;
```

### Type Scale
- **Display**: 36px/44px - Page headers, plan pricing
- **Heading 1**: 30px/36px - Section headers
- **Heading 2**: 24px/32px - Subsection headers  
- **Heading 3**: 20px/28px - Card headers, form sections
- **Body Large**: 18px/28px - Important body text, CTAs
- **Body**: 16px/24px - Standard body text
- **Body Small**: 14px/20px - Supporting text, metadata
- **Caption**: 12px/16px - Fine print, disclaimers

## Component Library

### 1. Payment Method Card
**Purpose**: Display saved payment methods with Iranian bank branding

**Visual Elements**:
- Bank logo/name in Persian
- Masked card number (last 4 digits)
- Card type (Visa, MasterCard) with Persian labels
- Verification status indicator
- Primary payment method badge

**Interactions**:
- Edit payment method
- Remove with confirmation
- Set as primary
- View verification status

### 2. Subscription Plan Card
**Purpose**: Display subscription plans with clear Iranian pricing

**Visual Elements**:
- Plan name in Persian
- Monthly price in IRR and TMN
- Feature list with Persian descriptions
- Popular plan badge
- Current plan indicator

**Interactions**:
- Select plan
- Compare features
- Upgrade/downgrade
- View plan details

### 3. Transaction History Row
**Purpose**: Display transaction information with Persian formatting

**Visual Elements**:
- Persian date formatting
- Transaction amount in IRR/TMN
- Payment status with color coding
- ZarinPal reference number
- Receipt download link

**Interactions**:
- View transaction details
- Download receipt
- Retry failed payment
- Contact support

### 4. Status Indicators
**Purpose**: Clear visual feedback for various states

**Status Types**:
- **Verified**: Green checkmark with "تأیید شده"
- **Pending**: Amber clock with "در انتظار"
- **Failed**: Red X with "ناموفق"
- **Expired**: Gray warning with "منقضی شده"

## Form Design Guidelines

### 1. Payment Method Addition Form
**Layout**: Single column, progressive disclosure
**Validation**: Real-time with Persian error messages
**Security**: Show encryption indicators during input

**Required Fields**:
- Card number (Iranian bank card format)
- Expiry date (Persian calendar option)
- Cardholder name (Persian characters support)
- Security code (with security explanation)

**Error Messages** (Persian):
- "شماره کارت وارد شده معتبر نیست" - Invalid card number
- "تاریخ انقضا باید در آینده باشد" - Expiry date must be in future
- "نام دارنده کارت الزامی است" - Cardholder name is required

### 2. Plan Selection Form
**Layout**: Comparison table on desktop, cards on mobile
**Pricing**: Prominent display of IRR/TMN with conversion
**Features**: Expandable feature comparison

### 3. Cancellation Form
**Layout**: Multi-step with retention attempts
**Feedback**: Optional reason selection with Persian options
**Confirmation**: Clear consequence explanation

## Iranian Banking Integration

### ZarinPal Integration Best Practices

#### 1. Direct Debit Authorization
**Reference**: [ZarinPal Direct Debit Documentation](https://www.zarinpal.com/docs/directDebit/)

**UI Flow**:
1. **Card Information Collection**: Secure form with validation
2. **Authorization Request**: Show ZarinPal security badges
3. **Bank Redirect**: Clear explanation of bank authorization process
4. **Confirmation**: Success indication with Persian confirmation message

**Code Example**:
```typescript
// Initialize Direct Debit authorization
const initializeDirectDebit = async (cardData: CardInfo) => {
  const response = await zarinpal.directDebit.authorize({
    merchant_id: process.env.ZARINPAL_MERCHANT_ID,
    amount: subscriptionPlan.monthlyAmount,
    description: `اشتراک ${subscriptionPlan.namePersian}`,
    callback_url: `${process.env.APP_URL}/billing/payment/callback`,
    metadata: {
      user_id: user.id,
      plan_id: subscriptionPlan.id
    }
  });
  
  // Redirect user to ZarinPal authorization
  window.location.href = response.data.authority;
};
```

#### 2. Payment Processing
**Reference**: [ZarinPal Payment Gateway](https://www.zarinpal.com/docs/paymentGateway/)

**UI Considerations**:
- Show processing state during payment
- Handle Iranian internet connectivity issues
- Provide clear error messages in Persian
- Offer retry options for failed payments

#### 3. Webhook Handling
**Reference**: [ZarinPal Webhooks](https://www.zarinpal.com/docs/webhooks/)

**Status Updates**:
```typescript
const handlePaymentWebhook = (webhookData: ZarinPalWebhook) => {
  switch (webhookData.status) {
    case 'OK':
      updatePaymentStatus('success', 'پرداخت با موفقیت انجام شد');
      break;
    case 'NOK':
      updatePaymentStatus('failed', 'پرداخت ناموفق بود');
      break;
    case 'PENDING':
      updatePaymentStatus('pending', 'پرداخت در حال پردازش است');
      break;
  }
};
```

## Mobile-First Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

### Mobile Optimizations
- **Touch Targets**: Minimum 44px tap targets
- **Card Stack**: Single column layout for plan comparison
- **Payment Forms**: Simplified single-field focus
- **Persian Text**: Optimized line height for Persian text on small screens

## Accessibility Guidelines

### Persian RTL Support
- **Text Direction**: `dir="rtl"` on Persian content
- **Layout Mirroring**: Icons and navigation elements properly mirrored
- **Form Labels**: Proper association with RTL form fields

### Screen Reader Support
- **Alt Text**: Persian alt text for images and icons
- **ARIA Labels**: Persian ARIA labels for interactive elements
- **Form Validation**: Accessible error announcements in Persian

## Error Handling & Edge Cases

### Payment Failures
**Iranian Banking Context**: Handle Shetab network issues gracefully

**Error Messages** (Persian):
- "اتصال به شبکه بانکی قطع شده است" - Banking network disconnected
- "کارت شما مسدود است" - Your card is blocked
- "موجودی کافی نیست" - Insufficient balance
- "تراکنش توسط بانک رد شده است" - Transaction rejected by bank

### Network Issues
- **Offline State**: Show offline indicator with Persian message
- **Slow Connection**: Loading states with Persian descriptions
- **Timeout Handling**: Clear timeout messages with retry options

## Performance Considerations

### Persian Font Loading
```css
@font-face {
  font-family: 'Vazir';
  src: url('/fonts/Vazir.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0600-06FF; /* Persian/Arabic Unicode range */
}
```

### Image Optimization
- **Bank Logos**: Optimized SVG formats for Iranian bank logos
- **Icons**: RTL-compatible icon sets
- **Illustrations**: Culturally appropriate graphics for Iranian users

## Testing Guidelines

### Persian Localization Testing
- **Text Expansion**: Persian text typically 20-30% longer than English
- **RTL Layout**: Test all components in RTL mode
- **Date Formatting**: Verify Persian calendar integration
- **Number Formatting**: Ensure proper Persian numeral display

### Cross-Browser Testing
- **Iranian ISP Issues**: Test with Iranian proxy services
- **Mobile Browsers**: Focus on popular Iranian mobile browsers
- **Banking Integration**: Test with various Iranian bank cards

### User Acceptance Testing
- **Native Speakers**: Persian-speaking user testing
- **Banking Scenarios**: Real Iranian banking workflow testing
- **Cultural Appropriateness**: Feedback on cultural elements

## Implementation Checklist

### Phase 1: Foundation
- [ ] Persian font loading and RTL CSS setup
- [ ] ZarinPal API client with sandbox testing
- [ ] Basic payment method storage and encryption
- [ ] Persian localization files with financial terminology

### Phase 2: Core Features  
- [ ] Payment method addition with Iranian bank validation
- [ ] Subscription plan comparison with IRR/TMN pricing
- [ ] Direct Debit authorization flow
- [ ] Basic billing history display

### Phase 3: Advanced Features
- [ ] Plan upgrade/downgrade with prorated billing
- [ ] Advanced transaction filtering and search
- [ ] Receipt generation with Persian templates
- [ ] Automated retry logic for failed payments

### Phase 4: Polish & Testing
- [ ] Comprehensive Persian localization review
- [ ] Iranian banking compliance verification
- [ ] Performance optimization for Iranian network conditions
- [ ] User acceptance testing with Iranian users

This comprehensive UI/UX guideline ensures proper implementation of the ZarinPal Billing Dashboard with full Persian support and Iranian banking compliance.