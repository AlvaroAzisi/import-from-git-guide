/**
 * Error handling utilities for production-safe error management
 * - Prevents sensitive database/schema information from leaking to console
 * - Maps internal errors to user-friendly messages
 */

const isDev = import.meta.env.DEV;

/**
 * Log errors in development only, suppress in production
 * In production, errors should be sent to monitoring service
 */
export const logError = (context: string, error: any) => {
  if (isDev) {
    console.error(`[${context}]`, error);
  }
  // In production, send to error tracking service
  // e.g., Sentry.captureException(error, { tags: { context } });
};

/**
 * Get user-friendly error message from internal error
 * Prevents leaking database schema/implementation details
 */
export const getUserMessage = (error: any): string => {
  // PostgreSQL error codes
  const errorCode = error?.code || error?.error_code;
  
  const errorMap: Record<string, string> = {
    '23505': 'This item already exists',
    '23503': 'Referenced item not found',
    '23502': 'Required field is missing',
    '42501': 'Permission denied',
    'PGRST116': 'Not found',
    'PGRST': 'Database operation failed',
  };

  // Check for specific error code
  if (errorCode && errorMap[errorCode]) {
    return errorMap[errorCode];
  }

  // Check for partial matches (e.g., PGRST*)
  for (const [prefix, message] of Object.entries(errorMap)) {
    if (errorCode?.startsWith(prefix)) {
      return message;
    }
  }

  // Check for common error messages
  const errorMessage = error?.message || String(error);
  if (errorMessage.includes('violates row-level security')) {
    return 'Permission denied';
  }
  if (errorMessage.includes('duplicate key')) {
    return 'This item already exists';
  }
  if (errorMessage.includes('foreign key')) {
    return 'Referenced item not found';
  }

  // Generic fallback
  return 'An error occurred. Please try again later.';
};

/**
 * Safe error wrapper for async operations
 * Returns tuple of [data, error] for clean error handling
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  context: string
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    logError(context, error);
    return [null, error as Error];
  }
}
