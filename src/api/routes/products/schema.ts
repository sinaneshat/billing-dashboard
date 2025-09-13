import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';
import { productSelectSchema } from '@/db/validation/billing';

// Extended product schema with currency conversion fields
const ProductSchema = productSelectSchema.extend({
  originalUsdPrice: z.number().optional().describe('Original USD price from database'),
  exchangeRate: z.number().optional().describe('USD to IRR exchange rate used'),
  formattedPrice: z.string().optional().describe('Formatted price in Toman currency'),
}).openapi({
  example: {
    id: '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    name: 'Pro',
    description: 'For those who think big and often.',
    price: 62450000, // Toman price (converted from USD)
    originalUsdPrice: 59, // Original USD price from database
    exchangeRate: 1027876.5, // Current USD to IRR exchange rate
    formattedPrice: '62,450,000 Toman', // Formatted Toman price
    billingPeriod: 'monthly',
    isActive: true,
    // Roundtable integration fields
    roundtableId: '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    messageQuota: 400,
    conversationLimit: 75,
    modelLimit: 7,
    features: {
      allowed_models: [
        'openai/gpt-4.1',
        'openai/gpt-4o-search-preview',
        'deepseek/deepseek-r1',
        'openai/o3',
        'anthropic/claude-sonnet-4',
        'anthropic/claude-opus-4',
      ],
      priority_support: true,
      can_use_premium_models: true,
    },
    stripeProductId: 'prod_SHjnBoV5d84CuH',
    stripePriceId: 'price_1RNAJbFqO8Kcw2apaZimGpKW',
    usageType: null,
    systemPromptId: null,
    metadata: {
      tier: 'pro',
      popular: true,
      source: 'roundtable',
      features: [
        '400 messages per month',
        'Up to 7 AI models',
        '75 conversations per month',
        'Priority support',
        'Premium AI models',
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

const ProductsArraySchema = z.array(ProductSchema);

export const GetProductsResponseSchema = createApiResponseSchema(ProductsArraySchema).openapi('GetProductsResponse');

// Export types - now consistent with database schema
export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof GetProductsResponseSchema>;
