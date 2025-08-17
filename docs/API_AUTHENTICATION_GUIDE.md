# API Authentication Guide

## Overview

The Billing Dashboard API uses Better Auth for authentication and authorization. This guide explains how to authenticate with the API and test the billing endpoints.

## Authentication Methods

### 1. Magic Link Authentication (Primary Method)

The application uses **magic link authentication** as the primary authentication method. Email/password authentication is disabled for enhanced security.

#### Request Magic Link

```bash
curl -X POST http://localhost:3003/api/auth/sign-in/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

**Response:**
```json
{
  "status": true
}
```

A magic link will be sent to the provided email address. The link expires in 10 minutes.

#### Verify Magic Link

After clicking the magic link in your email, you'll be redirected to:
```
GET /api/auth/magic-link/verify?token=YOUR_TOKEN
```

This will establish your session.

### 2. Session Management

#### Get Current Session

```bash
curl -X GET http://localhost:3003/api/auth/get-session \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### Session Configuration

- **Duration:** 7 days
- **Update Age:** 1 day (session expiration updates daily when active)
- **Fresh Age:** 1 day (session considered fresh for 24 hours)
- **Cookie Cache:** 15 minutes

## Testing the Billing APIs

### Complete Testing Flow

1. **Request Magic Link**
```bash
EMAIL="test@example.com"
curl -X POST http://localhost:3003/api/auth/sign-in/magic-link \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
```

2. **Verify Magic Link** (from email)
```bash
# Click the link in your email or:
curl -X GET "http://localhost:3003/api/auth/magic-link/verify?token=TOKEN_FROM_EMAIL"
```

3. **Access Billing Dashboard**
```bash
curl -X GET http://localhost:3003/api/v1/billing/dashboard \
  -H "Cookie: $SESSION_COOKIE"
```

## Error Handling

### Common Authentication Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| 401 | No session found | Authenticate using magic link |
| 403 | Insufficient permissions | Check user role |

## Security Best Practices

1. **Use environment variables** - Don't hardcode credentials
2. **Use HTTPS in production** - All authentication should use secure connections
3. **Keep sessions secure** - Don't share session cookies

## Development Tips

### Using curl with Sessions

Save cookies to a file for reuse:
```bash
# Save cookies
curl -c cookies.txt -X POST http://localhost:3003/api/auth/sign-in/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Use saved cookies
curl -b cookies.txt -X GET http://localhost:3003/api/v1/billing/dashboard
```

## Troubleshooting

### Session Not Found

If you get "No session found" errors:
1. Check cookies are being sent with the request
2. Verify session hasn't expired (7 days)
3. Ensure you're using the correct domain/port

## API Endpoints Summary

### Authentication
- `POST /api/auth/sign-in/magic-link` - Request magic link
- `GET /api/auth/magic-link/verify` - Verify magic link
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/sign-out` - Sign out

### Billing
- `GET /api/v1/billing/dashboard` - Get billing dashboard
- `GET /api/v1/billing/invoices` - List invoices
- `GET /api/v1/billing/subscription` - Get subscription details
- `POST /api/v1/billing/update-payment` - Update payment method

## Next Steps

1. **Set up email provider** for magic link delivery (SES is configured)
2. **Configure payment provider** for billing integration
3. **Add rate limiting** configuration for production

---

**Last Updated:** 2025-08-17
**Version:** 1.0.0