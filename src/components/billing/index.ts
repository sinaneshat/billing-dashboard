/**
 * Billing Components - Barrel Export
 *
 * Unified export for all billing-related components following the
 * established patterns in the frontend-patterns.md documentation.
 *
 * These components implement:
 * - Consistent shadcn/ui patterns
 * - Proper currency conversion integration
 * - Bank contract information display
 * - RTL support for Persian layout
 * - Unified state management
 */

// =============================================================================
// SUBSCRIPTION COMPONENTS
// =============================================================================

export { BankAuthorizationStepperOrchestrator } from './bank-authorization-stepper-orchestrator';
// Bank contract - Minimal and clean component
export type { BankContractCardProps } from './bank-contract-card';
export { BankContractCard } from './bank-contract-card';

// Overview components
export { CustomerBillingOverview } from './customer-billing-overview';

// Payment components
export { PaymentHistoryCards } from './payment-history-cards';

// Plan components
export { PricingPlans } from './pricing-plans';

// =============================================================================
// OTHER BILLING COMPONENTS
// =============================================================================

// Core unified components
export {
  BillingDisplayContainer,
  BillingDisplayItem,
} from './unified/billing-display';

// =============================================================================
// TYPES
// =============================================================================

// Unified system types
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
} from './unified/billing-display';

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
} from './unified/mappers';

// Data types
export type {
  MetricData,
  PaymentData,
  PaymentMethodData,
  ProductData,
  SubscriptionData,
  UpcomingBillData,
} from './unified/mappers';

// Upcoming bills
export { UpcomingBills } from './upcoming-bills';
