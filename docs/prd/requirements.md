# Requirements

## Functional Requirements

- **FR1**: Subscription plans managed through extended Drizzle schema with 5 tiers (Basic, Starter, Professional, Business, Enterprise) with Iranian business model validation (monthly IRR pricing, tax implications)
- **FR2**: ZarinPal Direct Debit integration using existing API route structure (/api/v1/) with fallback to standard payments and comprehensive error handling for Iranian banking constraints
- **FR3**: Persian/Farsi localization extending current next-intl setup with full RTL support, currency conversion (IRR/TMN), Persian date libraries, and Jalali calendar integration
- **FR4**: User billing dashboard integration with existing Better Auth sessions, featuring subscription-aware middleware and role-based access control
- **FR5**: Automated billing via Cloudflare Workers scheduled functions with batch processing, failure recovery, rate limiting, and Iranian business day awareness
- **FR6**: Payment retry logic with exponential backoff considering Iranian banking schedules (weekends, religious holidays, and Shetab network maintenance windows)
- **FR7**: Comprehensive webhook processing for ZarinPal payment notifications with signature validation and idempotent processing
- **FR8**: Self-service portal allowing subscription management, payment method updates, and billing history access without support intervention

## Non-Functional Requirements

- **NFR1**: Leverage existing Cloudflare Workers edge deployment optimized for Iranian market with <200ms response times from Tehran
- **NFR2**: Maintain current TypeScript/React architecture patterns with strict type safety for all billing operations
- **NFR3**: Extend existing Drizzle database schema without breaking auth tables, maintaining referential integrity and migration rollback capability
- **NFR4**: Utilize current Shadcn/UI components for billing interface consistency with custom RTL variants
- **NFR5**: Support 100+ concurrent active subscribers with 99.9% uptime during billing cycles
- **NFR6**: Process monthly billing batch within 4-hour maintenance window without service degradation
- **NFR7**: Maintain PCI compliance through ZarinPal token storage without handling raw card data
- **NFR8**: Implement comprehensive audit logging for all financial transactions with 7-year retention

## Compatibility Requirements

- **CR1**: Must integrate with existing Better Auth user management without modifications - subscription status enhancement only
- **CR2**: Preserve current Drizzle database patterns and migration system with additive changes only
- **CR3**: Maintain existing UI/UX patterns using current Shadcn components with progressive RTL enhancement
- **CR4**: Keep current Cloudflare deployment pipeline and environment structure without breaking changes

## Technical Constraints

- **TC1**: ZarinPal sandbox testing required before production integration with comprehensive test coverage
- **TC2**: Iranian data residency requirements with Cloudflare edge location mapping for compliance
- **TC3**: Backup payment collection strategy required when Direct Debit authorization fails
- **TC4**: Currency exchange rate handling for IRR volatility with daily rate updates
