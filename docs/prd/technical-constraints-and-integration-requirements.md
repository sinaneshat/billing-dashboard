# Technical Constraints and Integration Requirements

## Existing Technology Stack
**Languages**: TypeScript 5.8.3, JavaScript (ES2022+)  
**Frameworks**: Next.js 15.3.2, React 19.1.0, Hono 4.9.1 (API layer)  
**Database**: Drizzle ORM 0.44.4 with Cloudflare D1 (SQLite edge database)  
**Infrastructure**: Cloudflare Workers/Pages, OpenNext deployment, Edge runtime  
**External Dependencies**: Better Auth 1.3.4, React Email, Shadcn/UI components  

## Integration Approach

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

## Code Organization and Standards

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

## Deployment and Operations

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

## Risk Assessment and Mitigation

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
