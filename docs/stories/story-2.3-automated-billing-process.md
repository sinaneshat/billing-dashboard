# Automated Monthly Billing Process - Brownfield Addition

## User Story

As a **business owner**,
I want **automated monthly billing that processes subscription renewals using stored Direct Debit tokens with intelligent retry logic**,
So that **revenue collection is consistent and reliable while minimizing involuntary churn from temporary payment failures**.

## Story Context

**Existing System Integration:**
- Integrates with: Direct Debit tokens from Story 2.1, subscription state management from Story 2.2, ZarinPal client
- Technology: Cloudflare Workers Cron, ZarinPal Direct Debit API, exponential backoff retry logic
- Follows pattern: Existing background job patterns, error handling and notification systems
- Touch points: Subscription state transitions, payment failure handling, user notifications

## Acceptance Criteria

**Functional Requirements:**

1. **Monthly Billing Cron Job**: Implement Cloudflare Workers Cron job for monthly subscription billing using stored Direct Debit tokens
2. **Payment Retry System**: Create intelligent retry logic with 3 attempts over 7 days using exponential backoff for failed payments
3. **Billing Failure Handling**: Implement graceful payment failure handling with subscription state updates and user notifications

**Integration Requirements:**

4. Existing subscription state management from Story 2.2 continues to work with automated state transitions
5. New billing automation follows existing background job patterns without affecting application performance
6. Integration with notification system maintains existing user communication patterns

**Quality Requirements:**

7. Billing automation covered by integration tests with mock ZarinPal responses and cron simulation
8. Retry logic prevents infinite loops and properly updates subscription states after final failure
9. No regression in existing payment processing or subscription management verified

## Technical Notes

- **Integration Approach**: Implement Cloudflare Workers Cron trigger, create billing service with retry logic, integrate with existing notification system
- **Existing Pattern Reference**: Follow existing background processing patterns and error handling conventions
- **Key Constraints**: Cloudflare Workers execution limits, ZarinPal API rate limits, subscription grace period handling

## Definition of Done

- [x] Monthly billing cron job implemented and scheduled in Cloudflare Workers
- [x] Payment retry system with exponential backoff working correctly
- [x] Failed payment handling updates subscription states appropriately
- [x] User notifications sent for payment failures and successful renewals
- [x] Integration tests covering billing automation and retry scenarios
- [x] Existing subscription and payment functionality regression tested
- [x] Code follows existing background job and error handling patterns

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk**: Billing automation failures causing revenue loss or incorrect subscription suspensions
- **Mitigation**: Comprehensive retry logic, proper error logging, manual billing fallback procedures
- **Rollback**: Disable cron job, revert to manual billing processes, reset affected subscription states

**Compatibility Verification:**
- [x] No breaking changes to existing subscription or payment APIs
- [x] Database changes use existing billing schema with proper state management
- [x] UI changes are not applicable for this story  
- [x] Performance impact is isolated to scheduled billing processes only