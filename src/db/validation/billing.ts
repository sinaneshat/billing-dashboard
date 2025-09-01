import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
  billingEvent,
  payment,
  paymentMethod,
  product,
  subscription,
  webhookEvent,
} from '../tables/billing';

// Product schemas
export const productSelectSchema = createSelectSchema(product);
export const productInsertSchema = createInsertSchema(product);
export const productUpdateSchema = createUpdateSchema(product);

// Payment method schemas
export const paymentMethodSelectSchema = createSelectSchema(paymentMethod);
export const paymentMethodInsertSchema = createInsertSchema(paymentMethod);
export const paymentMethodUpdateSchema = createUpdateSchema(paymentMethod);

// Subscription schemas
export const subscriptionSelectSchema = createSelectSchema(subscription);
export const subscriptionInsertSchema = createInsertSchema(subscription);
export const subscriptionUpdateSchema = createUpdateSchema(subscription);

// Payment schemas
export const paymentSelectSchema = createSelectSchema(payment);
export const paymentInsertSchema = createInsertSchema(payment);
export const paymentUpdateSchema = createUpdateSchema(payment);

// Billing event schemas
export const billingEventSelectSchema = createSelectSchema(billingEvent);
export const billingEventInsertSchema = createInsertSchema(billingEvent);
export const billingEventUpdateSchema = createUpdateSchema(billingEvent);

// Webhook event schemas
export const webhookEventSelectSchema = createSelectSchema(webhookEvent);
export const webhookEventInsertSchema = createInsertSchema(webhookEvent);
export const webhookEventUpdateSchema = createUpdateSchema(webhookEvent);

// Subscription metadata schemas
export const planChangeHistoryItemSchema = z.object({
  fromProductId: z.string(),
  toProductId: z.string(),
  fromPrice: z.number(),
  toPrice: z.number(),
  changedAt: z.string().datetime(),
  effectiveDate: z.string(),
});

export const subscriptionMetadataSchema = z.object({
  planChangeHistory: z.array(planChangeHistoryItemSchema).optional(),
}).passthrough(); // Allow additional properties

// Export types
export type PlanChangeHistoryItem = z.infer<typeof planChangeHistoryItemSchema>;
export type SubscriptionMetadata = z.infer<typeof subscriptionMetadataSchema>;

// Product types
export type Product = z.infer<typeof productSelectSchema>;
export type ProductInsert = z.infer<typeof productInsertSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

// Payment method types
export type PaymentMethod = z.infer<typeof paymentMethodSelectSchema>;
export type PaymentMethodInsert = z.infer<typeof paymentMethodInsertSchema>;
export type PaymentMethodUpdate = z.infer<typeof paymentMethodUpdateSchema>;

// Subscription types
export type Subscription = z.infer<typeof subscriptionSelectSchema>;
export type SubscriptionInsert = z.infer<typeof subscriptionInsertSchema>;
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;

// Payment types
export type Payment = z.infer<typeof paymentSelectSchema>;
export type PaymentInsert = z.infer<typeof paymentInsertSchema>;
export type PaymentUpdate = z.infer<typeof paymentUpdateSchema>;

// Billing event types
export type BillingEvent = z.infer<typeof billingEventSelectSchema>;
export type BillingEventInsert = z.infer<typeof billingEventInsertSchema>;
export type BillingEventUpdate = z.infer<typeof billingEventUpdateSchema>;

// Webhook event types
export type WebhookEvent = z.infer<typeof webhookEventSelectSchema>;
export type WebhookEventInsert = z.infer<typeof webhookEventInsertSchema>;
export type WebhookEventUpdate = z.infer<typeof webhookEventUpdateSchema>;
