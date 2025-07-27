/**
 * Integration tests for security utilities with API service
 * Tests security features in real API usage scenarios
 */

import { apiService } from '@/services/api-service';
import * as security from '@/utils/security';
import crypto from 'crypto';

// Mock fetch globally
global.fetch = jest.fn();

describe('Security + API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL Validation in API Calls', () => {
    it('should sanitize and validate URLs before API calls', async () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'https://example.com/feed"><script>alert("XSS")</script>',
        'https://evil.com/redirect?to=javascript:alert("XSS")'
      ];

      // API should reject dangerous URLs
      for (const url of dangerousUrls) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [], items: [] })
        });

        const result = await apiService.fetchFeeds([url]);
        
        // Should return empty results for invalid URLs
        expect(result.feeds).toHaveLength(0);
        expect(result.items).toHaveLength(0);
        
        // Fetch should not be called for dangerous URLs
        expect(global.fetch).not.toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should properly encode URLs with special characters', async () => {
      const urlsWithSpecialChars = [
        'https://example.com/feed?category=tech&lang=en',
        'https://example.com/feed with spaces',
        'https://example.com/feed#section'
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          feeds: urlsWithSpecialChars.map((url, i) => ({
            id: String(i),
            title: `Feed ${i}`,
            url: url,
            site_url: 'https://example.com',
            description: 'Test feed',
            last_fetched: new Date().toISOString(),
            category: 'tech',
            added_at: new Date().toISOString()
          })),
          items: []
        })
      });

      const result = await apiService.fetchFeeds(urlsWithSpecialChars);
      
      // Should handle URLs with special characters
      expect(result.feeds).toHaveLength(urlsWithSpecialChars.length);
    });
  });

  describe('Content Sanitization', () => {
    it('should sanitize HTML content in feed items', async () => {
      const unsafeContent = {
        feeds: [{
          id: '1',
          title: 'Test Feed',
          url: 'https://example.com/feed',
          site_url: 'https://example.com',
          description: '<script>alert("XSS")</script>Safe description',
          last_fetched: new Date().toISOString(),
          category: 'tech',
          added_at: new Date().toISOString()
        }],
        items: [{
          id: '1',
          feed_id: '1',
          title: 'Test Item<script>alert("XSS")</script>',
          url: 'https://example.com/item',
          content_html: '<p>Safe content</p><script>alert("XSS")</script><img src=x onerror="alert(\'XSS\')">',
          published_at: new Date().toISOString(),
          author: 'Author<script>alert("XSS")</script>'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => unsafeContent
      });

      const result = await apiService.fetchFeeds(['https://example.com/feed']);

      // Content should be sanitized
      const feed = result.feeds[0];
      const item = result.items[0];

      // Check that dangerous scripts are removed
      expect(feed.description).not.toContain('<script>');
      expect(item.title).not.toContain('<script>');
      expect(item.content_html).not.toContain('<script>');
      expect(item.content_html).not.toContain('onerror=');
      expect(item.author).not.toContain('<script>');
    });

    it('should sanitize reader view content', async () => {
      const unsafeReaderContent = {
        title: 'Article Title',
        content: `
          <p>Safe paragraph</p>
          <script>alert("XSS")</script>
          <img src="valid.jpg" onerror="alert('XSS')">
          <a href="javascript:alert('XSS')">Dangerous Link</a>
          <iframe src="https://evil.com"></iframe>
        `,
        url: 'https://example.com/article',
        author: 'Author Name',
        published_date: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => unsafeReaderContent
      });

      const result = await apiService.fetchReaderView('https://example.com/article');

      // Dangerous content should be removed
      expect(result.content).not.toContain('<script>');
      expect(result.content).not.toContain('onerror=');
      expect(result.content).not.toContain('javascript:');
      expect(result.content).not.toContain('<iframe');

      // Safe content should remain
      expect(result.content).toContain('<p>Safe paragraph</p>');
      expect(result.content).toContain('<img src="valid.jpg"');
    });
  });

  describe('Cache Key Security', () => {
    it('should generate collision-resistant cache keys', async () => {
      const similarUrls = [
        ['https://example.com/feed1', 'https://example.com/feed2'],
        ['https://example.com/feed2', 'https://example.com/feed1'],
        ['https://example.com/feed', 'https://example.com/feed/'],
        ['https://example.com/feed/', 'https://example.com/feed']
      ];

      const cacheKeys = new Set<string>();

      for (const urls of similarUrls) {
        const sortedUrls = urls.sort().join(',');
        const cacheKey = await security.generateSecureCacheKey(`feeds:${sortedUrls}`);
        
        // Each URL combination should generate a unique cache key
        expect(cacheKeys.has(cacheKey)).toBe(false);
        cacheKeys.add(cacheKey);
      }

      // Different order of same URLs should generate same cache key
      const urls1 = ['https://b.com', 'https://a.com', 'https://c.com'];
      const urls2 = ['https://c.com', 'https://a.com', 'https://b.com'];
      
      const key1 = await security.generateSecureCacheKey(`feeds:${urls1.sort().join(',')}`);
      const key2 = await security.generateSecureCacheKey(`feeds:${urls2.sort().join(',')}`);
      
      expect(key1).toBe(key2);
    });

    it('should handle cache poisoning attempts', async () => {
      const maliciousUrls = [
        'https://example.com/feed?cache_key=../../admin',
        'https://example.com/feed?key=../../../etc/passwd',
        'https://example.com/feed\\..\\..\\windows\\system32'
      ];

      const cacheGetSpy = jest.spyOn((apiService as any).cache, 'get');
      const cacheSetSpy = jest.spyOn((apiService as any).cache, 'set');

      for (const url of maliciousUrls) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [], items: [] })
        });

        await apiService.fetchFeeds([url]);

        // Cache keys should be hashed and safe
        if (cacheGetSpy.mock.calls.length > 0) {
          const cacheKey = cacheGetSpy.mock.calls[0][0];
          expect(cacheKey).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
          expect(cacheKey).not.toContain('..');
          expect(cacheKey).not.toContain('/');
          expect(cacheKey).not.toContain('\\');
        }

        jest.clearAllMocks();
      }
    });
  });

  describe('API Key Security', () => {
    it('should securely handle API keys in requests', async () => {
      const apiKey = 'secret-api-key-12345';
      const fetchSpy = global.fetch as jest.Mock;

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [], items: [] })
      });

      // Set API key
      await apiService.updateApiConfig({ apiKey });

      // Make request
      await apiService.fetchFeeds(['https://example.com/feed']);

      // Check that API key is sent in headers, not URL
      expect(fetchSpy).toHaveBeenCalled();
      const [url, options] = fetchSpy.mock.calls[0];
      
      // URL should not contain API key
      expect(url).not.toContain(apiKey);
      
      // Headers should contain API key
      expect(options.headers).toBeDefined();
      expect(options.headers['X-API-Key']).toBe(apiKey);
    });

    it('should not log sensitive information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const apiKey = 'secret-api-key-12345';

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('API Key invalid')
      );

      await apiService.updateApiConfig({ apiKey });

      try {
        await apiService.fetchFeeds(['https://example.com/feed']);
      } catch (error) {
        // Expected error
      }

      // Console logs should not contain the API key
      consoleSpy.mock.calls.forEach(call => {
        call.forEach(arg => {
          const stringified = JSON.stringify(arg);
          expect(stringified).not.toContain(apiKey);
        });
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Input Validation', () => {
    it('should validate and sanitize feed URLs', async () => {
      const testCases = [
        {
          input: ['https://example.com/feed', 'invalid-url', 'ftp://notallowed.com'],
          expectedValid: ['https://example.com/feed']
        },
        {
          input: ['http://example.com/feed', 'https://valid.com/rss'],
          expectedValid: ['http://example.com/feed', 'https://valid.com/rss']
        },
        {
          input: ['javascript:void(0)', 'data:text/html,test'],
          expectedValid: []
        }
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feeds: testCase.expectedValid.map((url, i) => ({
              id: String(i),
              title: `Feed ${i}`,
              url,
              site_url: url.replace(/\/feed.*$/, ''),
              description: 'Test feed',
              last_fetched: new Date().toISOString(),
              category: 'tech',
              added_at: new Date().toISOString()
            })),
            items: []
          })
        });

        const result = await apiService.fetchFeeds(testCase.input);
        
        // Should only process valid URLs
        expect(result.feeds).toHaveLength(testCase.expectedValid.length);
        result.feeds.forEach(feed => {
          expect(testCase.expectedValid).toContain(feed.url);
        });

        jest.clearAllMocks();
      }
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should handle rate limit responses securely', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() / 1000 + 3600)
        }),
        json: async () => ({
          error: 'Rate limit exceeded',
          retryAfter: 3600
        })
      });

      try {
        await apiService.fetchFeeds(['https://example.com/feed']);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('HTTP_ERROR');
        expect(error.status).toBe(429);
        
        // Should not expose internal rate limit details in error message
        expect(error.message).not.toContain('X-RateLimit');
      }
    });
  });
});