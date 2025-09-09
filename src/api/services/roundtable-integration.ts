/**
 * Roundtable1 Integration Service
 *
 * Handles communication with the Roundtable1 Supabase database
 * to update user subscription information after successful payments
 * in the billing dashboard.
 */

import { z } from '@hono/zod-openapi';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// =============================================================================
// ZOD SCHEMAS FOR TYPE SAFETY
// =============================================================================

/**
 * Roundtable Integration Configuration Schema
 */
export const RoundtableConfigSchema = z.object({
  serviceName: z.string(),
  supabaseUrl: z.string().url(),
  supabaseServiceKey: z.string().min(32),
}).openapi('RoundtableConfig');

/**
 * User Plan Update Schema for Roundtable1 Database
 */
export const UserPlanUpdateSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
}).openapi('UserPlanUpdate');

/**
 * Roundtable1 Database - User Plans Insert Schema
 */
export const RoundtableUserPlanInsertSchema = z.object({
  user_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  is_active: z.boolean(),
  usage_reset_at: z.string(),
  message_count: z.number().int(),
  stripe_subscription_id: z.string().nullable(),
  stripe_customer_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi('RoundtableUserPlanInsert');

/**
 * Roundtable1 Database - User Plans Update Schema
 */
export const RoundtableUserPlanUpdateSchema = z.object({
  is_active: z.boolean().optional(),
  ends_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
}).openapi('RoundtableUserPlanUpdate');

/**
 * Plan Mapping Schema for Response
 */
export const PlanMappingSchema = z.object({
  planId: z.string().uuid(),
  name: z.string(),
  subscriptionId: z.string().uuid(),
  isActive: z.boolean(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
}).openapi('PlanMapping');

// =============================================================================
// TYPE INFERENCE
// =============================================================================

export type RoundtableConfig = z.infer<typeof RoundtableConfigSchema>;
export type UserPlanUpdate = z.infer<typeof UserPlanUpdateSchema>;
export type RoundtableUserPlanInsert = z.infer<typeof RoundtableUserPlanInsertSchema>;
export type RoundtableUserPlanUpdate = z.infer<typeof RoundtableUserPlanUpdateSchema>;
export type PlanMapping = z.infer<typeof PlanMappingSchema>;

// =============================================================================
// ROUNDTABLE INTEGRATION SERVICE
// =============================================================================

/**
 * Roundtable1 Integration Service
 * Handles communication with Roundtable1 Supabase database using untyped client
 * for maximum compatibility with cross-project database operations
 */
export class RoundtableIntegrationService {
  private supabase: SupabaseClient;
  private config: RoundtableConfig;

  constructor(config: RoundtableConfig) {
    this.config = config;

    // Initialize Supabase client with service key for backend operations
    // Using untyped client for cross-project compatibility
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  /**
   * Get service configuration from environment
   */
  static getConfig(env: CloudflareEnv): RoundtableConfig {
    if (!env.ROUNDTABLE_SUPABASE_URL || !env.ROUNDTABLE_SUPABASE_SERVICE_KEY) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Roundtable Supabase configuration not found. Set ROUNDTABLE_SUPABASE_URL and ROUNDTABLE_SUPABASE_SERVICE_KEY.',
      });
    }

    const config = {
      serviceName: 'RoundtableIntegration',
      supabaseUrl: env.ROUNDTABLE_SUPABASE_URL,
      supabaseServiceKey: env.ROUNDTABLE_SUPABASE_SERVICE_KEY,
    };

    return RoundtableConfigSchema.parse(config);
  }

  /**
   * Create a factory method for easy instantiation
   */
  static create(env: CloudflareEnv): RoundtableIntegrationService {
    const config = this.getConfig(env);
    return new RoundtableIntegrationService(config);
  }

  /**
   * Update user's subscription in Roundtable1 database after successful payment
   * Uses identical plan IDs between both projects for simplified integration
   */
  async updateUserSubscription(update: UserPlanUpdate): Promise<void> {
    try {
      const validatedUpdate = UserPlanUpdateSchema.parse(update);

      // First, deactivate all existing user plans
      const updateData: RoundtableUserPlanUpdate = {
        is_active: false,
        ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: deactivateError } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('user_id', validatedUpdate.userId)
        .eq('is_active', true);

      if (deactivateError) {
        throw new Error(`Failed to deactivate existing plans: ${deactivateError.message}`);
      }

      // Create new active plan using the exact same plan ID as billing-dashboard
      const newPlan: RoundtableUserPlanInsert = {
        user_id: validatedUpdate.userId,
        plan_id: validatedUpdate.planId, // Use plan ID directly (same IDs in both projects)
        is_active: true,
        starts_at: validatedUpdate.startsAt || new Date().toISOString(),
        ends_at: validatedUpdate.endsAt || null,
        usage_reset_at: new Date().toISOString(),
        message_count: 0,
        // Set ZarinPal subscription identifiers to ensure proper billing cycle handling
        stripe_subscription_id: validatedUpdate.subscriptionId || `zarinpal_${validatedUpdate.paymentId}`,
        stripe_customer_id: `zarinpal_customer_${validatedUpdate.userId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await this.supabase
        .from('user_plans')
        .insert(newPlan);

      if (insertError) {
        throw new Error(`Failed to create new plan: ${insertError.message}`);
      }
    } catch (error) {
      throw this.handleError(error, 'update user subscription');
    }
  }

  /**
   * Verify user exists in Roundtable1 database
   */
  async verifyUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (error) {
        throw new Error(`Failed to verify user: ${error.message}`);
      }

      return Boolean(data && data.length > 0);
    } catch (error) {
      throw this.handleError(error, 'verify user');
    }
  }

  /**
   * Get user's current plan from Roundtable1 database
   */
  async getUserCurrentPlan(userId: string): Promise<PlanMapping | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_plans')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Failed to get user plan: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const userPlan = data[0];
      if (!userPlan) {
        return null;
      }

      // Parse the response with proper validation
      return PlanMappingSchema.parse({
        planId: userPlan.plan_id,
        name: userPlan.plan?.name || 'Unknown Plan',
        subscriptionId: crypto.randomUUID(), // Generate if needed
        isActive: userPlan.is_active,
        startsAt: userPlan.starts_at,
        endsAt: userPlan.ends_at,
      });
    } catch (error) {
      throw this.handleError(error, 'get user current plan');
    }
  }

  /**
   * Handle subscription cancellation
   */
  async cancelUserSubscription(userId: string): Promise<void> {
    try {
      const updateData: RoundtableUserPlanUpdate = {
        is_active: false,
        ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('user_plans')
        .update(updateData)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      // Assign free plan
      const { data: freePlan, error: freePlanError } = await this.supabase
        .from('plans')
        .select('id')
        .eq('name', 'Free')
        .limit(1);

      if (freePlanError || !freePlan || freePlan.length === 0) {
        throw new Error('Free plan not found');
      }

      const newFreePlan: RoundtableUserPlanInsert = {
        user_id: userId,
        plan_id: freePlan[0]?.id || '37168efc-84e3-48b3-922c-5ee57b27eb5a', // Default to Free plan ID from migration
        is_active: true,
        starts_at: new Date().toISOString(),
        ends_at: null,
        usage_reset_at: new Date().toISOString(),
        message_count: 0,
        // Free plans should have null Stripe IDs (treated as free by roundtable billing logic)
        stripe_subscription_id: null,
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await this.supabase
        .from('user_plans')
        .insert(newFreePlan);

      if (insertError) {
        throw new Error(`Failed to assign free plan: ${insertError.message}`);
      }
    } catch (error) {
      throw this.handleError(error, 'cancel user subscription');
    }
  }

  /**
   * Handle general errors with context
   */
  private handleError(error: unknown, operationName: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Error(`${this.config.serviceName} ${operationName} failed: ${errorMessage}`);
  }
}
