export {
  getSession,
  getUser,
  getUserId,
  hasValidSession,
  isSessionExpired,
  isValidSession,
  isValidUser,
  requireSession,
  requireUser,
} from './context-utils';
// Consolidated API utilities with clean exports
// Error handling (consolidated)
export {
  BusinessErrors,
  CommonErrorResponses,
  createErrorResponse,
  createPaginatedResponse,
  type ErrorResponseData,
  errorResponses,
  OpenAPIErrorResponses,
  type PaginationInfo,
} from './error-responses';
export * from './file-validation';
export {
  extractFile,
  extractFiles,
  extractOptionalFile,
  extractOptionalString,
  extractString,
  isFile,
  isFormString,
  validateFileContent,
} from './form-utils';

// Type-safe utility functions (NEW - eliminates unsafe casting)
export {
  isValidMetadata,
  mergeMetadata,
  parseMetadata,
  parsePlanChangeHistory,
  updateMetadataField,
} from './metadata-utils';
// Response utilities
export { created, error, fail, ok } from './responses';
// Schema utilities (avoid conflicts by being specific)
export {
  type ApiMeta,
  type ApiResponse,
  ApiResponseSchema,
  CommonFieldSchemas,
  type ErrorResponse,
  ErrorResponseDataSchema,
} from './schemas';
export * from './storage-keys';
export {
  buildResult,
  getProperty,
  isArray,
  isNonEmptyString,
  isObject,
  omit,
  parseJson,
  pick,
} from './type-utils';

// ZarinPal utilities
export * from './zarinpal-error-utils';
export * from './zarinpal-schemas';
