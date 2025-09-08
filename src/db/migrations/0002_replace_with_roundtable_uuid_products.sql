-- Migration: Replace all products with Roundtable UUID-based products
-- This migration removes all existing products and replaces them with the 4 new UUID-based products from Roundtable

-- Step 1: Clear all existing products (cascade will handle related records)
DELETE FROM product;

-- Step 2: Insert the 4 new UUID-based products from Roundtable
INSERT INTO product (
    id,
    name,
    description,
    price,
    billing_period,
    is_active,
    roundtable_id,
    message_quota,
    conversation_limit,
    model_limit,
    features,
    stripe_product_id,
    stripe_price_id,
    usage_type,
    system_prompt_id,
    metadata,
    created_at,
    updated_at
) VALUES 
-- Free Plan
(
    '37168efc-84e3-48b3-922c-5ee57b27eb5a',
    'Free',
    'Get started with basic features',
    0,
    'monthly',
    1,
    '37168efc-84e3-48b3-922c-5ee57b27eb5a',
    20,
    2,
    5,
    '{"allowed_models":["openai/gpt-5","openai/gpt-4o-search-preview","deepseek/deepseek-r1","google/gemini-2.5-pro-preview-03-25","meta-llama/llama-4-maverick"],"can_use_premium_models":false}',
    null,
    null,
    null,
    null,
    '{"tier":"free","popular":false,"source":"roundtable","features":["20 messages per month","Up to 5 AI models","2 conversations per month","Basic support"]}',
    '2025-05-04T21:07:31.282Z',
    '2025-08-07T20:18:19.810Z'
),
-- Starter Plan  
(
    '0bde9d03-6cb5-4a3b-9a8b-aa6983178198',
    'Starter', 
    'Affordable entry for creators and thinkers.',
    20,
    'monthly',
    1,
    '0bde9d03-6cb5-4a3b-9a8b-aa6983178198',
    150,
    30,
    5,
    '{"allowed_models":["openai/gpt-4.1","openai/gpt-4o-search-preview","deepseek/deepseek-r1","openai/o3","openai/o4-mini","openai/o4-mini-high","anthropic/claude-sonnet-4","anthropic/claude-opus-4","google/gemini-2.5-pro-preview-03-25","meta-llama/llama-4-maverick","x-ai/grok-4","perplexity/sonar-reasoning","perplexity/sonar-pro","perplexity/sonar-deep-research","openai/gpt-5-chat","openai/gpt-5","anthropic/claude-opus-4.1"],"priority_support":true,"can_use_premium_models":true}',
    'prod_Smp1zODelp6eyp',
    'price_1RrFNqFqO8Kcw2apHCOEE7ZD',
    null,
    null,
    '{"tier":"starter","popular":false,"source":"roundtable","features":["150 messages per month","Up to 5 AI models","30 conversations per month","Email support","Premium AI models"]}',
    '2025-08-01T09:36:45.475Z',
    '2025-08-07T20:10:07.286Z'
),
-- Pro Plan
(
    '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    'Pro',
    'For those who think big and often.',
    59,
    'monthly', 
    1,
    '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    400,
    75,
    7,
    '{"allowed_models":["openai/gpt-4.1","openai/gpt-4o-search-preview","deepseek/deepseek-r1","openai/o3","openai/o4-mini","openai/o4-mini-high","anthropic/claude-sonnet-4","anthropic/claude-opus-4","google/gemini-2.5-pro-preview-03-25","meta-llama/llama-4-maverick","x-ai/grok-4","perplexity/sonar-reasoning","perplexity/sonar-pro","perplexity/sonar-deep-research","openai/gpt-5-chat","openai/gpt-5","anthropic/claude-opus-4.1"],"priority_support":true,"can_use_premium_models":true}',
    'prod_SHjnBoV5d84CuH',
    'price_1RNAJbFqO8Kcw2apaZimGpKW',
    null,
    null,
    '{"tier":"pro","popular":true,"source":"roundtable","features":["400 messages per month","Up to 7 AI models","75 conversations per month","Priority support","Premium AI models"]}',
    '2025-05-04T21:07:31.282Z',
    '2025-08-31T10:35:57.574Z'
),
-- Power Plan
(
    '53425ae7-0806-42f1-9ca7-ef21966ab6ad',
    'Power',
    'Maximum power, minimal limits.',
    249,
    'monthly',
    1,
    '53425ae7-0806-42f1-9ca7-ef21966ab6ad',
    1800,
    300,
    15,
    '{"allowed_models":["openai/gpt-4.1","openai/gpt-4o-search-preview","deepseek/deepseek-r1","openai/o3","openai/o4-mini","openai/o4-mini-high","anthropic/claude-sonnet-4","anthropic/claude-opus-4","google/gemini-2.5-pro-preview-03-25","meta-llama/llama-4-maverick","x-ai/grok-4","perplexity/sonar-reasoning","perplexity/sonar-pro","perplexity/sonar-deep-research","openai/gpt-5-chat","openai/gpt-5","anthropic/claude-opus-4.1"],"priority_support":true,"can_use_premium_models":true}',
    'prod_SHjpFZgILFX8EQ',
    'price_1RNALvFqO8Kcw2apagykNmkc',
    null,
    null,
    '{"tier":"power","popular":false,"source":"roundtable","features":["1800 messages per month","Up to 15 AI models","300 conversations per month","24/7 priority support","Premium AI models"]}',
    '2025-05-04T21:07:31.282Z',
    '2025-08-07T20:10:12.146Z'
);