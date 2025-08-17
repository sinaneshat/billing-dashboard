# Billing Dashboard Next.js - Complete Initialization Guide

## Overview

**Billing Dashboard** is a modern billing and subscription management application built with Next.js 15 and deployed on Cloudflare Workers.

## Core Technologies

### Frontend
- **Next.js 15** (App Router)
- **React 19 RC**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** Components
- **Framer Motion** (Animations)

### Backend & Infrastructure
- **Cloudflare Workers** (Edge deployment)
- **OpenNext** (Next.js adapter for Cloudflare)
- **Hono** (API framework)
- **Better Auth** (Authentication)
- **Drizzle ORM** (Database)

### Database & Storage
- **Cloudflare D1** (SQLite at the edge)
- **Cloudflare R2** (Object storage)
- **Cloudflare KV** (Key-value storage)

### Email & Payments
- **React Email** (Email templates)
- **AWS SES** (Email sending)
- **Stripe** (Payments & Subscriptions)

## Project Structure

```
billing-dashboard/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── api/                  # Hono API routes
│   ├── components/           # React components
│   │   ├── ui/              # Shadcn/ui components
│   │   └── shared/          # Shared components
│   ├── lib/                  # Core libraries
│   │   ├── auth/            # Better Auth configuration
│   │   ├── db/              # Database schemas
│   │   ├── email/           # Email services
│   │   └── stripe/          # Stripe integration
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── constants/           # Application constants
│   └── types/               # TypeScript types
├── public/                   # Static assets
├── drizzle/                  # Database migrations
├── scripts/                  # Build & utility scripts
└── worker-configuration.d.ts # Worker type definitions
```

## Environment Setup

### Required Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=your-database-url

# Authentication
BETTER_AUTH_SECRET=your-auth-secret
BETTER_AUTH_URL=http://localhost:3000

# Email (AWS SES)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-southeast-2
SES_VERIFIED_EMAIL=noreply@example.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare (for production)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## Installation

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- Wrangler CLI (Cloudflare)

### Setup Steps

1. **Clone & Install**
```bash
git clone [repository-url]
cd billing-dashboard
pnpm install
```

2. **Database Setup**

```bash
# Create local D1 database
wrangler d1 create billing-dashboard-d1-local

# Run migrations
pnpm run db:migrate:local

# Seed database (optional)
pnpm run db:seed:local
```

3. **Storage Setup**

```bash
# Create R2 buckets
wrangler r2 bucket create billing-dashboard-uploads-local
wrangler r2 bucket create billing-dashboard-next-cache-local
```

## Development

### Local Development

```bash
# Start development server
pnpm run dev

# Access at:
# - App: http://localhost:3000
# - API: http://localhost:3000/api/v1
```

### Database Commands

```bash
# Generate migrations
pnpm run db:generate

# Apply migrations
pnpm run db:migrate:local

# Open database studio
pnpm run db:studio
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run E2E tests
pnpm run test:e2e

# Run all tests
pnpm run test:all
```

## Deployment

### Cloudflare Workers Deployment

#### Preview Deployment
```bash
pnpm run deploy:preview
```
Accessible at: `https://preview.yourdomain.com`

#### Production Deployment
```bash
pnpm run deploy
```
Accessible at: `https://yourdomain.com`

### GitHub Actions CI/CD

The project includes GitHub Actions workflows for:
- Continuous Integration (testing, linting)
- Preview deployments (on PR)
- Production deployments (on main branch)

## API Documentation

### Authentication Endpoints

- `POST /api/auth/sign-in/magic-link` - Request magic link
- `GET /api/auth/magic-link/verify` - Verify magic link
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/sign-out` - Sign out

### Billing Endpoints

- `GET /api/v1/billing/dashboard` - Get billing overview
- `GET /api/v1/billing/invoices` - List invoices
- `GET /api/v1/billing/subscription` - Get subscription details
- `POST /api/v1/billing/update-payment` - Update payment method

## Configuration Files

### wrangler.jsonc
Main Cloudflare Workers configuration

### drizzle.config.ts
Database migration configuration

### next.config.ts
Next.js configuration

### open-next.config.ts
OpenNext adapter configuration

## Monitoring & Analytics

- **Sentry** - Error tracking
- **Cloudflare Analytics** - Traffic analytics
- **Custom Metrics** - Application metrics

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL is correct
   - Check D1 database exists
   - Run migrations

2. **Authentication Issues**
   - Verify BETTER_AUTH_SECRET is set
   - Check session cookies
   - Verify email configuration

3. **Build Issues**
   - Clear `.next` and `node_modules`
   - Reinstall dependencies
   - Check Node.js version

## Support

For issues or questions:
- Check documentation
- Open an issue on GitHub
- Contact support

---

This guide provides a complete overview of the Billing Dashboard project structure, setup, and development workflow. Follow these steps to get your development environment running successfully.