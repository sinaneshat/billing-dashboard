-- Migration: Add single active subscription constraint
-- This migration enforces that a user can only have one active subscription at a time

-- Create unique index for single active subscription per user
CREATE UNIQUE INDEX user_single_active_subscription_idx
ON subscription(user_id)
WHERE status = 'active';

-- Add additional security indexes for performance and auditing
CREATE INDEX subscription_security_audit_idx ON subscription(user_id, status, created_at);

-- Add comment to document the security constraint
PRAGMA table_info(subscription);