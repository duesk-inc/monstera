// HTTP Status Codes
export const HTTP_STATUS = {
  // Success codes
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirect codes
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  // Maximum number of retry attempts
  MAX_ATTEMPTS: 3,
  
  // Base delay between retries (in milliseconds)
  BASE_DELAY: 1000,
  
  // Maximum delay between retries (in milliseconds)
  MAX_DELAY: 10000,
  
  // Backoff multiplier for exponential backoff
  BACKOFF_MULTIPLIER: 2,
  
  // HTTP status codes that should trigger a retry
  RETRYABLE_STATUS_CODES: [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.BAD_GATEWAY,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.GATEWAY_TIMEOUT,
  ],
  
  // HTTP methods that are safe to retry
  RETRYABLE_METHODS: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
} as const;

// Network timeout configuration
export const NETWORK_TIMEOUTS = {
  // Default request timeout (in milliseconds)
  DEFAULT: 30000,
  
  // Short timeout for quick requests
  SHORT: 5000,
  
  // Long timeout for large uploads/downloads
  LONG: 120000,
  
  // Connection timeout
  CONNECT: 10000,
} as const;

// Type exports
export type HttpStatus = typeof HTTP_STATUS;
export type RetryConfig = typeof RETRY_CONFIG;
export type NetworkTimeouts = typeof NETWORK_TIMEOUTS;