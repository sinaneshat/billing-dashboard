# Epic 1: ZarinPal Subscription Billing Platform

**Epic Goal**: Transform the existing authentication boilerplate into a comprehensive Iranian SaaS billing platform with ZarinPal integration, automated subscription management, and Persian-native user experience.

**Integration Requirements**: Seamless integration with existing Better Auth system, Cloudflare Workers infrastructure, and Drizzle ORM database while maintaining backward compatibility and system stability.

## Story 1.1: Database Schema and Migration Foundation

As a developer,  
I want to extend the database schema with billing tables,  
so that subscription data can be stored without affecting existing auth tables.

### Acceptance Criteria
1. Create new Drizzle schema files for billing tables (plans, subscriptions, payment_attempts, direct_debit_tokens)
2. Generate and test migration scripts with rollback capability
3. Verify foreign key relationships to existing user table
4. Confirm existing auth queries remain unaffected
5. Add indexes for performance-critical billing queries

### Integration Verification
- IV1: All existing auth operations continue working with new schema
- IV2: Database migrations apply cleanly to D1 without data loss
- IV3: Query performance maintains sub-100ms response times

## Story 1.2: ZarinPal Service Integration Layer

As a developer,  
I want to create a ZarinPal client service with proper error handling,  
so that payment operations are reliable and maintainable.

### Acceptance Criteria
1. Implement ZarinPal API client with TypeScript types
2. Add retry logic with exponential backoff for API failures
3. Create mock service for local development and testing
4. Implement comprehensive error handling and logging
5. Add circuit breaker pattern for API stability

### Integration Verification
- IV1: Service integrates with existing error handling patterns
- IV2: API calls respect Cloudflare Worker timeout limits
- IV3: Logging follows existing application standards

## Story 1.3: Subscription Plans and Pricing Configuration

As a product owner,  
I want to configure 5 subscription tiers with Iranian pricing,  
so that users can select appropriate service levels.

### Acceptance Criteria
1. Create subscription plan management in database
2. Implement pricing in both IRR and Toman display
3. Add plan feature comparison matrix
4. Create plan selection API endpoints
5. Validate pricing against Iranian market standards

### Integration Verification
- IV1: Plans accessible through existing API structure
- IV2: Pricing display works with current UI components
- IV3: No impact on existing user session handling

## Story 1.4: Direct Debit Authorization Flow

As a subscriber,  
I want to authorize automatic payments through my Iranian bank card,  
so that my subscription renews without manual intervention.

### Acceptance Criteria
1. Implement ZarinPal Direct Debit authorization UI
2. Create secure token storage in database
3. Add card masking for security display
4. Implement authorization confirmation flow
5. Handle authorization failures gracefully

### Integration Verification
- IV1: Authorization flow maintains Better Auth session
- IV2: UI components maintain existing design patterns
- IV3: Secure token storage follows security best practices

## Story 1.5: User Billing Dashboard

As a subscriber,  
I want to view and manage my subscription through a self-service portal,  
so that I can control my billing without contacting support.

### Acceptance Criteria
1. Create billing dashboard pages under /billing route
2. Display current subscription status and next billing date
3. Show payment history with transaction details
4. Implement subscription cancellation flow
5. Add receipt download functionality

### Integration Verification
- IV1: Dashboard integrated with existing app layout
- IV2: User authentication properly gates billing pages
- IV3: UI components consistent with existing design

## Story 1.6: Persian/Farsi Localization and RTL Support

As an Iranian user,  
I want to use the billing system in Persian with proper RTL layout,  
so that I have a native language experience.

### Acceptance Criteria
1. Add Persian translations for all billing UI text
2. Implement RTL layout support for billing pages
3. Configure Persian number and currency formatting
4. Add Jalali calendar for date display
5. Test all components in RTL mode

### Integration Verification
- IV1: RTL changes don't break existing LTR layouts
- IV2: Localization integrates with next-intl setup
- IV3: Font and styling remain consistent

## Story 1.7: Automated Monthly Billing System

As a business owner,  
I want subscriptions to automatically renew each month,  
so that revenue collection happens without manual processing.

### Acceptance Criteria
1. Implement Cloudflare cron job for monthly billing
2. Create batch processing for subscription renewals
3. Add payment processing with Direct Debit tokens
4. Implement subscription status updates
5. Generate payment confirmation emails

### Integration Verification
- IV1: Cron jobs don't impact Worker performance
- IV2: Batch processing respects D1 write limits
- IV3: Email system handles billing templates

## Story 1.8: Payment Retry and Failure Handling

As a business owner,  
I want failed payments to retry automatically,  
so that temporary issues don't cause subscription cancellations.

### Acceptance Criteria
1. Implement 3-attempt retry logic over 7 days
2. Add exponential backoff between attempts
3. Create payment failure notifications
4. Implement grace period management
5. Handle subscription suspension after final failure

### Integration Verification
- IV1: Retry logic doesn't create duplicate charges
- IV2: User sessions remain valid during grace period
- IV3: Notification system handles payment emails

## Story 1.9: Webhook Processing and Payment Notifications

As a system administrator,  
I want to process ZarinPal webhooks reliably,  
so that payment status updates are always captured.

### Acceptance Criteria
1. Create webhook endpoint with signature validation
2. Implement idempotent webhook processing
3. Add webhook event logging and monitoring
4. Create fallback polling for missed webhooks
5. Implement notification system for payment events

### Integration Verification
- IV1: Webhooks integrate with existing API routing
- IV2: Processing maintains data consistency
- IV3: Monitoring follows existing patterns

## Story 1.10: Production Deployment and Monitoring

As a DevOps engineer,  
I want to deploy the billing system with proper monitoring,  
so that we can track system health and performance.

### Acceptance Criteria
1. Configure production environment variables
2. Set up billing-specific monitoring dashboards
3. Implement feature flags for gradual rollout
4. Create rollback procedures for emergencies
5. Document operational procedures

### Integration Verification
- IV1: Deployment follows existing CI/CD pipeline
- IV2: Monitoring integrates with current tools
- IV3: System maintains performance SLAs