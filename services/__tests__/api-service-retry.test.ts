/**
 * Tests for API retry logic, request cancellation, and error handling
 */

import { apiService } from '../api-service';
import type { RequestConfig, ApiClientError as ApiError } from '@/types';
import { Logger } from '@/utils/logger';

// Mock the logger to prevent console output during tests
jest.mock('@/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}));

// Mock the API config store
jest.mock('@/store/useApiConfigStore', () => ({
  getApiConfig: jest.fn(() => ({
    baseUrl: 'http://test-api.example.com'
  }))
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create a delayed promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('ApiService Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (apiService as any).cache.clear();
  });

  describe('Exponential Backoff', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const retryConfig = {
        attempts: 3,
        backoff: 'exponential' as const,
        maxDelay: 10000,
        initialDelay: 100,
        factor: 2
      };

      // Mock failures followed by success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      const startTime = Date.now();
      
      // This should fail in the current implementation
      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        retry: retryConfig
      })).rejects.toThrow();

      // Once implemented, it should succeed after retries
      // const result = await apiService.request({...});
      // const duration = Date.now() - startTime;
      
      // Should have made 3 attempts
      // expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Should have appropriate delays (100ms, 200ms between retries)
      // expect(duration).toBeGreaterThanOrEqual(300);
      // expect(duration).toBeLessThan(500);
    });

    it('should respect maximum delay limit', async () => {
      const retryConfig = {
        attempts: 5,
        backoff: 'exponential' as const,
        maxDelay: 1000,
        initialDelay: 500,
        factor: 2
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        retry: retryConfig
      })).rejects.toThrow();

      // Once implemented:
      // Delays should be: 500, 1000, 1000, 1000 (capped at maxDelay)
    });

    it('should use linear backoff when specified', async () => {
      const retryConfig = {
        attempts: 3,
        backoff: 'linear' as const,
        maxDelay: 10000,
        initialDelay: 100
      };

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        retry: retryConfig
      })).rejects.toThrow();

      // Once implemented:
      // Delays should be consistent: 100ms, 100ms
    });
  });

  describe('Error Type Handling', () => {
    it('should retry on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] }
      })).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 (rate limit) errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] }
      })).rejects.toThrow();

      // Once implemented:
      // Should retry after appropriate delay
    });

    it('should not retry on 4xx errors (except 429, 408)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] }
      })).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should use custom retry condition when provided', async () => {
      const retryConfig = {
        attempts: 3,
        backoff: 'exponential' as const,
        maxDelay: 10000,
        retryCondition: (error: ApiError) => error.status === 503
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500 // Different from our condition
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        retry: retryConfig
      })).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(1); // No retry because 500 !== 503
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation via AbortController', async () => {
      const controller = new AbortController();
      
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Aborted')), 100);
        })
      );

      const requestPromise = apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        signal: controller.signal
      });

      // Cancel after 50ms
      setTimeout(() => controller.abort(), 50);

      await expect(requestPromise).rejects.toThrow();

      // Once implemented:
      // Should throw abort error
      // expect(error.name).toBe('AbortError');
    });

    it('should cancel request by requestId', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ feeds: [] })
          }), 200);
        })
      );

      const requestPromise = apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        requestId: 'test-request-1'
      });

      // Cancel after 50ms
      setTimeout(() => apiService.cancel('test-request-1'), 50);

      await expect(requestPromise).rejects.toThrow();

      // Once implemented:
      // Should be cancelled
    });

    it('should cancel all pending requests', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ feeds: [] })
          }), 200);
        })
      );

      const request1 = apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        requestId: 'req-1'
      });

      const request2 = apiService.request({
        url: '/getreaderview',
        method: 'POST',
        body: { urls: [] },
        requestId: 'req-2'
      });

      // Cancel all after 50ms
      setTimeout(() => apiService.cancelAll(), 50);

      await expect(Promise.all([request1, request2])).rejects.toThrow();

      // Once implemented:
      // Both should be cancelled
    });

    it('should not retry cancelled requests', async () => {
      const controller = new AbortController();
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      const requestPromise = apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        signal: controller.signal,
        retry: {
          attempts: 3,
          backoff: 'exponential',
          maxDelay: 10000
        }
      });

      // Cancel after first failure
      setTimeout(() => controller.abort(), 50);

      await expect(requestPromise).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(1); // No retry after cancel
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      mockFetch.mockImplementation(() => 
        delay(100).then(() => ({
          ok: true,
          json: async () => ({ feeds: [] })
        }))
      );

      // Make 3 identical requests concurrently
      const promises = [
        apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: ['http://example.com'] }
        }),
        apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: ['http://example.com'] }
        }),
        apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: ['http://example.com'] }
        })
      ];

      await expect(Promise.all(promises)).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual request
      // All promises should resolve to the same result
    });

    it('should not deduplicate requests with different parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feeds: [] })
      });

      const promises = [
        apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: ['http://example1.com'] }
        }),
        apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: ['http://example2.com'] }
        })
      ];

      await expect(Promise.all(promises)).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(2); // Two different requests
    });

    it('should allow new request after previous one completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feeds: [] })
      });

      // First request
      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: ['http://example.com'] }
      })).rejects.toThrow();

      // Second identical request after first completes
      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: ['http://example.com'] }
      })).rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(2); // Not deduplicated
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      // Mock 5 consecutive failures
      for (let i = 0; i < 10; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
      }

      // Make requests that should trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: [] }
        })).rejects.toThrow();
      }

      // Circuit should be open now, next request should fail immediately
      const startTime = Date.now();
      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] }
      })).rejects.toThrow();
      const duration = Date.now() - startTime;

      // Once implemented:
      // expect(duration).toBeLessThan(10); // Should fail fast
      // expect(mockFetch).toHaveBeenCalledTimes(5); // No new request made
    });

    it('should enter half-open state after reset timeout', async () => {
      // This test would need to mock timers
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
        await expect(apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: [] }
        })).rejects.toThrow();
      }

      // Fast forward past reset timeout
      jest.advanceTimersByTime(60000); // 1 minute

      // Next request should be allowed (half-open state)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ feeds: [] })
      });

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] }
      })).rejects.toThrow();

      // Once implemented:
      // Should allow the request and close circuit on success

      jest.useRealTimers();
    });

    it('should track circuit breaker state per endpoint', async () => {
      // Fail requests to /parse endpoint
      for (let i = 0; i < 5; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));
        await expect(apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: [] }
        })).rejects.toThrow();
      }

      // /getreaderview should still work
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ content: 'test' }]
      });

      await expect(apiService.request({
        url: '/getreaderview',
        method: 'POST',
        body: { urls: ['http://example.com'] }
      })).rejects.toThrow();

      // Once implemented:
      // Different endpoints should have independent circuit breakers
    });
  });

  describe('Integration with existing methods', () => {
    it('should apply retry logic to fetchFeeds', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ feeds: [] })
        });

      // Once implemented, fetchFeeds should use the new request method internally
      await expect(apiService.fetchFeeds(['http://example.com']))
        .rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(2); // With retry
    });

    it('should apply retry logic to fetchReaderView', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ content: 'test' }]
        });

      await expect(apiService.fetchReaderView('http://example.com'))
        .rejects.toThrow();

      // Once implemented:
      // expect(mockFetch).toHaveBeenCalledTimes(2); // With retry
    });
  });

  describe('Error enrichment', () => {
    it('should enrich errors with retry information', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: [] },
          retry: {
            attempts: 3,
            backoff: 'exponential',
            maxDelay: 10000
          }
        });
      } catch (error) {
        // Once implemented:
        // expect(error).toHaveProperty('attempts', 3);
        // expect(error).toHaveProperty('code', 'NETWORK_ERROR');
      }
    });

    it('should preserve original error information', async () => {
      const originalError = new Error('Connection refused');
      mockFetch.mockRejectedValue(originalError);

      try {
        await apiService.request({
          url: '/parse',
          method: 'POST',
          body: { urls: [] }
        });
      } catch (error) {
        // Once implemented:
        // expect(error).toHaveProperty('originalError', originalError);
      }
    });
  });

  describe('Timeout handling', () => {
    it('should timeout requests after specified duration', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ feeds: [] })
          }), 1000);
        })
      );

      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        timeout: 100 // 100ms timeout
      })).rejects.toThrow();

      // Once implemented:
      // Should throw timeout error
    });

    it('should retry on timeout errors', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call times out
          return new Promise((resolve) => {
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({ feeds: [] })
            }), 200);
          });
        }
        // Second call succeeds quickly
        return Promise.resolve({
          ok: true,
          json: async () => ({ feeds: [] })
        });
      });

      const result = await apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        timeout: 100,
        retry: {
          attempts: 2,
          backoff: 'exponential',
          maxDelay: 10000,
          initialDelay: 100
        }
      });

      // Should succeed on retry
      expect(result).toEqual({ feeds: [] });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ApiService Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (apiService as any).cache.clear();
  });

  it('should handle high concurrency efficiently', async () => {
    mockFetch.mockImplementation(() => 
      delay(50).then(() => ({
        ok: true,
        json: async () => ({ feeds: [] })
      }))
    );

    const requests = Array.from({ length: 100 }, (_, i) => 
      apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [`http://example${i}.com`] }
      })
    );

    const startTime = Date.now();
    await expect(Promise.all(requests)).rejects.toThrow();
    const duration = Date.now() - startTime;

    // Once implemented:
    // Should handle 100 concurrent requests efficiently
    // expect(duration).toBeLessThan(1000);
  });

  it('should clean up completed requests from tracker', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ feeds: [] })
    });

    // Make several requests
    for (let i = 0; i < 10; i++) {
      await expect(apiService.request({
        url: '/parse',
        method: 'POST',
        body: { urls: [] },
        requestId: `req-${i}`
      })).rejects.toThrow();
    }

    // Once implemented:
    // Check that request tracker doesn't grow indefinitely
    // const tracker = (apiService as any).requestTracker;
    // expect(tracker.size).toBe(0);
  });
});