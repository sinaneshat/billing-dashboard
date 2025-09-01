/**
 * RTL Components Export Index
 * Centralized exports for all RTL-related components
 */

// Text handling components
export { BidiText, type BidiTextProps, MixedText, type MixedTextProps, PersianText, type PersianTextProps } from './bidi-text';

// Core RTL components
export { RTLProvider, type RTLProviderProps } from './rtl-provider';

// Smart input components
export { DirectionIndicator, type DirectionIndicatorProps, SmartInput, type SmartInputProps, SmartTextarea, type SmartTextareaProps } from './smart-input';
export { type RTLContextType, useDirectionStyles, useRTL } from '@/hooks/use-rtl';
// Re-export hooks for convenience
export { useFormDirection, useInputDirection, useTextDirection } from '@/hooks/use-text-direction';
export { withBidiText, withRTL } from '@/utils/rtl-utils';
// Re-export utilities
export {
  clearDirectionCache,
  containsPersianText,
  detectTextDirection,
  extractPersianSegments,
  getDirectionCacheStats,
  insertDirectionalMarks,
  type TextDirectionConfig,
} from '@/utils/text-direction';
