# Core Billing Database Schema - Brownfield Addition

## User Story

As a **backend developer**,
I want **billing database tables that extend the existing user schema with subscription and payment tracking**,
So that **the application can store billing data while maintaining referential integrity with the current Better Auth user system**.

## Story Context

**Existing System Integration:**
- Integrates with: Existing Drizzle ORM schema, Better Auth user table, Cloudflare D1 database
- Technology: Drizzle ORM 0.44.4, Cloudflare D1 (SQLite), TypeScript, database migrations
- Follows pattern: Existing schema files in `/src/db/schema/`, migration scripts in `/src/db/migrations/`
- Touch points: User table foreign keys, existing migration system, Drizzle schema exports

## Acceptance Criteria

**Functional Requirements:**

1. **Billing Schema Creation**: Create `/src/db/schema/billing.ts` with tables for subscription_plans, user_subscriptions, payment_attempts, and direct_debit_tokens
2. **Foreign Key Relationships**: All billing tables properly reference existing `user.id` from Better Auth schema with cascading constraints
3. **Migration Scripts**: Generate forward and rollback migration SQL scripts using existing Drizzle migration patterns

**Integration Requirements:**

4. Existing user table and Better Auth functionality continues to work unchanged
5. New schema follows existing Drizzle ORM patterns in `/src/db/schema/index.ts`
6. Integration with existing database migration commands (`db:migrate:*`) maintains current behavior

**Quality Requirements:**

7. Database schema covered by Drizzle validation and TypeScript types
8. Migration scripts tested with rollback procedures on local D1 instance
9. No regression in existing user operations verified through existing auth tests

## Technical Notes

- **Integration Approach**: Extend existing schema exports, add billing tables with proper foreign key constraints to user table
- **Existing Pattern Reference**: Follow `/src/db/schema/auth.ts` patterns for table definitions and type exports  
- **Key Constraints**: D1 SQLite limitations, foreign key constraint support, migration reversibility

## Definition of Done

- [x] Billing schema tables created with proper TypeScript types
- [x] Foreign key relationships to existing user table established  
- [x] Forward and rollback migration scripts generated and tested
- [x] Schema properly exported and integrated with existing schema index
- [x] Local database migration tested successfully
- [x] Existing auth functionality regression tested
- [x] Code follows existing Drizzle ORM patterns and naming conventions

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk**: Database migration failure or foreign key constraint issues affecting existing users
- **Mitigation**: Comprehensive migration testing on local instance, rollback scripts prepared
- **Rollback**: Execute rollback migration, remove schema files from exports

**Compatibility Verification:**
- [x] No breaking changes to existing user table or auth APIs
- [x] Database changes are additive only with proper foreign key constraints
- [x] UI changes are not applicable for this story
- [x] Performance impact is negligible (schema changes only)