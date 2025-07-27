/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates if a URL is safe to use
 * @param url - The URL to validate
 * @returns true if the URL is valid and safe
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates if a URL is a valid API endpoint
 * @param url - The URL to validate
 * @returns true if the URL is a valid API endpoint
 */
export function isValidApiUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    // Additional validation for API URLs
    // Ensure no credentials in URL
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a string for safe display in HTML
 * @param input - The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Validates if a feed URL is safe to fetch
 * @param url - The feed URL to validate
 * @returns true if the feed URL is safe
 */
export function isValidFeedUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    
    // Block localhost and private IPs for security
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a secure cache key using SHA-256
 * @param input - The input string to hash
 * @returns The hashed cache key
 */
export async function generateSecureCacheKey(input: string): Promise<string> {
  // Check if we're in Node.js environment first (SSR or tests)
  // In Node.js, process will be defined
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const { createHash } = await import('crypto');
      return createHash('sha256').update(input).digest('hex');
    } catch (e) {
      // Fall through to browser implementation
    }
  }
  
  // For browser environment, use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  throw new Error('No crypto implementation available');
}

/**
 * Validates input length to prevent DoS attacks
 * @param input - The input to validate
 * @param maxLength - Maximum allowed length
 * @returns true if the input length is within limits
 */
export function isValidLength(input: string, maxLength: number = 10000): boolean {
  return input.length <= maxLength;
}

/**
 * Security configuration constants
 */
export const SECURITY_CONFIG = {
  MAX_URL_LENGTH: 2048,
  MAX_FEED_URLS: 100,
  MAX_CACHE_KEY_LENGTH: 1000,
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  BLOCKED_HOSTNAMES: ['localhost', '127.0.0.1'],
} as const;

/**
 * Validates multiple feed URLs
 * @param urls - Array of URLs to validate
 * @returns Object with valid and invalid URLs
 */
export function validateFeedUrls(urls: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  // Limit number of URLs to prevent DoS
  const urlsToCheck = urls.slice(0, SECURITY_CONFIG.MAX_FEED_URLS);
  
  for (const url of urlsToCheck) {
    if (isValidFeedUrl(url) && url.length <= SECURITY_CONFIG.MAX_URL_LENGTH) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }
  
  return { valid, invalid };
}