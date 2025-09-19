# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a white-labelable ZarinPal payment dashboard - an open-source billing management platform for Iranian businesses. Built with Next.js 15.3.2, deployed on Cloudflare Workers with edge-first architecture, and integrating ZarinPal payment gateway with direct debit (Payman) support.

## Essential Commands

### Development
```bash
pnpm dev                    # Start development server with turbo
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
pnpm lint:fix               # Fix ESLint issues
pnpm check-types            # TypeScript type checking
```

### Database Management
```bash
pnpm db:generate            # Generate Drizzle migrations
pnpm db:migrate:local       # Apply migrations locally
pnpm db:studio:local        # Open Drizzle Studio
pnpm db:fresh:quick         # Reset and seed database quickly
pnpm db:migrate:preview     # Apply migrations to preview
pnpm db:migrate:prod        # Apply migrations to production
```

### Cloudflare Deployment
```bash
pnpm preview               # Build and preview worker locally
pnpm deploy:preview        # Deploy to preview environment
pnpm deploy:production     # Deploy to production
pnpm cf-typegen            # Generate CloudflareEnv types from .env/.dev.vars
```

### Testing & Quality
```bash
# Note: No test framework is configured yet - check README first
pnpm lint:modified         # Lint only modified files
pnpm i18n:full-check       # Check all i18n translations
```

## Architecture Overview

### Core Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript 5.8
- **Backend**: Hono API with OpenAPI/Zod validation
- **Database**: Drizzle ORM with Cloudflare D1 (SQLite)
- **Auth**: Better Auth with Google OAuth and magic links
- **UI**: shadcn/ui with Tailwind CSS
- **Deployment**: Cloudflare Workers with OpenNext.js

### Key Infrastructure
- **D1 Database**: Serverless SQLite with global replication
- **R2 Storage**: Object storage for uploads and assets
- **KV Storage**: Key-value store for caching
- **Better Auth**: Modern authentication with JWT sessions
- **ZarinPal Integration**: Iranian payment gateway with Payman (direct debit)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected dashboard routes
│   │   └── dashboard/     # Main billing dashboard
│   ├── auth/              # Authentication pages
│   ├── api/               # Next.js API routes (proxy to Hono)
│   └── payment/           # Payment callback pages
├── api/                   # Hono API implementation
│   ├── routes/            # API route handlers
│   │   ├── auth/          # Authentication endpoints
│   │   ├── subscriptions/ # Subscription management
│   │   ├── payment-methods/ # Payment methods & direct debit
│   │   ├── payments/      # Payment processing
│   │   └── webhooks/      # ZarinPal webhooks
│   ├── services/          # Business logic services
│   ├── middleware/        # Custom middleware
│   └── scheduled/         # Cron job handlers
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── billing/           # Billing-specific components
│   └── auth/              # Authentication components
├── db/                    # Database schema and migrations
│   ├── tables/            # Drizzle table definitions
│   └── migrations/        # SQL migration files
├── lib/                   # Utility libraries
├── hooks/                 # React Query hooks
└── i18n/                  # Internationalization
```

## Database Architecture

The database uses Drizzle ORM with separate table files:

### Core Tables (`src/db/tables/`)
- **auth.ts**: Users, sessions, accounts, verification tokens
- **billing.ts**: Products, subscriptions, payments, payment methods, billing events
- **external-integrations.ts**: Webhook events and external API logs

### Key Relationships
- Users → Subscriptions (one-to-many)
- Subscriptions → Payments (one-to-many)
- Users → Payment Methods (one-to-many)
- All billing actions create audit entries in billing_events

## API Architecture

### Hono with OpenAPI (`src/api/index.ts`)
- Type-safe API with Zod schemas and OpenAPI documentation
- RPC-style client with full TypeScript inference
- Comprehensive middleware stack (auth, CORS, CSRF, rate limiting)

### Route Structure
```
/api/v1/
├── auth/              # Authentication (Better Auth integration)
├── products/          # Subscription plans
├── subscriptions/     # Subscription lifecycle
├── payment-methods/   # Card storage & direct debit
├── payments/          # Payment processing & history
├── webhooks/          # ZarinPal webhook handlers
└── system/            # Health checks & diagnostics
```

### Authentication Flow
- Better Auth handles session management
- JWT tokens with 7-day expiry
- Google OAuth + email/password + magic links
- Session middleware automatically attached to protected routes

## ZarinPal Integration

### Core Features
- **Standard Payments**: Credit/debit card processing
- **Direct Debit (Payman)**: Automated recurring payments
- **Card Tokenization**: Secure payment method storage
- **Webhook Processing**: Real-time payment status updates

### Key Services (`src/api/services/`)
- **zarinpal.ts**: Core payment processing
- **zarinpal-direct-debit.ts**: Payman API integration
- **currency-exchange.ts**: IRR currency handling

## Environment Configuration

### Critical Environment Variables
```bash
# Database
DATABASE_URL=file:./local.db

# Authentication
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# ZarinPal (Required for payments)
ZARINPAL_MERCHANT_ID=your-merchant-id
ZARINPAL_ACCESS_TOKEN=your-access-token

# App Configuration
NEXT_PUBLIC_WEBAPP_ENV=local|preview|prod
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Cloudflare Bindings (wrangler.jsonc)
- **DB**: D1 database binding
- **KV**: Key-value storage
- **UPLOADS_R2_BUCKET**: File uploads
- **NEXT_INC_CACHE_R2_BUCKET**: Next.js cache

## White-labeling System

This dashboard is designed for complete white-labeling:

### Brand Customization
```bash
NEXT_PUBLIC_BRAND_NAME="Your Company"
NEXT_PUBLIC_BRAND_LOGO_URL="/your-logo.svg"
NEXT_PUBLIC_BRAND_PRIMARY_COLOR="#your-color"
```

### Content Localization
- Built-in i18n with English and Persian (Farsi)
- RTL support for Persian
- Environment-based content configuration

## Development Workflow

### Before Starting Development
1. Copy `.env.example` to `.env` and configure
2. Run `pnpm db:generate` to create migrations
3. Run `pnpm db:migrate:local` to set up database
4. Run `pnpm db:fresh:quick` to seed with sample data

### Key Development Practices
- **Type Safety**: Everything uses TypeScript with strict checking
- **API First**: All endpoints have OpenAPI schemas and Zod validation
- **Database First**: Schema changes through Drizzle migrations
- **Component Library**: Use shadcn/ui components consistently
- **Internationalization**: All user-facing text through i18n keys

### Code Quality Tools
- **ESLint**: Antfu config with React and Tailwind plugins
- **TypeScript**: Strict mode enabled
- **Drizzle Studio**: Visual database management at `pnpm db:studio:local`
- **API Documentation**: Auto-generated at `/api/v1/scalar`

## Important Implementation Notes

### Payment Processing
- All payment operations are idempotent with proper error handling
- ZarinPal sandbox credentials are included for development
- Direct debit contracts require user bank authorization flow
- Payment callbacks handle both success and failure scenarios

### Security Considerations
- CSRF protection on all authenticated routes
- Rate limiting on API endpoints
- Secure session management with Better Auth
- Environment-based CORS configuration

### Performance Optimizations
- Edge-first deployment on Cloudflare Workers
- Database connection pooling with D1
- Aggressive caching for static content
- Next.js optimizations (image optimization, code splitting)

### Debugging Tips
- Check `pnpm db:studio:local` for database state
- API documentation at `http://localhost:3000/api/v1/scalar`
- Use `pnpm cf-typegen` after environment variable changes
- Check webhook events in database for ZarinPal integration issues

## Common Tasks

### Adding New Payment Methods
1. Update `src/db/tables/billing.ts` schema
2. Create API endpoints in `src/api/routes/payment-methods/`
3. Add UI components in `src/components/billing/`
4. Update React Query hooks in `src/hooks/`

### Modifying Subscription Plans
1. Update products in database via `src/db/migrations/`
2. Modify `src/api/routes/products/` handlers
3. Update UI in `src/components/billing/subscription-plans.tsx`

### Adding New Locales
1. Create new locale file in `src/i18n/locales/`
2. Update `src/i18n/request.ts` configuration
3. Run `pnpm i18n:full-check` to validate

This codebase follows modern full-stack patterns with comprehensive type safety, automated billing workflows, and production-ready Cloudflare deployment.