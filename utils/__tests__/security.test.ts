/**
 * Tests for security utilities
 */

import {
  isValidUrl,
  isValidApiUrl,
  sanitizeHtml,
  isValidFeedUrl,
  generateSecureCacheKey,
  isValidLength,
  validateFeedUrls,
  SECURITY_CONFIG,
} from '../security';

// Mock crypto for tests
const mockHashBuffer = new ArrayBuffer(32);
const mockHashArray = new Uint8Array(mockHashBuffer);
// Fill with predictable values for testing
for (let i = 0; i < 32; i++) {
  mockHashArray[i] = i;
}

const mockCrypto = {
  subtle: {
    digest: jest.fn().mockResolvedValue(mockHashBuffer),
  },
};

// Mock TextEncoder for tests
if (typeof TextEncoder === 'undefined') {
  (global as any).TextEncoder = class TextEncoder {
    encode(input: string): Uint8Array {
      const encoded = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        encoded[i] = input.charCodeAt(i);
      }
      return encoded;
    }
  };
}

describe('Security Utilities', () => {
  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/endpoint')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('isValidApiUrl', () => {
    it('should accept valid API URLs', () => {
      expect(isValidApiUrl('https://api.example.com')).toBe(true);
      expect(isValidApiUrl('http://localhost:3000/api')).toBe(true);
    });

    it('should reject URLs with credentials', () => {
      expect(isValidApiUrl('https://user:pass@example.com')).toBe(false);
      expect(isValidApiUrl('http://admin:secret@api.com')).toBe(false);
    });

    it('should reject non-HTTP(S) URLs', () => {
      expect(isValidApiUrl('ftp://api.example.com')).toBe(false);
      expect(isValidApiUrl('ws://api.example.com')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(sanitizeHtml("Hello & <world>")).toBe('Hello &amp; &lt;world&gt;');
      expect(sanitizeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should leave safe strings unchanged', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
      expect(sanitizeHtml('123456789')).toBe('123456789');
    });
  });

  describe('isValidFeedUrl', () => {
    it('should accept valid feed URLs', () => {
      expect(isValidFeedUrl('https://example.com/feed.xml')).toBe(true);
      expect(isValidFeedUrl('http://blog.example.com/rss')).toBe(true);
    });

    it('should reject localhost and private IPs', () => {
      expect(isValidFeedUrl('http://localhost/feed')).toBe(false);
      expect(isValidFeedUrl('https://127.0.0.1/rss')).toBe(false);
      expect(isValidFeedUrl('http://192.168.1.1/feed')).toBe(false);
      expect(isValidFeedUrl('https://10.0.0.1/rss')).toBe(false);
      expect(isValidFeedUrl('http://172.16.0.1/feed')).toBe(false);
    });

    it('should reject invalid protocols', () => {
      expect(isValidFeedUrl('file:///etc/passwd')).toBe(false);
      expect(isValidFeedUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('generateSecureCacheKey', () => {
    it('should generate a hash string', async () => {
      // Test is running in Node.js environment
      const result = await generateSecureCacheKey('test-input');
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate consistent hashes for same input', async () => {
      const input = 'same-input';
      const hash1 = await generateSecureCacheKey(input);
      const hash2 = await generateSecureCacheKey(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await generateSecureCacheKey('input1');
      const hash2 = await generateSecureCacheKey('input2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isValidLength', () => {
    it('should accept strings within limit', () => {
      expect(isValidLength('short string')).toBe(true);
      expect(isValidLength('a'.repeat(100))).toBe(true);
      expect(isValidLength('a'.repeat(10000))).toBe(true);
    });

    it('should reject strings exceeding limit', () => {
      expect(isValidLength('a'.repeat(10001))).toBe(false);
    });

    it('should respect custom limits', () => {
      expect(isValidLength('12345', 5)).toBe(true);
      expect(isValidLength('123456', 5)).toBe(false);
    });
  });

  describe('validateFeedUrls', () => {
    it('should separate valid and invalid URLs', () => {
      const urls = [
        'https://valid.com/feed',
        'http://localhost/feed',
        'invalid-url',
        'https://another-valid.com/rss',
        'file:///etc/passwd',
      ];

      const result = validateFeedUrls(urls);
      
      expect(result.valid).toEqual([
        'https://valid.com/feed',
        'https://another-valid.com/rss',
      ]);
      
      expect(result.invalid).toEqual([
        'http://localhost/feed',
        'invalid-url',
        'file:///etc/passwd',
      ]);
    });

    it('should limit number of URLs processed', () => {
      const urls = Array.from({ length: 150 }, (_, i) => `https://example${i}.com/feed`);
      const result = validateFeedUrls(urls);
      
      expect(result.valid.length + result.invalid.length).toBe(SECURITY_CONFIG.MAX_FEED_URLS);
    });

    it('should reject URLs exceeding length limit', () => {
      const longUrl = `https://example.com/${'a'.repeat(3000)}`;
      const result = validateFeedUrls([longUrl]);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([longUrl]);
    });
  });

  describe('SECURITY_CONFIG', () => {
    it('should have expected configuration values', () => {
      expect(SECURITY_CONFIG.MAX_URL_LENGTH).toBe(2048);
      expect(SECURITY_CONFIG.MAX_FEED_URLS).toBe(100);
      expect(SECURITY_CONFIG.MAX_CACHE_KEY_LENGTH).toBe(1000);
      expect(SECURITY_CONFIG.ALLOWED_PROTOCOLS).toEqual(['http:', 'https:']);
      expect(SECURITY_CONFIG.BLOCKED_HOSTNAMES).toEqual(['localhost', '127.0.0.1']);
    });
  });
});