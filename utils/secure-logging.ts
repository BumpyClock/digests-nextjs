/**
 * Secure logging utilities to prevent sensitive data exposure
 */

// Sensitive header names that should be sanitized
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'x-auth-token',
  'cookie',
  'x-csrf-token',
  'proxy-authorization',
  'x-forwarded-for',
  'x-real-ip',
]);

// Sensitive URL patterns that should be redacted
const SENSITIVE_URL_PATTERNS = [
  /\/api\/auth\/.*$/i,
  /[?&](api_key|token|auth|password|secret)=[^&]*/gi,
];

/**
 * Sanitizes headers by removing or masking sensitive values
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 100) {
      // Truncate very long header values
      sanitized[key] = `${value.substring(0, 100)}... [TRUNCATED]`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes URL by removing sensitive parameters
 */
export function sanitizeUrl(url: string): string {
  let sanitized = url;
  
  for (const pattern of SENSITIVE_URL_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.includes('=')) {
        const [param] = match.split('=');
        return `${param}=[REDACTED]`;
      }
      return '[REDACTED_PATH]';
    });
  }
  
  return sanitized;
}

/**
 * Sanitizes request configuration for logging
 */
export function sanitizeRequestConfig(config: {
  url?: string;
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}) {
  return {
    ...config,
    url: config.url ? sanitizeUrl(config.url) : config.url,
    headers: config.headers ? sanitizeHeaders(config.headers) : config.headers,
  };
}

/**
 * Safe logger that automatically sanitizes sensitive data
 */
export class SecureLogger {
  static debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedData = data && typeof data === 'object' && data !== null
        ? sanitizeRequestConfig(data as Record<string, unknown>)
        : data;
      
      console.debug(message, sanitizedData);
    }
  }

  static info(message: string, data?: unknown) {
    const sanitizedData = data && typeof data === 'object' && data !== null
      ? sanitizeRequestConfig(data as Record<string, unknown>)
      : data;
    
    console.info(message, sanitizedData);
  }

  static warn(message: string, data?: unknown) {
    const sanitizedData = data && typeof data === 'object' && data !== null
      ? sanitizeRequestConfig(data as Record<string, unknown>)
      : data;
    
    console.warn(message, sanitizedData);
  }

  static error(message: string, data?: unknown) {
    const sanitizedData = data && typeof data === 'object' && data !== null
      ? sanitizeRequestConfig(data as Record<string, unknown>)
      : data;
    
    console.error(message, sanitizedData);
  }
}