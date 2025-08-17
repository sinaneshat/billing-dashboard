/**
 * Email module re-exports
 * Centralized email functionality
 */

// Email service functions (server-only)
export {
  emailService,
} from './ses-service';

// Validation utilities
export {
  isDisposableEmail,
  isValidEmail,
  normalizeEmail,
} from './validation';
