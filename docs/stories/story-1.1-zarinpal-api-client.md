# ZarinPal API Client Integration - Brownfield Addition

## User Story

As a **system administrator**,
I want **a secure, typed ZarinPal API client with sandbox/production environment support**,
So that **the application can process Iranian payments reliably while maintaining existing system security standards**.

## Story Context

**Existing System Integration:**
- Integrates with: Existing Hono API router, Cloudflare environment secrets, TypeScript strict mode
- Technology: Next.js 15.3.2, TypeScript 5.8.3, Zod 4.0.17 validation, Cloudflare Workers
- Follows pattern: Existing API clients in `/src/lib/` with environment-based configuration
- Touch points: Environment configuration, error handling patterns, TypeScript types

## Acceptance Criteria

**Functional Requirements:**

1. **ZarinPal Client Creation**: Create TypeScript client at `/src/lib/billing/zarinpal-client.ts` with methods for payment initiation, verification, and Direct Debit token management
2. **Environment Configuration**: Support sandbox (`sandbox.zarinpal.com`) and production (`api.zarinpal.com`) endpoints with merchant ID configuration
3. **Request/Response Validation**: All ZarinPal API interactions validated using Zod schemas matching official API documentation

**Integration Requirements:**

4. Existing Cloudflare environment secret management continues to work unchanged
5. New functionality follows existing `/src/lib/` library organization pattern  
6. Integration with Cloudflare Workers runtime maintains current performance characteristics

**Quality Requirements:**

7. All ZarinPal API methods covered by unit tests with mock responses
8. JSDoc documentation for all public methods following existing code standards
9. No regression in existing API functionality verified through test suite

## Technical Notes

- **Integration Approach**: Create isolated ZarinPal client following existing HTTP client patterns, store credentials in Cloudflare environment secrets
- **Existing Pattern Reference**: Follow `/src/lib/auth/better-auth.ts` patterns for client configuration and environment handling
- **Key Constraints**: Must work within Cloudflare Workers runtime limits, maintain TypeScript strict mode compliance

## Definition of Done

- [x] ZarinPal client created with payment initiation, verification, and Direct Debit methods
- [x] Sandbox/production environment configuration working with Cloudflare secrets
- [x] All API calls properly typed and validated with Zod schemas
- [x] Unit tests passing for all client methods
- [x] JSDoc documentation complete
- [x] Existing functionality regression tested
- [x] Code follows existing TypeScript and ESLint standards

## Dev Agent Record

### Tasks Progress
- [x] Task 1: ZarinPal API Client Integration - COMPLETED

### Agent Model Used
Claude Sonnet 4

### Debug Log References
- Created ZarinPal TypeScript client at `/src/lib/billing/zarinpal-client.ts`
- Comprehensive Zod validation for all API interactions
- Environment configuration for sandbox/production
- Unit tests created with comprehensive coverage (moved to correct test structure)
- ESLint and TypeScript compliance verified

### Completion Notes
1. **ZarinPal Client Created**: Full-featured client with payment initiation, verification, and Direct Debit methods
2. **Environment Configuration**: Proper sandbox/production environment handling with Cloudflare secrets support
3. **Request/Response Validation**: All API interactions validated using Zod schemas matching ZarinPal API documentation
4. **Unit Tests**: Comprehensive test suite created covering all client methods and error scenarios
5. **Documentation**: Complete JSDoc documentation for all public methods
6. **Code Standards**: Follows existing TypeScript strict mode and ESLint standards

### File List
- `src/lib/billing/zarinpal-client.ts` - Main ZarinPal client implementation
- `src/__tests__/unit/lib/billing/zarinpal-client-standalone.test.ts` - Comprehensive unit tests

### Change Log
| Date | Change | Files |
|------|--------|-------|
| 2025-08-31 | Created ZarinPal API client with comprehensive features | zarinpal-client.ts |
| 2025-08-31 | Added comprehensive unit test suite | zarinpal-client-standalone.test.ts |

### Status
Ready for Review

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk**: ZarinPal API credentials exposure or incorrect environment configuration
- **Mitigation**: Use Cloudflare environment secrets, validate configuration on startup
- **Rollback**: Remove client files, revert environment configuration

**Compatibility Verification:**
- [x] No breaking changes to existing APIs
- [x] Database changes are not applicable for this story  
- [x] UI changes are not applicable for this story
- [x] Performance impact is negligible (HTTP client creation)