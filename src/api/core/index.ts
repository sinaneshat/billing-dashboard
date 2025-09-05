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
  imageUploadValidator,
} from './validation';

export {
  // Type exports
  type AuthMode,
  // Handler factories
  createHandler,
  createHandlerWithTransaction,
  type HandlerConfig,
  type HandlerContext,
  // Handler response helpers
  HandlerResponses,
  // Common handler schemas
  HandlerSchemas,
  type RegularHandler,
  type TransactionHandler,
} from './handlers';
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
  image: imageUploadValidator,
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

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migration utilities to help transition from old patterns
 * @deprecated Use the new unified systems above
 */
export const DEPRECATED = {
  /**
   * @deprecated Use ErrorContextSchema discriminated union instead
   */
  RecordStringUnknown: 'Use ErrorContextSchema or RequestMetadataSchema discriminated unions',

  /**
   * @deprecated Use CoreSchemas.* instead
   */
  OldValidationUtils: 'Use ValidationUtils and Validators from this module',

  /**
   * @deprecated Use createHandler or createHandlerWithTransaction
   */
  OldRouteHandlerFactory: 'Use createHandler or createHandlerWithTransaction',

  /**
   * @deprecated Use Responses.* instead
   */
  OldResponseBuilders: 'Use Responses object or individual response functions',
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
  imageUploadValidator,
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
