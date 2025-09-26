-- Developer Plan - Local Development Only
-- Same features as Power plan but for $0.10 (dev pricing)

INSERT OR REPLACE INTO product (
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
) VALUES (
  'dev-plan-3b79fcbcc00e2f8ab074ddeb7d117472',
  'Developer Plan',
  'Developer testing with maximum features at minimal cost.',
  0.10,
  'monthly',
  1,
  'dev-plan-3b79fcbcc00e2f8ab074ddeb7d117472',
  1800,  -- Same as Power plan
  300,   -- Same as Power plan
  15,    -- Same as Power plan
  '{"allowed_models":["openai/gpt-4.1","openai/gpt-4o-search-preview","deepseek/deepseek-r1","openai/o3","openai/o4-mini","openai/o4-mini-high","anthropic/claude-sonnet-4","anthropic/claude-opus-4","google/gemini-2.5-pro-preview-03-25","meta-llama/llama-4-maverick","x-ai/grok-4","perplexity/sonar-reasoning","perplexity/sonar-pro","perplexity/sonar-deep-research","openai/gpt-5-chat","openai/gpt-5","anthropic/claude-opus-4.1"],"priority_support":true,"can_use_premium_models":true}',
  'prod_DevPlan001',
  'price_DevPlan001',
  NULL,
  NULL,
  '{"tier":"developer","popular":false,"source":"local","features":["1800 messages per month","Up to 15 AI models","300 conversations per month","24/7 priority support","Premium AI models","Developer pricing"]}',
  cast((julianday('now') - 2440587.5)*86400000 as integer),
  cast((julianday('now') - 2440587.5)*86400000 as integer)
);