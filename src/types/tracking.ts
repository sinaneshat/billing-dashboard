/**
 * Enum for all tracked event types
 * Using this ensures type safety and prevents typos in event names
 */
export enum TrackingEvent {
  // Page events
  PAGE_VIEW = '$pageview',

  // User events
  USER_SIGNED_UP = 'user_signed_up',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGIN_INITIATED = 'user_login_initiated',
  USER_LOGGED_OUT = 'user_logged_out',
}

/**
 * Type definitions for event payloads
 */
export type BaseEventPayload = {
  [key: string]: unknown;
};

export type UserEventPayload = {
  email?: string;
  name?: string;
  stripeCustomerId?: string | null;
  phone?: string | null;
  image?: string | null;
} & BaseEventPayload;

export type SubscriptionEventPayload = {
  subscriptionId: string;
  planId: string | number | null;
  planName?: string | null;
  price?: number | null;
  status?: string;
  currency?: string;
  interval?: string;
  trialEnd?: string | null;
} & BaseEventPayload;

export type TokenEventPayload = {
  userId: string;
  amount: number;
  reason: string;
  websiteUrl?: string;
  modelName?: string;
} & BaseEventPayload;

export type TokenPurchasePayload = {
  userId: string;
  productId: number | string;
  productName: string;
  quantity: number;
  tokensCount: number;
  totalAmount?: number;
  currency?: string;
  sessionId?: string;
  priceId?: string;
} & BaseEventPayload;

export type TokenPurchaseFailedPayload = {
  userId: string;
  productId?: number | string;
  error: string;
  sessionId?: string;
} & BaseEventPayload;

export type ProfileEventPayload = {
  profileId: string | number;
  profileName?: string;
  defaultFillingContext?: string;
  isActive?: boolean;
} & BaseEventPayload;

export type ProfilePreferencesPayload = {
  toneId: number;
  isFormal: boolean;
  isGapFillingAllowed: boolean;
  povId: number;
} & ProfileEventPayload;

export type ProfileWebsitePayload = {
  websiteUrl: string;
  isRootLoad?: boolean;
  fillingContext?: string;
} & ProfileEventPayload;

export type DowngradeWebsitePayload = {
  profileId: string;
  websiteId: string;
  websiteUrl: string;
  reason: string;
} & BaseEventPayload;

export type FormFilledPayload = {
  userId: string;
  websiteUrl: string;
  profileId: string | null;
  totalTokensUsed: number;
  duration: string | number;
  modelName: string;
} & BaseEventPayload;

export type AIGenerationPayload = {
  $ai_trace_id: string;
  $ai_model: string;
  $ai_provider: string;
  $ai_input?: unknown;
  $ai_input_tokens?: number;
  $ai_output_choices?: unknown;
  $ai_output_tokens?: number;
  $ai_latency: number;
  $ai_http_status: number;
  $ai_is_error: boolean;
  $ai_error?: string | null;
  websiteUrl?: string;
  contextText?: string;
  operation?: string;
  label_count?: number;
} & BaseEventPayload;

export type GlobalErrorPayload = {
  message: string;
  stack: string;
  digest: string;
} & BaseEventPayload;

export type NavMenuOpenedPayload = {
  label: string;
  value: string;
} & BaseEventPayload;

export type NavItemClickedPayload = {
  label: string;
  value: string;
} & BaseEventPayload;

export type OnboardingStepCompletedPayload = {
  step: string;
} & BaseEventPayload;

export type ChromeExtensionInstallClickedPayload = {
  location: string;
} & BaseEventPayload;

export type PricingCTAClickedPayload = {
  location: string;
} & BaseEventPayload;

export type ProductHuntClickedPayload = {
  location: string;
} & BaseEventPayload;

export type PurchaseInitiatedPayload = {
  name: string;
  product: 'tokens' | 'subscription';
} & BaseEventPayload;

export type PurchaseFailedPayload = {
  name: string;
  product: 'tokens' | 'subscription';
  error: string;
} & BaseEventPayload;

export type PageViewPayload = {
  $current_url: string;
} & BaseEventPayload;

export type SupportRequestSubmittedPayload = {
  name: string;
  email: string;
  message: string;
} & BaseEventPayload;

/**
 * Type mapping for event payloads
 */
export type EventPayloadMap = {
  [TrackingEvent.PAGE_VIEW]: PageViewPayload;

  [TrackingEvent.USER_SIGNED_UP]: UserEventPayload;
  [TrackingEvent.USER_LOGGED_IN]: UserEventPayload;
  [TrackingEvent.USER_LOGIN_INITIATED]: BaseEventPayload;
  [TrackingEvent.USER_LOGGED_OUT]: BaseEventPayload;
};

/**
 * Create a hook for client-side tracking that includes user info
 */
export type ClientTrackEventFunction = <E extends TrackingEvent>(
  event: E,
  properties?: Partial<EventPayloadMap[E]>
) => void;
