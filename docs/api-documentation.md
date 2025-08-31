# Billing API Documentation

## Overview

Complete API documentation for the ZarinPal Billing Dashboard, including endpoints, request/response schemas, error handling, and integration patterns.

## Base Configuration

### Environment Variables
```bash
# ZarinPal Configuration
ZARINPAL_MERCHANT_ID=your-merchant-id
ZARINPAL_SANDBOX_MERCHANT_ID=your-sandbox-merchant-id
ZARINPAL_WEBHOOK_SECRET=your-webhook-secret

# Application URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BILLING_CALLBACK_URL=https://yourdomain.com/billing/callback

# Database
DATABASE_URL=your-cloudflare-d1-url

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Base API Path
All billing endpoints are prefixed with `/api/v1/billing`

## Authentication

All endpoints require user authentication via Better Auth session. Include the session cookie in requests.

```typescript
// Example authenticated request
const response = await fetch('/api/v1/billing/subscriptions', {
  headers: {
    'Cookie': 'better-auth.session_token=your-session-token'
  }
});
```

## 1. Subscription Plans API

### GET `/api/v1/billing/plans`
Get all available subscription plans.

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
interface PlanResponse {
  success: true;
  data: {
    id: string;
    name_english: string;
    name_persian: string;
    price_irr: number;        // Price in Iranian Rial
    price_tmn: number;        // Price in Toman
    features: string[];       // English features
    features_persian: string[]; // Persian features
    recommended: boolean;
    sort_order: number;
  }[];
}

// Example Response
{
  "success": true,
  "data": [
    {
      "id": "plan_basic_001",
      "name_english": "Basic",
      "name_persian": "پایه",
      "price_irr": 500000,
      "price_tmn": 50000,
      "features": ["24/7 Support", "Basic Analytics"],
      "features_persian": ["پشتیبانی 24/7", "تحلیل‌های پایه"],
      "recommended": false,
      "sort_order": 1
    },
    {
      "id": "plan_gold_001",
      "name_english": "Gold",
      "name_persian": "طلایی",
      "price_irr": 2000000,
      "price_tmn": 200000,
      "features": ["Everything in Basic", "Advanced Analytics", "Priority Support"],
      "features_persian": ["همه‌چیز در بسته پایه", "تحلیل‌های پیشرفته", "پشتیبانی اولویت‌دار"],
      "recommended": true,
      "sort_order": 2
    }
  ]
}
```

## 2. Subscription Management API

### GET `/api/v1/billing/subscription`
Get current user's subscription details.

**Response:**
```typescript
interface SubscriptionResponse {
  success: true;
  data: {
    id: string;
    user_id: string;
    plan: {
      id: string;
      name_english: string;
      name_persian: string;
      price_irr: number;
      price_tmn: number;
    };
    status: 'active' | 'payment_failed' | 'cancelled' | 'suspended';
    current_period_start: string; // ISO date
    current_period_end: string;   // ISO date
    cancel_at_period_end: boolean;
    cancelled_at: string | null;
  };
}

// Example Response
{
  "success": true,
  "data": {
    "id": "sub_abc123",
    "user_id": "user_xyz789",
    "plan": {
      "id": "plan_gold_001",
      "name_english": "Gold",
      "name_persian": "طلایی",
      "price_irr": 2000000,
      "price_tmn": 200000
    },
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "cancelled_at": null
  }
}
```

### POST `/api/v1/billing/subscription/create`
Create a new subscription.

**Request:**
```typescript
interface CreateSubscriptionRequest {
  plan_id: string;
  payment_method_id?: string; // If user has stored payment methods
}

// Example Request
{
  "plan_id": "plan_gold_001",
  "payment_method_id": "pm_abc123" // Optional
}
```

**Response:**
```typescript
interface CreateSubscriptionResponse {
  success: true;
  data: {
    subscription_id: string;
    payment_required: boolean;
    payment_url?: string;      // If payment is required
    authority?: string;        // ZarinPal authority for tracking
  };
}

// Example Response - Payment Required
{
  "success": true,
  "data": {
    "subscription_id": "sub_new123",
    "payment_required": true,
    "payment_url": "https://sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789",
    "authority": "A00000000000000000000000000123456789"
  }
}
```

### PUT `/api/v1/billing/subscription/change-plan`
Change subscription plan (upgrade/downgrade).

**Request:**
```typescript
interface ChangePlanRequest {
  new_plan_id: string;
  effective_date: 'immediate' | 'next_billing_cycle';
}

// Example Request
{
  "new_plan_id": "plan_premium_001",
  "effective_date": "immediate"
}
```

**Response:**
```typescript
interface ChangePlanResponse {
  success: true;
  data: {
    subscription_id: string;
    billing_preview: {
      current_plan: PlanInfo;
      new_plan: PlanInfo;
      prorated_credit: number;   // Credit from current plan in TMN
      additional_charge: number; // Additional charge in TMN
      net_amount: number;       // Net amount to charge/credit in TMN
      effective_date: string;   // ISO date
      next_billing_date: string; // ISO date
    };
    payment_required: boolean;
    payment_url?: string;
  };
}

// Example Response
{
  "success": true,
  "data": {
    "subscription_id": "sub_abc123",
    "billing_preview": {
      "current_plan": {
        "name_persian": "طلایی",
        "price_tmn": 200000
      },
      "new_plan": {
        "name_persian": "پلاتین",
        "price_tmn": 500000
      },
      "prorated_credit": 150000,
      "additional_charge": 500000,
      "net_amount": 350000,
      "effective_date": "2024-01-15T00:00:00Z",
      "next_billing_date": "2024-02-01T00:00:00Z"
    },
    "payment_required": true,
    "payment_url": "https://sandbox.zarinpal.com/pg/StartPay/..."
  }
}
```

### DELETE `/api/v1/billing/subscription/cancel`
Cancel current subscription.

**Request:**
```typescript
interface CancelSubscriptionRequest {
  reason?: string;
  feedback?: string;
  cancel_immediately: boolean; // true = cancel now, false = cancel at period end
}

// Example Request
{
  "reason": "too_expensive",
  "feedback": "قیمت برای من مناسب نیست",
  "cancel_immediately": false
}
```

**Response:**
```typescript
interface CancelSubscriptionResponse {
  success: true;
  data: {
    subscription_id: string;
    cancelled_at: string;      // ISO date
    service_ends_at: string;   // ISO date when service stops
    retention_offer?: {
      type: 'discount' | 'downgrade';
      discount_percentage?: number;
      new_plan_id?: string;
      duration_months: number;
      offer_expires_at: string; // ISO date
      message_persian: string;
    };
  };
}

// Example Response with Retention Offer
{
  "success": true,
  "data": {
    "subscription_id": "sub_abc123",
    "cancelled_at": "2024-01-15T10:30:00Z",
    "service_ends_at": "2024-02-01T00:00:00Z",
    "retention_offer": {
      "type": "discount",
      "discount_percentage": 25,
      "duration_months": 3,
      "offer_expires_at": "2024-01-22T00:00:00Z",
      "message_persian": "پیشنهاد ویژه: ۲۵% تخفیف برای ۳ ماه آینده!"
    }
  }
}
```

## 3. Payment Methods API

### GET `/api/v1/billing/payment-methods`
Get user's stored payment methods.

**Response:**
```typescript
interface PaymentMethodsResponse {
  success: true;
  data: {
    id: string;
    card_pan: string;           // Last 4 digits: "1234"
    bank_name_persian: string;  // "بانک تجارت"
    is_primary: boolean;
    is_active: boolean;
    verification_status: 'verified' | 'pending' | 'failed' | 'expired';
    expires_at: string | null;  // Card expiry date
    created_at: string;
  }[];
}

// Example Response
{
  "success": true,
  "data": [
    {
      "id": "pm_abc123",
      "card_pan": "1234",
      "bank_name_persian": "بانک تجارت",
      "is_primary": true,
      "is_active": true,
      "verification_status": "verified",
      "expires_at": "2025-12-31",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/v1/billing/payment-methods/add`
Add a new payment method via Direct Debit.

**Request:**
```typescript
interface AddPaymentMethodRequest {
  verification_amount?: number; // Amount in TMN for verification (default: 1000)
  return_url?: string;         // URL to return after bank authorization
}

// Example Request
{
  "verification_amount": 1000,
  "return_url": "https://yourdomain.com/billing/payment-methods"
}
```

**Response:**
```typescript
interface AddPaymentMethodResponse {
  success: true;
  data: {
    authorization_url: string;  // Redirect user to this URL
    authority: string;         // ZarinPal authority for tracking
    expires_at: string;        // Authorization expiry
    message_persian: string;
  };
}

// Example Response
{
  "success": true,
  "data": {
    "authorization_url": "https://sandbox.zarinpal.com/pg/StartPay/.../directdebit",
    "authority": "A00000000000000000000000000123456789",
    "expires_at": "2024-01-15T11:30:00Z",
    "message_persian": "در حال انتقال به صفحه تأیید بانک..."
  }
}
```

### PUT `/api/v1/billing/payment-methods/:id/primary`
Set a payment method as primary.

**Response:**
```typescript
interface SetPrimaryResponse {
  success: true;
  data: {
    payment_method_id: string;
    message_persian: string;
  };
}

// Example Response
{
  "success": true,
  "data": {
    "payment_method_id": "pm_abc123",
    "message_persian": "روش پرداخت اصلی با موفقیت تغییر کرد"
  }
}
```

### DELETE `/api/v1/billing/payment-methods/:id`
Remove a payment method.

**Response:**
```typescript
interface RemovePaymentMethodResponse {
  success: true;
  data: {
    removed_payment_method_id: string;
    message_persian: string;
    warnings?: string[]; // If method is used for active subscriptions
  };
}

// Example Response
{
  "success": true,
  "data": {
    "removed_payment_method_id": "pm_abc123",
    "message_persian": "روش پرداخت با موفقیت حذف شد"
  }
}
```

## 4. Payment Processing API

### POST `/api/v1/billing/payments/initialize`
Initialize a payment (for subscriptions, upgrades, etc.).

**Request:**
```typescript
interface InitializePaymentRequest {
  amount_tmn: number;
  description: string;
  payment_type: 'subscription' | 'upgrade' | 'manual';
  metadata?: Record<string, any>;
  return_url?: string;
}

// Example Request
{
  "amount_tmn": 200000,
  "description": "پرداخت اشتراک ماهانه",
  "payment_type": "subscription",
  "metadata": {
    "subscription_id": "sub_abc123",
    "plan_id": "plan_gold_001"
  },
  "return_url": "https://yourdomain.com/billing/success"
}
```

**Response:**
```typescript
interface InitializePaymentResponse {
  success: true;
  data: {
    payment_id: string;
    authority: string;
    payment_url: string;
    expires_at: string;
    amount_tmn: number;
    amount_irr: number;
  };
}

// Example Response
{
  "success": true,
  "data": {
    "payment_id": "pay_xyz789",
    "authority": "A00000000000000000000000000123456789",
    "payment_url": "https://sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789",
    "expires_at": "2024-01-15T11:30:00Z",
    "amount_tmn": 200000,
    "amount_irr": 2000000
  }
}
```

### POST `/api/v1/billing/payments/verify`
Verify payment after ZarinPal callback.

**Request:**
```typescript
interface VerifyPaymentRequest {
  authority: string;
  status: 'OK' | 'NOK';
}

// Example Request
{
  "authority": "A00000000000000000000000000123456789",
  "status": "OK"
}
```

**Response:**
```typescript
interface VerifyPaymentResponse {
  success: boolean;
  data?: {
    payment_id: string;
    ref_id: string;           // ZarinPal reference ID
    card_pan: string;         // Last 4 digits of card used
    amount_tmn: number;
    amount_irr: number;
    verified_at: string;
    message_persian: string;
  };
  error?: string;
  error_persian?: string;
}

// Example Success Response
{
  "success": true,
  "data": {
    "payment_id": "pay_xyz789",
    "ref_id": "123456789",
    "card_pan": "1234",
    "amount_tmn": 200000,
    "amount_irr": 2000000,
    "verified_at": "2024-01-15T10:45:00Z",
    "message_persian": "پرداخت با موفقیت انجام شد"
  }
}

// Example Error Response
{
  "success": false,
  "error": "Payment verification failed",
  "error_persian": "تأیید پرداخت ناموفق بود"
}
```

## 5. Billing History API

### GET `/api/v1/billing/history`
Get user's billing history with optional filtering.

**Query Parameters:**
```typescript
interface HistoryQueryParams {
  page?: number;              // Default: 1
  limit?: number;             // Default: 20, Max: 100
  status?: 'success' | 'failed' | 'pending' | 'cancelled';
  date_from?: string;         // ISO date
  date_to?: string;           // ISO date
  amount_min?: number;        // Minimum amount in TMN
  amount_max?: number;        // Maximum amount in TMN
}
```

**Example Request:**
```
GET /api/v1/billing/history?page=1&limit=10&status=success&date_from=2024-01-01
```

**Response:**
```typescript
interface BillingHistoryResponse {
  success: true;
  data: {
    transactions: {
      id: string;
      zarinpal_ref_id: string;
      amount_tmn: number;
      amount_irr: number;
      status: 'success' | 'failed' | 'pending' | 'cancelled';
      description: string;
      created_at: string;
      processed_at: string | null;
      payment_method: {
        card_pan: string;
        bank_name_persian: string;
      };
    }[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_count: number;
      per_page: number;
    };
    summary: {
      total_paid_tmn: number;
      total_transactions: number;
      successful_transactions: number;
      failed_transactions: number;
    };
  };
}

// Example Response
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "zarinpal_ref_id": "123456789",
        "amount_tmn": 200000,
        "amount_irr": 2000000,
        "status": "success",
        "description": "پرداخت اشتراک ماهانه",
        "created_at": "2024-01-15T10:30:00Z",
        "processed_at": "2024-01-15T10:45:00Z",
        "payment_method": {
          "card_pan": "1234",
          "bank_name_persian": "بانک تجارت"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25,
      "per_page": 10
    },
    "summary": {
      "total_paid_tmn": 1500000,
      "total_transactions": 8,
      "successful_transactions": 7,
      "failed_transactions": 1
    }
  }
}
```

### GET `/api/v1/billing/receipts/:transaction_id`
Download receipt for a specific transaction.

**Response:**
```typescript
// Returns PDF file
Content-Type: application/pdf
Content-Disposition: attachment; filename="receipt-123456789.pdf"
```

## 6. Webhook API

### POST `/api/webhooks/zarinpal`
ZarinPal webhook endpoint for payment notifications.

**Security:**
- Verify webhook signature using ZARINPAL_WEBHOOK_SECRET
- IP whitelist: ZarinPal webhook IPs only

**Request Headers:**
```
X-ZarinPal-Signature: sha256=webhook-signature
Content-Type: application/json
```

**Request Body:**
```typescript
interface ZarinPalWebhookPayload {
  merchant_id: string;
  authority: string;
  status: string;
  ref_id?: string;
  amount: number;
  fee?: number;
  card_pan?: string;
  timestamp: string;
}

// Example Webhook Payload
{
  "merchant_id": "your-merchant-id",
  "authority": "A00000000000000000000000000123456789",
  "status": "OK",
  "ref_id": "123456789",
  "amount": 2000000,
  "fee": 20000,
  "card_pan": "1234",
  "timestamp": "2024-01-15T10:45:00Z"
}
```

**Response:**
```typescript
interface WebhookResponse {
  received: boolean;
  message?: string;
}

// Example Response
{
  "received": true,
  "message": "Webhook processed successfully"
}
```

## 7. Error Responses

All API endpoints follow a consistent error response format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;              // English error message
  error_persian: string;      // Persian error message
  error_code?: string;        // Specific error code
  details?: any;              // Additional error details
  user_action?: string;       // Suggested action for user
}

// Example Error Response
{
  "success": false,
  "error": "Insufficient balance",
  "error_persian": "موجودی حساب کافی نیست",
  "error_code": "INSUFFICIENT_BALANCE",
  "user_action": "لطفاً حساب خود را شارژ کنید یا از کارت دیگری استفاده کنید"
}
```

### Common HTTP Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate subscription)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: ZarinPal API unavailable
- `503 Service Unavailable`: Maintenance mode

## 8. Rate Limits

API endpoints have the following rate limits:

- **Payment endpoints**: 10 requests per minute per user
- **Subscription management**: 20 requests per minute per user
- **Billing history**: 100 requests per minute per user
- **Payment methods**: 5 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1642678800
```

## 9. SDK Example

```typescript
// TypeScript SDK usage example
import { BillingSDK } from '@/lib/billing-sdk';

const billing = new BillingSDK();

// Get subscription plans
const plans = await billing.getPlans();

// Create subscription
const subscription = await billing.createSubscription({
  plan_id: 'plan_gold_001'
});

// Add payment method
const paymentMethod = await billing.addPaymentMethod();
// User will be redirected to bank authorization

// Get billing history
const history = await billing.getBillingHistory({
  page: 1,
  limit: 10,
  status: 'success'
});
```

This comprehensive API documentation provides complete integration guidance for the ZarinPal Billing Dashboard with proper Persian localization and Iranian banking compliance.