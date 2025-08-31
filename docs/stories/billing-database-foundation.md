# Billing Database Schema Foundation - Brownfield Story

## Story Details
- **Story ID:** billing-database-foundation
- **Type:** Foundation
- **Status:** Ready for Review
- **Estimated Effort:** 2-4 hours
- **Agent Model Used:** claude-opus-4-1-20250805

## User Story
As a **system administrator**,  
I want **core billing database tables (products, subscriptions, payments) established in the existing schema**,  
So that **future billing features can be built on a solid data foundation**.

## Story Context

**Existing System Integration:**
- Integrates with: Existing Drizzle ORM schema and auth system
- Technology: Drizzle ORM, SQLite/D1, TypeScript
- Follows pattern: `/src/db/tables/auth.ts` table definition pattern
- Touch points: Database schema, user relations, migrations

## Acceptance Criteria

**Functional Requirements:**
1. **Products table created** with fields: id, name, description, price, billingPeriod, isActive
2. **Subscriptions table created** with user relationship, product reference, status tracking, billing dates  
3. **Payments table created** for transaction logging with ZarinPal reference fields
4. **Database migration generated** and can be applied without breaking existing data

**Integration Requirements:**
5. Existing auth system continues to work unchanged
6. New tables follow existing Drizzle schema pattern in `/src/db/tables/`
7. Integration with user table maintains current authentication behavior

**Quality Requirements:**
8. Schema includes proper indexes for query performance
9. Foreign key relationships maintain referential integrity
10. Migration is reversible with proper down migration

## Technical Notes

- **Integration Approach:** Add new `/src/db/tables/billing.ts` alongside existing auth tables
- **Existing Pattern Reference:** Follow `/src/db/tables/auth.ts` structure for table definitions and relations
- **Key Constraints:** 
  - Additive only - no changes to existing tables
  - ZarinPal-specific fields for future integration
  - Prepared for both one-time and subscription billing

## Tasks

### Task 1: Create Billing Tables Schema
- [x] Create `/src/db/tables/billing.ts` file
- [x] Define products table with proper fields and types
- [x] Define subscriptions table with user and product relations  
- [x] Define payments table with transaction tracking
- [x] Add proper indexes for performance
- [x] Define table relations following Drizzle patterns

### Task 2: Update Schema Exports  
- [x] Add billing tables to `/src/db/schema.ts` exports
- [x] Ensure proper import/export structure
- [x] Verify no circular dependencies

### Task 3: Generate and Test Migration
- [x] Run `pnpm db:generate` to create migration files
- [x] Test migration locally with `pnpm db:push:local`
- [x] Verify existing auth functionality unchanged
- [x] Test migration rollback capability

## Definition of Done
- [x] Billing tables schema file created following existing pattern
- [x] Database migration generated via `pnpm db:generate`
- [x] Migration tested locally with `pnpm db:push`  
- [x] Schema exports added to main schema index
- [x] Existing auth functionality verified unchanged
- [x] Relations properly defined with indexes

## Dev Agent Record

### Debug Log References
- Migration 0001_tense_black_bolt.sql created successfully
- Lint fixes applied automatically via ESLint

### Completion Notes
- Created comprehensive billing schema with 4 tables: product, subscription, payment, webhookEvent
- Added ZarinPal-specific fields for Direct Debit integration
- All tables include proper indexing for performance
- Foreign key relationships maintain referential integrity
- Build and type checking passes successfully
- Existing auth system functionality preserved

### File List
- **Added:** `src/db/tables/billing.ts` - Complete billing database schema
- **Modified:** `src/db/schema.ts` - Added billing table exports
- **Generated:** `src/db/migrations/0001_tense_black_bolt.sql` - Migration file

### Change Log
- **2025-01-31**: Story created from brownfield requirements
- **2025-01-31**: Implementation completed - all tasks and DoD criteria met

---
*Generated with Claude Code - Brownfield Story Creation Task*