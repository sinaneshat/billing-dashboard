/**
 * Type-safe logger interfaces based on Context7 Hono documentation
 * Replaces sloppy Record<string, unknown> types with proper interfaces
 */

// Specific context data interfaces for different log types
export type RequestContext = {
  readonly requestId: string;
  readonly userId?: string;
  readonly method: string;
  readonly path: string;
  readonly operation?: string;
  readonly [key: string]: unknown;
};

export type DatabaseContext = {
  readonly table?: string;
  readonly operation: 'select' | 'insert' | 'update' | 'delete' | 'transaction';
  readonly duration?: number;
  readonly affectedRows?: number;
  readonly [key: string]: unknown;
};

export type PaymentContext = {
  readonly paymentId?: string;
  readonly amount?: number;
  readonly currency: string;
  readonly provider: 'zarinpal' | 'stripe' | 'other';
  readonly status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  readonly [key: string]: unknown;
};

export type AuthContext = {
  readonly userId: string;
  readonly action: 'login' | 'logout' | 'token_refresh' | 'permission_check';
  readonly success: boolean;
  readonly [key: string]: unknown;
};

export type ValidationContext = {
  readonly fieldCount: number;
  readonly validationType: 'body' | 'query' | 'params' | 'headers';
  readonly schemaName?: string;
  readonly errors?: Array<{
    field: string;
    message: string;
  }>;
  readonly [key: string]: unknown;
};

export type PerformanceContext = {
  readonly duration: number;
  readonly memoryUsage?: number;
  readonly itemCount?: number;
  readonly cacheHit?: boolean;
  readonly [key: string]: unknown;
};

// Union type for all possible log contexts - allowing flexible data for practical use
export type LogContext =
  | RequestContext
  | DatabaseContext
  | PaymentContext
  | AuthContext
  | ValidationContext
  | PerformanceContext
  | Record<string, unknown>;

// Logger interface with proper typing
export type TypedLogger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, contextOrError?: Error | LogContext, context?: LogContext) => void;
};
