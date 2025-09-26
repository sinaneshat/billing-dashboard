/**
 * Unified API Core System - Context7 Best Practices
 *
 * Single entry point for the new type-safe, unified API system.
 * Replaces scattered validation files and inconsistent patterns.
 *
 * Usage:
 * ```typescript
 * import { Schemas, Validators, Responses, createHandler } from '@/api/core';
 *
 * // Create type-safe handler
 * const handler = createHandler({
 *   auth: 'session',
 *   validateBody: Schemas.CoreSchemas.email(),
 *   operationName: 'CreateUser'
 * }, async (c) => {
 *   const email = c.validated.body;
 *   return Responses.created(c, { userId: 'user_123' });
 * });
 * ```
 */

// ============================================================================
// SCHEMAS AND VALIDATION
// ============================================================================

import { created, internalServerError, notFound, ok, paginated, validationError } from './responses';
import {
  CoreSchemas,
  IdParamSchema,
  iranianMobileSchema,
  iranianNationalIdSchema,
  iranianRialAmountSchema,
  ListQuerySchema,
  PaginationQuerySchema,
  SearchQuerySchema,
  SortingQuerySchema,
} from './schemas';
import {
  documentUploadValidator,
} from './validation';

export {
  // Type exports
  type AuthMode,
  type BatchContext,
  type BatchHandler,
  // Handler factories
  createHandler,
  createHandlerWithBatch,
  type HandlerConfig,
  type HandlerContext,
  type RegularHandler,
} from './handlers';
export {
  // Migration utilities for existing code
  createHTTPException,
  // Enhanced HTTP Exception System
  EnhancedHTTPException,
  HTTPExceptionFactory,
  type HTTPExceptionFactoryOptions,
  HttpExceptions,
  // Type-safe mapping utilities
  isContentfulStatusCode,
  isValidContentfulStatusCode,
  mapStatusCode,
  STOKER_TO_HONO_STATUS_MAP,
} from './http-exceptions';
export {
  accepted,
  authenticationError,
  authorizationError,
  badRequest,
  conflict,
  created,
  // Utilities
  customResponse,
  databaseError,
  externalServiceError,
  internalServerError,
  noContent,
  notFound,
  // Success responses
  ok,
  paginated,
  paymentError,
  rateLimitExceeded,
  redirect,
  // Type exports
  type ResponseBuilders,
  // Consolidated responses object
  Responses,
  validateErrorResponse,
  validatePaginatedResponse,
  // Validators
  validateSuccessResponse,
  // Error responses
  validationError,
} from './responses';

// ============================================================================
// RESPONSES
// ============================================================================

export {
  type ApiErrorResponse,
  ApiErrorResponseSchema,
  type ApiResponse,
  // Core schema building blocks
  CoreSchemas,
  // Response schemas
  createApiResponseSchema,
  createPaginatedResponseSchema,
  type ErrorContext,
  ErrorContextSchema,
  type IdParam,
  IdParamSchema,
  iranianMobileSchema,
  // Iranian-specific validators
  iranianNationalIdSchema,
  iranianRialAmountSchema,
  type ListQuery,
  ListQuerySchema,
  type PaginatedResponse,
  type PaginationQuery,
  // Common request schemas
  PaginationQuerySchema,
  type PaymentMethodMetadata,
  PaymentMethodMetadataSchema,
  // Type exports
  type RequestMetadata,
  // Discriminated union schemas (replaces Record<string, unknown>)
  RequestMetadataSchema,
  type SearchQuery,
  SearchQuerySchema,
  type SortingQuery,
  SortingQuerySchema,
  type SubscriptionMetadata,
  SubscriptionMetadataSchema,
} from './schemas';

// ============================================================================
// HANDLERS
// ============================================================================

// ============================================================================
// CONVENIENCE BUNDLES
// ============================================================================

/**
 * Bundle of most commonly used schemas for quick import
 */
export const CommonSchemas = {
  // Core fields
  uuid: CoreSchemas.uuid,
  id: CoreSchemas.id,
  email: CoreSchemas.email,
  url: CoreSchemas.url,
  amount: CoreSchemas.amount,
  timestamp: CoreSchemas.timestamp,

  // Request patterns
  pagination: PaginationQuerySchema,
  sorting: SortingQuerySchema,
  search: SearchQuerySchema,
  listQuery: ListQuerySchema,
  idParam: IdParamSchema,
} as const;

/**
 * Bundle of most commonly used validators for quick import
 */
export const CommonValidators = {
  // Iranian specific
  nationalId: iranianNationalIdSchema,
  mobile: iranianMobileSchema,
  rialAmount: iranianRialAmountSchema,

  // Files
  document: documentUploadValidator,
} as const;

/**
 * Bundle of most commonly used response builders for quick import
 */
export const CommonResponses = {
  success: ok,
  created,
  paginated,
  validationError,
  notFound,
  internalError: internalServerError,
} as const;

export {
  // Conditional validators
  createConditionalValidator,
  // File upload validators
  createFileUploadValidator,
  createMultiFormatValidator,
  // Schema composition
  createPartialSchema,
  createPickSchema,
  createSearchSchema,
  createUpdateSchema,
  createValidationErrorContext,
  createValidator,
  documentUploadValidator,
  formatValidationErrors,
  validateErrorContext,
  validatePathParams,
  validateQueryParams,
  // Request validation helpers
  validateRequestBody,
  // Validation utilities
  validateWithSchema,
  type ValidationError,
  type ValidationFailure,
  type ValidationResult,
  // Type exports
  type ValidationSuccess,
  ValidationUtils,
  // Specialized validators
  Validators,
} from './validation';
