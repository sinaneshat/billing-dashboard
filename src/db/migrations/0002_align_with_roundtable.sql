-- Migration to align billing-dashboard products with roundtable1 plans structure
-- This ensures both projects use identical product/plan definitions from actual roundtable database

-- Clear existing products first
DELETE FROM product;

-- Insert products that match roundtable1 plans exactly using actual plan IDs from roundtable database
-- These are the real plan IDs currently used in the roundtable project
INSERT INTO product (
  id,
  name,
  description, 
  price,
  billing_period,
  is_active,
  metadata,
  created_at,
  updated_at
) VALUES 
  (
    '37168efc-84e3-48b3-922c-5ee57b27eb5a', -- Actual Free plan ID from roundtable
    'Free',
    'Get started with basic features',
    0.0,
    'monthly',
    1,
    '{"plan_type": "free", "billing_currency": "USD", "message_quota": 20, "conversation_limit": 2, "model_limit": 5, "allowed_models": ["openai/gpt-5", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick"], "can_use_premium_models": false}',
    unixepoch(),
    unixepoch()
  ),
  (
    '0bde9d03-6cb5-4a3b-9a8b-aa6983178198', -- Actual Starter plan ID from roundtable
    'Starter', 
    'Affordable entry for creators and thinkers.',
    20.0, -- $20/month from roundtable data
    'monthly',
    1,
    '{"plan_type": "starter", "billing_currency": "USD", "message_quota": 150, "conversation_limit": 30, "model_limit": 5, "allowed_models": ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"], "priority_support": true, "can_use_premium_models": true}',
    unixepoch(),
    unixepoch()
  ),
  (
    '375e4aee-6dfc-48b3-bd11-5ba892f17edd', -- Actual Pro plan ID from roundtable
    'Pro',
    'For those who think big and often.', 
    59.0, -- $59/month from roundtable data
    'monthly',
    1,
    '{"plan_type": "pro", "billing_currency": "USD", "message_quota": 400, "conversation_limit": 75, "model_limit": 7, "allowed_models": ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"], "priority_support": true, "can_use_premium_models": true}',
    unixepoch(),
    unixepoch()
  ),
  (
    '53425ae7-0806-42f1-9ca7-ef21966ab6ad', -- Actual Power plan ID from roundtable
    'Power',
    'Maximum power, minimal limits.',
    249.0, -- $249/month from roundtable data
    'monthly',
    1,
    '{"plan_type": "power", "billing_currency": "USD", "message_quota": 1800, "conversation_limit": 300, "model_limit": 15, "allowed_models": ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"], "priority_support": true, "can_use_premium_models": true}',
    unixepoch(),
    unixepoch()
  );