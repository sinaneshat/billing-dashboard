# Core Billing Database Schema - Brownfield Extension

## User Story

As a **system administrator**,
I want **a comprehensive billing database schema with foreign key relationships to the existing user table**,
So that **the application can store subscription plans, payment attempts, and Direct Debit tokens while maintaining data integrity and supporting ZarinPal integration**.

## Story Context

**Existing System Integration:**
- Integrates with: Existing user authentication table, Drizzle ORM patterns, Cloudflare D1 database
- Technology: Drizzle ORM with SQLite, TypeScript strict mode, foreign key constraints
- Follows pattern: Existing auth table structure with timestamps utility, proper indexing strategy
- Touch points: User table foreign keys, migration system, database connection handling

## Acceptance Criteria

**Functional Requirements:**

1. **Subscription Plans Table**: Create `product` table with pricing, billing periods (one_time, monthly), and metadata support
2. **Payment Tracking**: Implement `payment` table with ZarinPal-specific fields (authority, ref_id, card_hash) and retry logic
3. **Payment Methods**: Add `payment_method` table for stored ZarinPal card tokens and Direct Debit authorization
4. **Subscription Management**: Build `subscription` table linking users to products with ZarinPal Direct Debit integration

**Integration Requirements:**

5. All billing tables maintain foreign key relationships to existing user table without modification
6. Database migrations are backward compatible with proper rollback scripts
7. Indexing strategy optimized for billing queries and ZarinPal lookups

**Quality Requirements:**

8. Comprehensive audit trail with `billing_event` table for all billing actions
9. Webhook processing support with `webhook_event` table for ZarinPal callbacks
10. All tables follow existing timestamp patterns and use proper SQLite constraints

## Technical Notes

- **Integration Approach**: Extend existing Drizzle schema without modifying auth tables, use foreign key constraints only
- **Existing Pattern Reference**: Follow `src/db/tables/auth.ts` patterns for table definitions and relations
- **Key Constraints**: Maintain Cloudflare D1 compatibility, support ZarinPal Direct Debit workflow

## Definition of Done

- [x] Product table created with pricing and billing period support
- [x] Payment table implemented with ZarinPal-specific fields and retry logic
- [x] Payment methods table added for card token storage
- [x] Subscription table built with Direct Debit integration
- [x] Billing events table created for comprehensive audit trail
- [x] Webhook events table added for ZarinPal callback processing
- [x] All foreign key relationships properly defined to user table
- [x] Database migrations generated and tested
- [x] Proper indexing strategy implemented for performance
- [x] TypeScript types exported for API integration

## Dev Agent Record

### Tasks Progress
- [x] Task 2: Core Billing Database Schema - COMPLETED

### Agent Model Used
Claude Sonnet 4

### Debug Log References
- Extended existing Drizzle schema at `/src/db/tables/billing.ts`
- Comprehensive foreign key relationships to user table
- Generated new migration `0002_regular_meggan.sql`
- All ZarinPal integration fields properly mapped

### Completion Notes
1. **Product Table**: Full support for subscription plans with pricing in Iranian Rials (IRR) and billing periods
2. **Payment Tracking**: Comprehensive payment table with ZarinPal authority, ref_id, card_hash, and retry logic
3. **Payment Methods**: Secure storage of ZarinPal card tokens with primary/active status management
4. **Subscription Management**: Advanced subscription lifecycle with Direct Debit, trial periods, and billing cycle tracking
5. **Audit Trail**: Complete billing events table for compliance and debugging
6. **Webhook Processing**: Full webhook events table with processing status and external forwarding support

### Database Schema Overview
The billing schema includes 6 core tables:
- `product`: Subscription plans and one-time products with IRR pricing
- `payment_method`: User's saved ZarinPal cards and Direct Debit tokens
- `subscription`: Active subscriptions with Direct Debit automation
- `payment`: Transaction log with ZarinPal-specific tracking
- `billing_event`: Comprehensive audit trail for all billing actions
- `webhook_event`: ZarinPal webhook processing and forwarding

### Foreign Key Relationships
All billing tables properly reference the existing `user` table:
- `payment_method.userId` → `user.id` (cascade delete)
- `subscription.userId` → `user.id` (cascade delete)
- `payment.userId` → `user.id` (cascade delete)
- `billing_event.userId` → `user.id` (cascade delete)

### File List
- `src/db/tables/billing.ts` - Complete billing schema definitions
- `src/db/migrations/0002_regular_meggan.sql` - Database migration for new tables
- `src/db/schema.ts` - Main schema export file

### ZarinPal Integration Fields
Key fields supporting ZarinPal API workflow:
- **Payment Methods**: `zarinpalCardHash`, `cardMask`, `cardType`
- **Subscriptions**: `zarinpalDirectDebitToken`, `zarinpalDirectDebitId`  
- **Payments**: `zarinpalAuthority`, `zarinpalRefId`, `zarinpalCardHash`, `zarinpalDirectDebitUsed`
- **Webhooks**: Full payload storage with processing status

### Performance Optimizations
Comprehensive indexing strategy:
- User-based queries: All tables indexed on `user_id`
- ZarinPal lookups: Indexed on `zarinpal_authority`, `zarinpal_ref_id`, `zarinpal_card_hash`
- Status queries: Indexed on `status`, `is_active`, `processed`
- Date-based queries: Indexed on `next_billing_date`, `created_at`, `paid_at`

### Change Log
| Date | Change | Files |
|------|--------|-------|
| 2025-08-31 | Created comprehensive billing schema with ZarinPal integration | billing.ts |
| 2025-08-31 | Generated database migration for new tables | 0002_regular_meggan.sql |

### Status
Ready for Review - Schema implemented and migration prepared

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk**: Database migration failure or foreign key constraint violations
- **Mitigation**: Backward compatible migrations, proper foreign key cascading, rollback scripts available
- **Rollback**: Migration rollback available, schema changes are non-breaking to existing auth functionality

**Compatibility Verification:**
- [x] No breaking changes to existing user/auth tables
- [x] Foreign key constraints maintain referential integrity
- [x] Existing authentication functionality remains unchanged
- [x] Performance impact minimal with proper indexing strategy