# ZarinPal Billing Dashboard Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source
IDE-based fresh analysis

#### Current Project State
The project is a modern authentication boilerplate built with:
- **Next.js 15.3.2** with TypeScript 5.8.3 and React 19.1.0
- **Better Auth** authentication system (v1.3.4)
- **Cloudflare Workers** deployment using OpenNext
- **Drizzle ORM** (v0.44.4) with Cloudflare D1 database
- **Shadcn/UI** component system
- **React Email** for transactional emails
- **Internationalization** via next-intl
- Modern development tooling (ESLint, Husky, Vitest, Playwright)

The codebase demonstrates sophisticated architecture with existing authentication flows, database schemas, and UI components - providing an excellent foundation for adding comprehensive ZarinPal billing capabilities.

### Documentation Analysis

#### Available Documentation
✓ Tech Stack Documentation  
✓ Source Tree/Architecture  
✓ Coding Standards (partial)  
✓ API Documentation  
✓ External API Documentation  
⚠️ UX/UI Guidelines (limited)  
✓ Technical Debt Documentation  

### Enhancement Scope Definition

#### Enhancement Type
✓ New Feature Addition  
✓ Integration with New Systems  
✓ UI/UX Overhaul (Persian/RTL support)  

#### Enhancement Description
Transform the existing authentication boilerplate into a comprehensive subscription billing dashboard for Iranian SaaS companies, integrating ZarinPal payment processing with custom subscription lifecycle management, automated monthly billing, and a Persian-native user self-service portal.

#### Impact Assessment
✓ Significant Impact (substantial existing code changes)  
- Database schema extensions for billing
- New API routes and middleware
- UI components with RTL support
- Integration with Iranian banking systems

### Goals and Background Context

#### Goals
- Transform existing auth boilerplate into comprehensive Iranian SaaS billing platform
- Enable automated subscription lifecycle management using ZarinPal Direct Debit
- Provide Persian-native user experience for Iranian market
- Reduce manual billing operations to zero while maintaining 95%+ payment success rate
- Support 100+ concurrent subscribers with self-service capabilities

#### Background Context
The Iranian SaaS market lacks proper subscription billing infrastructure. ZarinPal provides payment processing but no subscription management, renewal automation, or billing lifecycle tools. This enhancement leverages the existing Next.js/Cloudflare architecture to create the missing subscription management layer, specifically designed for Iranian banking systems (Shetab network) and business requirements (IRR/TMN currencies, Persian language, local compliance).

### Change Log
| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial | 2025-08-31 | v1.0 | Created comprehensive PRD for ZarinPal billing integration | PM Agent |

## Requirements

### Functional Requirements

- **FR1**: Subscription plans managed through extended Drizzle schema with 5 tiers (Basic, Starter, Professional, Business, Enterprise) with Iranian business model validation (monthly IRR pricing, tax implications)
- **FR2**: ZarinPal Direct Debit integration using existing API route structure (/api/v1/) with fallback to standard payments and comprehensive error handling for Iranian banking constraints
- **FR3**: Persian/Farsi localization extending current next-intl setup with full RTL support, currency conversion (IRR/TMN), Persian date libraries, and Jalali calendar integration
- **FR4**: User billing dashboard integration with existing Better Auth sessions, featuring subscription-aware middleware and role-based access control
- **FR5**: Automated billing via Cloudflare Workers scheduled functions with batch processing, failure recovery, rate limiting, and Iranian business day awareness
- **FR6**: Payment retry logic with exponential backoff considering Iranian banking schedules (weekends, religious holidays, and Shetab network maintenance windows)
- **FR7**: Comprehensive webhook processing for ZarinPal payment notifications with signature validation and idempotent processing
- **FR8**: Self-service portal allowing subscription management, payment method updates, and billing history access without support intervention

### Non-Functional Requirements

- **NFR1**: Leverage existing Cloudflare Workers edge deployment optimized for Iranian market with <200ms response times from Tehran
- **NFR2**: Maintain current TypeScript/React architecture patterns with strict type safety for all billing operations
- **NFR3**: Extend existing Drizzle database schema without breaking auth tables, maintaining referential integrity and migration rollback capability
- **NFR4**: Utilize current Shadcn/UI components for billing interface consistency with custom RTL variants
- **NFR5**: Support 100+ concurrent active subscribers with 99.9% uptime during billing cycles
- **NFR6**: Process monthly billing batch within 4-hour maintenance window without service degradation
- **NFR7**: Maintain PCI compliance through ZarinPal token storage without handling raw card data
- **NFR8**: Implement comprehensive audit logging for all financial transactions with 7-year retention

### Compatibility Requirements

- **CR1**: Must integrate with existing Better Auth user management without modifications - subscription status enhancement only
- **CR2**: Preserve current Drizzle database patterns and migration system with additive changes only
- **CR3**: Maintain existing UI/UX patterns using current Shadcn components with progressive RTL enhancement
- **CR4**: Keep current Cloudflare deployment pipeline and environment structure without breaking changes

### Technical Constraints

- **TC1**: ZarinPal sandbox testing required before production integration with comprehensive test coverage
- **TC2**: Iranian data residency requirements with Cloudflare edge location mapping for compliance
- **TC3**: Backup payment collection strategy required when Direct Debit authorization fails
- **TC4**: Currency exchange rate handling for IRR volatility with daily rate updates

## Technical Constraints and Integration Requirements

### Existing Technology Stack
**Languages**: TypeScript 5.8.3, JavaScript (ES2022+)  
**Frameworks**: Next.js 15.3.2, React 19.1.0, Hono 4.9.1 (API layer)  
**Database**: Drizzle ORM 0.44.4 with Cloudflare D1 (SQLite edge database)  
**Infrastructure**: Cloudflare Workers/Pages, OpenNext deployment, Edge runtime  
**External Dependencies**: Better Auth 1.3.4, React Email, Shadcn/UI components  

### Integration Approach

**Database Integration Strategy**: 
- Extend existing Drizzle schema with subscription tables (plans, subscriptions, payment_attempts, direct_debit_tokens)
- Maintain foreign key relationships to existing user table from Better Auth
- Add database triggers for subscription state transitions
- Implement soft deletes for compliance and audit trails

**API Integration Strategy**:
- Create new `/api/v1/billing/*` routes using existing Hono router patterns
- Add ZarinPal webhook handlers at `/api/webhooks/zarinpal`
- Implement subscription middleware extending Better Auth session validation
- Use existing API error handling and response patterns

**Frontend Integration Strategy**:
- Build billing dashboard pages under `/app/(app)/billing/*` matching current layout
- Extend existing Shadcn components with RTL variants for Persian UI
- Add subscription status to existing user context from Better Auth
- Implement Persian locale files extending current next-intl structure

**Testing Integration Strategy**:
- Add billing-specific test suites using existing Vitest configuration
- Create ZarinPal mock services for local development
- Implement E2E tests with Playwright for critical billing flows
- Add Iranian locale-specific test cases

### Code Organization and Standards

**File Structure Approach**:
- `/src/lib/billing/` - Core billing logic and ZarinPal client
- `/src/app/(app)/billing/` - Billing dashboard pages
- `/src/db/schema/billing.ts` - Subscription database schemas
- `/src/emails/templates/billing/` - Payment notification emails

**Naming Conventions**: 
- Follow existing camelCase for functions, PascalCase for components
- Prefix billing-specific types with `Billing*` (e.g., BillingPlan, BillingSubscription)
- Use `use*` prefix for billing hooks following React patterns

**Coding Standards**:
- Maintain existing ESLint configuration with no new exceptions
- TypeScript strict mode for all billing code
- Zod validation for all ZarinPal API interactions

**Documentation Standards**:
- JSDoc comments for ZarinPal integration points
- README updates for billing setup and configuration
- API documentation using existing Scalar/OpenAPI patterns

### Deployment and Operations

**Build Process Integration**:
- No changes to existing build pipeline
- Add billing environment variables to Wrangler configuration
- Include ZarinPal credentials in Cloudflare secrets

**Deployment Strategy**:
- Staged rollout: Preview → Production
- Feature flags for billing activation per user cohort
- Database migrations with rollback scripts

**Monitoring and Logging**:
- Extend existing logging to capture payment events
- Add billing-specific error tracking
- Create Cloudflare Analytics dashboard for payment metrics

**Configuration Management**:
- ZarinPal credentials in Cloudflare environment secrets
- Billing configuration in existing environment files
- Feature toggles for gradual billing rollout

### Risk Assessment and Mitigation

**Technical Risks**:
- ZarinPal API instability during Iranian internet restrictions
- D1 database write limits during monthly billing cycles
- RTL layout breaking existing LTR components

**Integration Risks**:
- Better Auth session invalidation on subscription failure
- Webhook delivery failures from ZarinPal
- Currency conversion errors with IRR volatility

**Deployment Risks**:
- Database migration failures affecting existing auth system
- Cloudflare Worker timeout during bulk billing operations
- Edge location routing for Iranian users

**Mitigation Strategies**:
- Implement circuit breaker for ZarinPal API calls
- Queue-based billing with retry logic
- Progressive enhancement for RTL support
- Comprehensive rollback procedures for all migrations

## Epic and Story Structure

### Epic Approach
**Epic Structure Decision**: Single comprehensive epic delivering the complete ZarinPal billing enhancement while maintaining existing functionality. This approach ensures:
- All interdependent features deploy as a cohesive unit
- Minimal risk to existing authentication system
- Clear validation path for Iranian banking integration
- Incremental value delivery with each story completion

## Epic 1: ZarinPal Subscription Billing Platform

**Epic Goal**: Transform the existing authentication boilerplate into a comprehensive Iranian SaaS billing platform with ZarinPal integration, automated subscription management, and Persian-native user experience.

**Integration Requirements**: Seamless integration with existing Better Auth system, Cloudflare Workers infrastructure, and Drizzle ORM database while maintaining backward compatibility and system stability.

### Story 1.1: Database Schema and Migration Foundation

As a developer,  
I want to extend the database schema with billing tables,  
so that subscription data can be stored without affecting existing auth tables.

#### Acceptance Criteria
1. Create new Drizzle schema files for billing tables (plans, subscriptions, payment_attempts, direct_debit_tokens)
2. Generate and test migration scripts with rollback capability
3. Verify foreign key relationships to existing user table
4. Confirm existing auth queries remain unaffected
5. Add indexes for performance-critical billing queries

#### Integration Verification
- IV1: All existing auth operations continue working with new schema
- IV2: Database migrations apply cleanly to D1 without data loss
- IV3: Query performance maintains sub-100ms response times

### Story 1.2: ZarinPal Service Integration Layer

As a developer,  
I want to create a ZarinPal client service with proper error handling,  
so that payment operations are reliable and maintainable.

#### Acceptance Criteria
1. Implement ZarinPal API client with TypeScript types
2. Add retry logic with exponential backoff for API failures
3. Create mock service for local development and testing
4. Implement comprehensive error handling and logging
5. Add circuit breaker pattern for API stability

#### Integration Verification
- IV1: Service integrates with existing error handling patterns
- IV2: API calls respect Cloudflare Worker timeout limits
- IV3: Logging follows existing application standards

### Story 1.3: Subscription Plans and Pricing Configuration

As a product owner,  
I want to configure 5 subscription tiers with Iranian pricing,  
so that users can select appropriate service levels.

#### Acceptance Criteria
1. Create subscription plan management in database
2. Implement pricing in both IRR and Toman display
3. Add plan feature comparison matrix
4. Create plan selection API endpoints
5. Validate pricing against Iranian market standards

#### Integration Verification
- IV1: Plans accessible through existing API structure
- IV2: Pricing display works with current UI components
- IV3: No impact on existing user session handling

### Story 1.4: Direct Debit Authorization Flow

As a subscriber,  
I want to authorize automatic payments through my Iranian bank card,  
so that my subscription renews without manual intervention.

#### Acceptance Criteria
1. Implement ZarinPal Direct Debit authorization UI
2. Create secure token storage in database
3. Add card masking for security display
4. Implement authorization confirmation flow
5. Handle authorization failures gracefully

#### Integration Verification
- IV1: Authorization flow maintains Better Auth session
- IV2: UI components maintain existing design patterns
- IV3: Secure token storage follows security best practices

### Story 1.5: User Billing Dashboard

As a subscriber,  
I want to view and manage my subscription through a self-service portal,  
so that I can control my billing without contacting support.

#### Acceptance Criteria
1. Create billing dashboard pages under /billing route
2. Display current subscription status and next billing date
3. Show payment history with transaction details
4. Implement subscription cancellation flow
5. Add receipt download functionality

#### Integration Verification
- IV1: Dashboard integrated with existing app layout
- IV2: User authentication properly gates billing pages
- IV3: UI components consistent with existing design

### Story 1.6: Persian/Farsi Localization and RTL Support

As an Iranian user,  
I want to use the billing system in Persian with proper RTL layout,  
so that I have a native language experience.

#### Acceptance Criteria
1. Add Persian translations for all billing UI text
2. Implement RTL layout support for billing pages
3. Configure Persian number and currency formatting
4. Add Jalali calendar for date display
5. Test all components in RTL mode

#### Integration Verification
- IV1: RTL changes don't break existing LTR layouts
- IV2: Localization integrates with next-intl setup
- IV3: Font and styling remain consistent

### Story 1.7: Automated Monthly Billing System

As a business owner,  
I want subscriptions to automatically renew each month,  
so that revenue collection happens without manual processing.

#### Acceptance Criteria
1. Implement Cloudflare cron job for monthly billing
2. Create batch processing for subscription renewals
3. Add payment processing with Direct Debit tokens
4. Implement subscription status updates
5. Generate payment confirmation emails

#### Integration Verification
- IV1: Cron jobs don't impact Worker performance
- IV2: Batch processing respects D1 write limits
- IV3: Email system handles billing templates

### Story 1.8: Payment Retry and Failure Handling

As a business owner,  
I want failed payments to retry automatically,  
so that temporary issues don't cause subscription cancellations.

#### Acceptance Criteria
1. Implement 3-attempt retry logic over 7 days
2. Add exponential backoff between attempts
3. Create payment failure notifications
4. Implement grace period management
5. Handle subscription suspension after final failure

#### Integration Verification
- IV1: Retry logic doesn't create duplicate charges
- IV2: User sessions remain valid during grace period
- IV3: Notification system handles payment emails

### Story 1.9: Webhook Processing and Payment Notifications

As a system administrator,  
I want to process ZarinPal webhooks reliably,  
so that payment status updates are always captured.

#### Acceptance Criteria
1. Create webhook endpoint with signature validation
2. Implement idempotent webhook processing
3. Add webhook event logging and monitoring
4. Create fallback polling for missed webhooks
5. Implement notification system for payment events

#### Integration Verification
- IV1: Webhooks integrate with existing API routing
- IV2: Processing maintains data consistency
- IV3: Monitoring follows existing patterns

### Story 1.10: Production Deployment and Monitoring

As a DevOps engineer,  
I want to deploy the billing system with proper monitoring,  
so that we can track system health and performance.

#### Acceptance Criteria
1. Configure production environment variables
2. Set up billing-specific monitoring dashboards
3. Implement feature flags for gradual rollout
4. Create rollback procedures for emergencies
5. Document operational procedures

#### Integration Verification
- IV1: Deployment follows existing CI/CD pipeline
- IV2: Monitoring integrates with current tools
- IV3: System maintains performance SLAs