// =============================================================================
// UNIFIED BILLING COMPONENT SYSTEM - MAIN EXPORTS
// =============================================================================

// Core components
export {
  BillingDisplayContainer,
  BillingDisplayItem,
} from './billing-display';

// Types
export type {
  ActionConfig,
  BillingDataType,
  BillingDisplayContainerProps,
  BillingDisplayItemProps,
  BillingDisplaySize,
  BillingDisplayVariant,
  ContentConfig,
  StatusConfig,
  StyleConfig,
} from './billing-display';

// Data mappers
export {
  createEmptyContent,
  createWelcomeContent,
  getBillingIcon,
  mapMetricToContent,
  mapPaymentMethodToContent,
  mapPaymentToContent,
  mapPlanToContent,
  mapSubscriptionToContent,
  mapUpcomingBillToContent,
} from './mappers';

// Data types
export type {
  MetricData,
  PaymentData,
  PaymentMethodData,
  PlanData,
  SubscriptionData,
  UpcomingBillData,
} from './mappers';
