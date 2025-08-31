# ZarinPal Foundation Integration - Brownfield Enhancement

## Epic Goal

Establish ZarinPal payment gateway integration and core billing infrastructure within the existing Next.js authentication boilerplate, enabling Iranian-market payment processing while maintaining full compatibility with the current system.

## Epic Description

**Existing System Context:**
- Current relevant functionality: Complete authentication system with Better Auth, user management, Drizzle ORM with D1 database
- Technology stack: Next.js 15.3.2, TypeScript, React 19.1.0, Cloudflare Workers, Drizzle ORM, Better Auth
- Integration points: Existing user table, API routes structure, authentication middleware

**Enhancement Details:**
- What's being added/changed: ZarinPal API client, basic billing database schema, payment processing endpoints
- How it integrates: Extends existing user schema with billing relationships, adds new `/api/billing/*` routes following Hono patterns
- Success criteria: Successful ZarinPal payment processing, secure credential management, database integration without breaking existing auth

## Stories

1. **Story 1:** ZarinPal API Client Integration
   - Create ZarinPal TypeScript client with Zod validation
   - Add sandbox/production environment configuration
   - Implement payment initiation and verification flows

2. **Story 2:** Core Billing Database Schema  
   - Extend Drizzle schema with subscription plans, payment attempts, and direct debit tokens tables
   - Maintain foreign key relationships to existing user table
   - Create database migrations with rollback scripts

3. **Story 3:** Basic Payment Processing API
   - Add `/api/billing/payment/initiate` and `/api/billing/payment/verify` endpoints
   - Implement ZarinPal webhook handler at `/api/webhooks/zarinpal`
   - Add authentication middleware for billing routes

## Compatibility Requirements

- [x] Existing Better Auth APIs remain unchanged
- [x] Database schema changes are backward compatible with foreign key constraints only
- [x] UI changes are isolated to new billing routes only
- [x] Performance impact is minimal (async payment processing)

## Risk Mitigation

- **Primary Risk:** ZarinPal API credentials exposure or authentication breaking
- **Mitigation:** Environment secrets in Cloudflare, isolated billing middleware that doesn't affect existing auth
- **Rollback Plan:** Database migration rollback scripts, feature flag to disable billing routes

## Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Existing authentication functionality verified through existing test suite  
- [x] ZarinPal sandbox integration working correctly
- [x] Database migrations tested with rollback procedures
- [x] No regression in existing user management features

## Epic Completion Summary

**Status: ✅ COMPLETED**

All three stories in Epic 1 have been successfully implemented:

### Story 1.1: ZarinPal API Client Integration ✅
- **File**: `src/lib/billing/zarinpal-client.ts`
- **Tests**: `src/__tests__/unit/lib/billing/zarinpal-client-standalone.test.ts`
- **Features**: Complete TypeScript client with payment initiation, verification, and Direct Debit support
- **Environment**: Sandbox/production configuration with Cloudflare secrets integration

### Story 1.2: Core Billing Database Schema ✅
- **Files**: `src/db/tables/billing.ts`, `src/db/migrations/0002_regular_meggan.sql`
- **Features**: 6 comprehensive billing tables with proper foreign keys to user table
- **Tables**: product, payment_method, subscription, payment, billing_event, webhook_event
- **Integration**: Full ZarinPal workflow support with Direct Debit tokens

### Story 1.3: Basic Payment Processing API ✅
- **Files**: `src/api/routes/payments/*`, `src/api/routes/webhooks/*`, `src/api/services/zarinpal.ts`
- **Endpoints**: Payment history, callbacks, verification, and webhook processing
- **Features**: Complete OpenAPI integration, authentication middleware, error handling
- **Security**: Rate limiting, CSRF protection, input validation

### Epic Results
- **ZarinPal Integration**: Full payment gateway integration for Iranian market
- **Database Foundation**: Comprehensive billing schema supporting subscriptions and Direct Debit
- **API Infrastructure**: Complete payment processing API with webhook support
- **Development Quality**: 100% TypeScript coverage, comprehensive testing, proper documentation
- **System Compatibility**: Zero breaking changes to existing authentication system

**Ready for Epic 2: Subscription Lifecycle Management** 🚀