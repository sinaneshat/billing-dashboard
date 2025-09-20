# Roundtable Integration Guide

This document explains how the ZarinPal billing dashboard integrates with the Roundtable application to enable Iranian users to purchase Roundtable subscriptions using ZarinPal payment gateway.

## Architecture Overview

```
ZarinPal Payment → Billing Dashboard → Roundtable
    (IRR)              (Convert)        (Activate)
```

1. **ZarinPal**: Iranian payment gateway for processing IRR payments
2. **Billing Dashboard**: Converts ZarinPal events to Stripe-compatible format
3. **Roundtable**: Receives Stripe-compatible webhooks and activates user plans

## Integration Components

### 1. Billing Dashboard (This Project)

**Webhook Handler**: `src/api/routes/webhooks/handler.ts`
- Receives ZarinPal webhook events
- Converts them to Stripe-compatible format
- Forwards to Roundtable via `RoundtableWebhookForwarder`

**Key Features**:
- `WebhookEventBuilders.createPaymentSucceededEvent()` - Creates Stripe payment_intent.succeeded events
- `WebhookEventBuilders.createSubscriptionUpdatedEvent()` - Creates Stripe subscription events
- `RoundtableWebhookForwarder.forwardEvent()` - Sends events to Roundtable
- Virtual Stripe customer IDs for compatibility

### 2. Roundtable Project

**Webhook Handler**: `supabase/functions/billing-webhook/index.ts`
- Dedicated endpoint for billing dashboard webhooks
- Signature verification using shared secret
- User mapping via email addresses
- Plan activation and management

**Database Schema**:
- `plans` table with `roundtable_product_id` mapping
- `user_plans` table with billing dashboard tracking fields
- Database functions for plan management

## Setup Instructions

### Step 1: Configure Billing Dashboard

1. **Environment Variables** (`.env`):
```bash
# Roundtable webhook endpoint
NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/billing-webhook
WEBHOOK_SECRET=your-shared-secret-key

# ZarinPal credentials
NEXT_PUBLIC_ZARINPAL_MERCHANT_ID=your-merchant-id
ZARINPAL_ACCESS_TOKEN=your-access-token
```

2. **Product Configuration**:
Products in the billing dashboard should include `roundtableId` in their metadata:
```typescript
{
  "roundtableId": "roundtable-pro", // Maps to Roundtable plan
  "roundtable_plan_name": "Pro"     // Display name
}
```

### Step 2: Configure Roundtable

1. **Environment Variables**:
```bash
# Billing dashboard integration
BILLING_WEBHOOK_SECRET=your-shared-secret-key  # Same as billing dashboard
```

2. **Deploy Database Migration**:
```bash
# Run the billing integration migration
supabase db push
```

3. **Deploy Webhook Function**:
```bash
# Deploy the billing webhook function
supabase functions deploy billing-webhook
```

4. **Configure Plans**:
Update plans with Roundtable product IDs:
```sql
UPDATE plans SET
  roundtable_product_id = 'roundtable-pro',
  payment_provider = 'billing-dashboard'
WHERE name = 'Pro';
```

### Step 3: User Registration Flow

1. **User Registration**: Users register on both platforms with the same email
2. **Payment**: Users purchase through billing dashboard (ZarinPal)
3. **Webhook**: Billing dashboard sends webhook to Roundtable
4. **Activation**: Roundtable activates plan for user automatically

## Webhook Event Flow

### Payment Success Flow

1. **ZarinPal Webhook** → Billing Dashboard:
```json
{
  "authority": "A00000000000000000000000000123456789",
  "status": "OK",
  "ref_id": "123456789"
}
```

2. **Billing Dashboard** → Roundtable:
```json
{
  "id": "evt_...",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "payment_id",
      "customer": "cus_virtual_customer_id",
      "amount": 500000,
      "currency": "irr",
      "metadata": {
        "userEmail": "user@example.com",
        "roundtableProductId": "roundtable-pro",
        "billingUserId": "user_123",
        "subscriptionId": "sub_123"
      }
    }
  }
}
```

3. **Roundtable Processing**:
   - Finds user by email
   - Maps product ID to internal plan
   - Deactivates old plans
   - Activates new plan

## Testing the Integration

### Test Environment Setup

1. **Billing Dashboard**:
```bash
# Start local development
pnpm preview

# Test webhook endpoint
curl -X POST http://localhost:3000/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-project.supabase.co/functions/v1/billing-webhook"}'
```

2. **Roundtable**:
```bash
# Test billing webhook endpoint
curl -X POST https://your-project.supabase.co/functions/v1/billing-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: t=timestamp,v1=signature" \
  -H "X-Webhook-Source: billing-dashboard" \
  -d '{"type": "payment_intent.succeeded", "data": {...}}'
```

### Test Payment Flow

1. **Create Test User** in both applications with same email
2. **Make Test Payment** through billing dashboard
3. **Verify Plan Activation** in Roundtable database:
```sql
SELECT up.*, p.name as plan_name
FROM user_plans up
JOIN plans p ON p.id = up.plan_id
WHERE up.user_id = 'user_id'
ORDER BY up.created_at DESC;
```

## Monitoring and Debugging

### Webhook Events Dashboard

Access webhook events via API:
```bash
# Get recent webhook events
curl "http://localhost:3000/api/v1/webhooks/events?limit=10"

# Filter by processing status
curl "http://localhost:3000/api/v1/webhooks/events?processed=false"
```

### Logs Monitoring

**Billing Dashboard**:
- Check `pnpm preview` logs for webhook forwarding
- Monitor `RoundtableWebhookForwarder` success/failure logs

**Roundtable**:
- Check Supabase function logs
- Monitor database triggers and functions

### Common Issues

1. **Signature Verification Failed**:
   - Ensure `WEBHOOK_SECRET` matches in both applications
   - Check timestamp tolerance (5 minutes)

2. **User Not Found**:
   - Verify same email used in both applications
   - Check user exists in Roundtable auth.users table

3. **Plan Not Found**:
   - Verify `roundtableProductId` in product metadata
   - Check plans table has correct `roundtable_product_id`

4. **Webhook Delivery Failed**:
   - Verify Roundtable webhook URL is accessible
   - Check network connectivity and DNS resolution

## Security Considerations

### Webhook Security

1. **Signature Verification**: All webhooks use HMAC-SHA256 signatures
2. **Timestamp Validation**: 5-minute tolerance window
3. **Source Validation**: Only accepts `billing-dashboard` source
4. **IP Whitelisting**: Optional IP validation for production

### Data Privacy

1. **Minimal Data**: Only essential user data in webhook payloads
2. **Email Mapping**: Uses email for user correlation
3. **Metadata Encryption**: Sensitive data in encrypted metadata fields

### Access Control

1. **Database RLS**: Row Level Security on all tables
2. **Function Security**: Database functions use SECURITY DEFINER
3. **Webhook Endpoints**: Dedicated endpoints with rate limiting

## Production Deployment

### Environment Configuration

**Billing Dashboard**:
```bash
# Production webhook URL
NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL=https://prod-project.supabase.co/functions/v1/billing-webhook

# Secure webhook secret (use wrangler secrets)
wrangler secret put WEBHOOK_SECRET
```

**Roundtable**:
```bash
# Match billing dashboard secret
supabase secrets set BILLING_WEBHOOK_SECRET=your-production-secret
```

### Deployment Steps

1. **Deploy Billing Dashboard**: `pnpm deploy:production`
2. **Deploy Roundtable Webhook**: `supabase functions deploy billing-webhook`
3. **Run Database Migration**: `supabase db push --linked`
4. **Update Product Metadata**: Configure `roundtableId` mappings
5. **Test Integration**: Verify end-to-end payment flow

### Monitoring Setup

1. **Webhook Analytics**: Track success/failure rates
2. **Payment Analytics**: Monitor conversion rates
3. **Error Alerting**: Set up alerts for webhook failures
4. **Performance Monitoring**: Track response times and latency

## API Reference

### Billing Dashboard Webhook Events

#### `payment_intent.succeeded`
Sent when ZarinPal payment is successful and verified.

#### `payment_intent.payment_failed`
Sent when ZarinPal payment fails or verification fails.

#### `customer.subscription.created`
Sent when new subscription is activated.

#### `customer.subscription.updated`
Sent when subscription status changes.

### Roundtable Database Functions

#### `get_plan_by_roundtable_id(text)`
Finds plan by Roundtable product ID.

#### `activate_billing_plan(...)`
Activates billing dashboard plan for user.

#### `check_user_limits(...)`
Validates user actions against plan limits (supports both Stripe and billing dashboard plans).

## Support and Troubleshooting

For issues with the integration:

1. **Check webhook event logs** in billing dashboard
2. **Verify signature and payload** format
3. **Test webhook endpoint** independently
4. **Check database migration** status
5. **Validate environment variables** configuration

The integration is designed to be resilient with retry logic, comprehensive logging, and graceful error handling to ensure reliable payment processing for Iranian users.