# External API & Webhook System

A simplified external API system with master key authentication and webhook delivery for platform owners.

## Overview

This system provides:
- **External API**: Access to user data, subscriptions, and payments with master key authentication
- **Webhook System**: Secure webhook delivery with HMAC-SHA256 signature verification
- **Platform Owner Access**: Full access to all platform data for admin/owner use cases

## Configuration

### Environment Variables

Add these variables to your `.env` and `.dev.vars` files:

```bash
# Webhook Configuration
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_SECRET=your-webhook-secret-key-change-in-production

# API Master Key (for platform owner access)
API_MASTER_KEY=your-api-master-key-change-in-production
```

### Generate Secure Keys

```bash
# Generate webhook secret
openssl rand -base64 32

# Generate API master key  
openssl rand -base64 32
```

## External API Usage

### Authentication

All external API endpoints require the master API key:

```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-master-key" https://your-app.com/api/v1/external/v1/users

# Using Authorization header  
curl -H "Authorization: Bearer your-api-master-key" https://your-app.com/api/v1/external/v1/users
```

### Available Endpoints

#### Users
- `GET /external/v1/users` - List all users
- Query parameters: `limit`, `offset`, `email`

#### Subscriptions  
- `GET /external/v1/subscriptions` - List all subscriptions
- Query parameters: `limit`, `offset`, `status`, `user_id`

#### Payments
- `GET /external/v1/payments` - List all payments
- Query parameters: `limit`, `offset`, `status`, `user_id`, `subscription_id`

#### Statistics
- `GET /external/v1/stats` - Get platform statistics

### Example API Calls

```bash
# List users
curl -H "X-API-Key: your-master-key" \
  "https://your-app.com/api/v1/external/v1/users?limit=10&offset=0"

# Get active subscriptions
curl -H "X-API-Key: your-master-key" \
  "https://your-app.com/api/v1/external/v1/subscriptions?status=active"

# Get successful payments
curl -H "X-API-Key: your-master-key" \
  "https://your-app.com/api/v1/external/v1/payments?status=completed"

# Get platform stats
curl -H "X-API-Key: your-master-key" \
  "https://your-app.com/api/v1/external/v1/stats"
```

## Webhook System

### Webhook Events

The system sends webhook events for:

**User Events:**
- `user.created`
- `user.updated`
- `user.deleted`

**Subscription Events:**
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `subscription.expired`
- `subscription.renewed`

**Payment Events:**
- `payment.succeeded`
- `payment.failed`
- `payment.refunded`
- `payment.canceled`

### Webhook Signature Verification

All webhook payloads are signed using HMAC-SHA256:

```javascript
// Node.js example
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // Parse signature header: "t=timestamp,v1=signature"
  const elements = signature.split(',');
  const timestamp = elements.find(el => el.startsWith('t=')).split('=')[1];
  const expectedSignature = elements.find(el => el.startsWith('v1=')).split('=')[1];
  
  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`;
  
  // Calculate signature
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  // Compare signatures safely
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

// Express.js webhook handler
app.post('/webhook', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.body;
  console.log('Received webhook:', event.type, event.id);
  
  // Process the event
  switch (event.type) {
    case 'payment.succeeded':
      // Handle successful payment
      break;
    case 'subscription.canceled':
      // Handle subscription cancellation
      break;
    // ... handle other events
  }
  
  res.json({ received: true });
});
```

### Testing Webhooks

Use webhook.site for testing:

1. Go to https://webhook.site
2. Copy your unique URL
3. Set `WEBHOOK_URL` to your webhook.site URL
4. Test webhook delivery:

```bash
# Test webhook endpoint
curl https://your-app.com/api/v1/webhook/test

# This will show webhook configuration status
```

### Webhook Endpoint

Your application provides a webhook receiver at:
- `POST /webhook` - Receives webhook events with signature verification
- `GET /webhook/test` - Test endpoint to check webhook configuration

## Security Considerations

1. **Keep Keys Secret**: Never commit API keys or webhook secrets to version control
2. **Use HTTPS**: Always use HTTPS for webhook endpoints in production  
3. **Verify Signatures**: Always verify webhook signatures before processing
4. **Rate Limiting**: The system includes basic rate limiting for webhook endpoints
5. **IP Whitelisting**: Consider implementing IP whitelisting for additional security

## Integration Examples

### Customer Portal Integration

```javascript
// Fetch user's subscription data
async function getUserSubscriptions(userId, apiKey) {
  const response = await fetch(`/api/v1/external/v1/subscriptions?user_id=${userId}`, {
    headers: {
      'X-API-Key': apiKey
    }
  });
  return response.json();
}

// Get payment history
async function getPaymentHistory(userId, apiKey) {
  const response = await fetch(`/api/v1/external/v1/payments?user_id=${userId}`, {
    headers: {
      'X-API-Key': apiKey
    }
  });
  return response.json();
}
```

### Analytics Dashboard

```javascript
// Get platform statistics
async function getPlatformStats(apiKey) {
  const response = await fetch('/api/v1/external/v1/stats', {
    headers: {
      'X-API-Key': apiKey
    }
  });
  return response.json();
}

// Get recent payments
async function getRecentPayments(apiKey) {
  const response = await fetch('/api/v1/external/v1/payments?limit=50&status=completed', {
    headers: {
      'X-API-Key': apiKey
    }
  });
  return response.json();
}
```

## Production Deployment

### Cloudflare Workers

Set secrets using wrangler:

```bash
# Set webhook secret
wrangler secret put WEBHOOK_SECRET

# Set API master key
wrangler secret put API_MASTER_KEY

# Set webhook URL
wrangler secret put WEBHOOK_URL
```

### Environment-Specific Configuration

The system supports different environments:

- **Development**: Uses `.dev.vars` file
- **Preview**: Uses `wrangler secret` commands
- **Production**: Uses `wrangler secret` commands

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that `API_MASTER_KEY` is set in environment variables
   - Verify the key matches exactly (no extra spaces)

2. **"Invalid webhook signature" error**
   - Check that `WEBHOOK_SECRET` is set correctly
   - Verify webhook payload is sent as raw JSON
   - Check timestamp tolerance (default 5 minutes)

3. **"Webhook configuration error"**
   - Verify `WEBHOOK_URL` and `WEBHOOK_SECRET` are both set
   - Check that the webhook URL is accessible

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will log webhook events and API requests for troubleshooting.