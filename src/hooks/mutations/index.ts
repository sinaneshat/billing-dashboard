/**
 * Mutation Hooks - Centralized Exports
 *
 * Single import point for all TanStack Mutation hooks
 * Following patterns from commit a24d1f67d90381a2e181818f93b6a7ad63c062cc
 */

// ============================================================================
// MUTATION HOOKS BY DOMAIN
// ============================================================================

// Chat mutations (protected) - All chat-related operations
export {
  useAddParticipantMutation,
  useCreateCustomRoleMutation,
  useCreateMemoryMutation,
  useCreateThreadMutation,
  useDeleteCustomRoleMutation,
  useDeleteMemoryMutation,
  useDeleteParticipantMutation,
  useDeleteThreadMutation,
  useSendMessageMutation,
  useUpdateCustomRoleMutation,
  useUpdateMemoryMutation,
  useUpdateParticipantMutation,
  useUpdateThreadMutation,
} from './chat-mutations';

// Checkout mutations (protected)
export {
  useCreateCheckoutSessionMutation,
  useSyncAfterCheckoutMutation,
} from './checkout';

// Customer Portal mutations (protected) - For payment method management and invoices
export {
  useCreateCustomerPortalSessionMutation,
} from './customer-portal';

// Subscription Management mutations (protected) - In-app subscription changes
export {
  useCancelSubscriptionMutation,
  useSwitchSubscriptionMutation,
} from './subscription-management';
