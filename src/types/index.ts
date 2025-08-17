/**
 * Type exports for the application
 *
 * Following Better Auth best practices:
 * - Import Better Auth types directly from @/lib/auth-client
 * - Import extended types directly from @/types/auth
 * - No intermediate re-exports that create unnecessary layers
 */

// Extended auth types that build upon Better Auth types
export type {
  AuthEnv,
  AuthStatus,
} from './auth';

// General utility types - explicit named exports for clarity
export type {
  AIHistoryStatus,
  ApiDefaultError,
  CustomFetchConfig,
  FormOption,
  FormOptions,
  GeneralFormProps,
  InitialDefaultValues,
  NavItem,
  ServiceConfig,
  TextInputProps,
  WithOptionsProps,
} from './general';
export type {
  AIGenerationPayload,
  BaseEventPayload,
  ChromeExtensionInstallClickedPayload,
  ClientTrackEventFunction,
  DowngradeWebsitePayload,
  EventPayloadMap,
  FormFilledPayload,
  GlobalErrorPayload,
  NavItemClickedPayload,
  NavMenuOpenedPayload,
  OnboardingStepCompletedPayload,
  PageViewPayload,
  PricingCTAClickedPayload,
  ProductHuntClickedPayload,
  ProfileEventPayload,
  ProfilePreferencesPayload,
  ProfileWebsitePayload,
  PurchaseFailedPayload,
  PurchaseInitiatedPayload,
  SubscriptionEventPayload,
  SupportRequestSubmittedPayload,
  TokenEventPayload,
  TokenPurchaseFailedPayload,
  TokenPurchasePayload,
  TrackingEvent,
  UserEventPayload,
} from './tracking';
