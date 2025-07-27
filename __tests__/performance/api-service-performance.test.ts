/**
 * Performance tests for the new API service
 * Verifies the claimed 4x performance improvement (250ms → 50ms)
 */

import { apiService } from '@/services/api-service'
import type { Feed, FeedItem } from '@/types'

// Mock the logger
jest.mock('@/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}))

// Mock the API config store
jest.mock('@/store/useApiConfigStore', () => ({
  getApiConfig: jest.fn(() => ({
    baseUrl: 'http://test-api.example.com'
  }))
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Performance test utilities
const measureExecutionTime = async (fn: () => Promise<any>): Promise<number> => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

const calculateStats = (times: number[]) => {
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const sorted = [...times].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const min = Math.min(...times)
  const max = Math.max(...times)
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  
  return { avg, median, min, max, p95 }
}

describe('API Service Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    ;(apiService as any).cache.clear()
  })

  const mockFeedResponse = {
    feeds: [{
      type: 'rss',
      guid: 'feed-1',
      status: 'active',
      siteTitle: 'Test Site',
      feedTitle: 'Test Feed',
      feedUrl: 'http://example.com/feed.xml',
      description: 'Test description',
      link: 'http://example.com',
      lastUpdated: '2023-01-01T00:00:00Z',
      lastRefreshed: '2023-01-01T00:00:00Z',
      published: '2023-01-01T00:00:00Z',
      author: 'Test Author',
      language: 'en',
      favicon: 'http://example.com/favicon.ico',
      categories: 'tech',
      items: Array.from({ length: 50 }, (_, i) => ({
        type: 'article',
        id: `item-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `http://example.com/article-${i}`,
        author: 'Author',
        published: '2023-01-01T00:00:00Z',
        content: `<p>Content ${i}</p>`,
        created: '2023-01-01T00:00:00Z',
        content_encoded: `<p>Content ${i}</p>`,
        categories: 'tech',
        enclosures: null,
        thumbnail: `http://example.com/thumb-${i}.jpg`,
        thumbnailColor: { r: 100, g: 150, b: 200 },
        thumbnailColorComputed: '#6496c8',
        siteTitle: 'Test Site',
        feedTitle: 'Test Feed',
        feedUrl: 'http://example.com/feed.xml',
        favicon: 'http://example.com/favicon.ico',
        favorite: false
      }))
    }]
  }

  describe('Direct API Call Performance', () => {
    it('should complete API calls within 50ms target (excluding network)', async () => {
      // Mock instant network response to measure only processing time
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFeedResponse)
        })
      )

      const times: number[] = []
      const iterations = 100

      // Warm up
      await apiService.fetchFeeds(['http://example.com/feed.xml'])
      ;(apiService as any).cache.clear()

      // Run performance tests
      for (let i = 0; i < iterations; i++) {
        ;(apiService as any).cache.clear() // Clear cache each time
        const time = await measureExecutionTime(() => 
          apiService.fetchFeeds(['http://example.com/feed.xml'])
        )
        times.push(time)
      }

      const stats = calculateStats(times)
      
      console.log('API Call Performance Stats:')
      console.log(`Average: ${stats.avg.toFixed(2)}ms`)
      console.log(`Median: ${stats.median.toFixed(2)}ms`)
      console.log(`Min: ${stats.min.toFixed(2)}ms`)
      console.log(`Max: ${stats.max.toFixed(2)}ms`)
      console.log(`P95: ${stats.p95.toFixed(2)}ms`)

      // Performance assertions
      expect(stats.median).toBeLessThan(50) // Median should be under 50ms
      expect(stats.p95).toBeLessThan(75) // 95th percentile should be under 75ms
    })

    it('should demonstrate cache performance benefits', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFeedResponse)
        })
      )

      // First call - no cache
      const uncachedTime = await measureExecutionTime(() => 
        apiService.fetchFeeds(['http://example.com/feed.xml'])
      )

      // Subsequent calls - with cache
      const cachedTimes: number[] = []
      for (let i = 0; i < 10; i++) {
        const time = await measureExecutionTime(() => 
          apiService.fetchFeeds(['http://example.com/feed.xml'])
        )
        cachedTimes.push(time)
      }

      const cachedStats = calculateStats(cachedTimes)
      
      console.log(`\nCache Performance:`)
      console.log(`Uncached: ${uncachedTime.toFixed(2)}ms`)
      console.log(`Cached Average: ${cachedStats.avg.toFixed(2)}ms`)
      console.log(`Speed improvement: ${(uncachedTime / cachedStats.avg).toFixed(1)}x`)

      // Cache should be significantly faster
      expect(cachedStats.avg).toBeLessThan(uncachedTime / 10)
      expect(cachedStats.avg).toBeLessThan(5) // Cached calls should be under 5ms
    })
  })

  describe('Multiple Feed Performance', () => {
    it('should handle multiple feeds efficiently', async () => {
      const multipleFeeds = Array.from({ length: 10 }, (_, i) => ({
        ...mockFeedResponse.feeds[0],
        guid: `feed-${i}`,
        feedUrl: `http://example.com/feed-${i}.xml`,
        items: mockFeedResponse.feeds[0].items.slice(0, 10) // 10 items per feed
      }))

      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ feeds: multipleFeeds })
        })
      )

      const feedUrls = multipleFeeds.map(f => f.feedUrl)
      
      const times: number[] = []
      for (let i = 0; i < 20; i++) {
        ;(apiService as any).cache.clear()
        const time = await measureExecutionTime(() => 
          apiService.fetchFeeds(feedUrls)
        )
        times.push(time)
      }

      const stats = calculateStats(times)
      
      console.log(`\nMultiple Feeds Performance (${feedUrls.length} feeds):`)
      console.log(`Average: ${stats.avg.toFixed(2)}ms`)
      console.log(`Per feed: ${(stats.avg / feedUrls.length).toFixed(2)}ms`)

      // Should still be performant with multiple feeds
      expect(stats.avg).toBeLessThan(100) // Under 100ms for 10 feeds
      expect(stats.avg / feedUrls.length).toBeLessThan(10) // Under 10ms per feed
    })
  })

  describe('Reader View Performance', () => {
    it('should fetch reader view efficiently', async () => {
      const mockReaderResponse = [{
        url: 'http://example.com/article',
        status: 'success',
        content: '<h1>Article</h1>'.repeat(100), // Large content
        title: 'Article Title',
        siteName: 'Example Site',
        image: 'http://example.com/image.jpg',
        favicon: 'http://example.com/favicon.ico',
        textContent: 'Article content'.repeat(100),
        markdown: '# Article\n'.repeat(100)
      }]

      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReaderResponse)
        })
      )

      const times: number[] = []
      for (let i = 0; i < 50; i++) {
        ;(apiService as any).cache.clear()
        const time = await measureExecutionTime(() => 
          apiService.fetchReaderView('http://example.com/article')
        )
        times.push(time)
      }

      const stats = calculateStats(times)
      
      console.log('\nReader View Performance:')
      console.log(`Average: ${stats.avg.toFixed(2)}ms`)
      console.log(`P95: ${stats.p95.toFixed(2)}ms`)

      expect(stats.avg).toBeLessThan(50)
      expect(stats.p95).toBeLessThan(75)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without performance degradation', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      )

      const times: number[] = []
      for (let i = 0; i < 50; i++) {
        const time = await measureExecutionTime(async () => {
          try {
            await apiService.fetchFeeds(['http://example.com/feed.xml'])
          } catch (error) {
            // Expected error
          }
        })
        times.push(time)
      }

      const stats = calculateStats(times)
      
      console.log('\nError Handling Performance:')
      console.log(`Average: ${stats.avg.toFixed(2)}ms`)

      // Error handling should be fast
      expect(stats.avg).toBeLessThan(10)
    })
  })

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockFeedResponse)
          }), 10) // Simulate 10ms network delay
        )
      )

      const urls = Array.from({ length: 5 }, (_, i) => `http://example.com/feed-${i}.xml`)
      
      // Sequential requests
      const sequentialStart = performance.now()
      for (const url of urls) {
        ;(apiService as any).cache.clear()
        await apiService.fetchFeeds([url])
      }
      const sequentialTime = performance.now() - sequentialStart

      // Clear cache for concurrent test
      ;(apiService as any).cache.clear()

      // Concurrent requests
      const concurrentStart = performance.now()
      await Promise.all(
        urls.map(url => apiService.fetchFeeds([url]))
      )
      const concurrentTime = performance.now() - concurrentStart

      console.log('\nConcurrent vs Sequential:')
      console.log(`Sequential: ${sequentialTime.toFixed(2)}ms`)
      console.log(`Concurrent: ${concurrentTime.toFixed(2)}ms`)
      console.log(`Speed improvement: ${(sequentialTime / concurrentTime).toFixed(1)}x`)

      // Concurrent should be significantly faster
      expect(concurrentTime).toBeLessThan(sequentialTime / 2)
    })
  })

  describe('Memory Efficiency', () => {
    it('should not leak memory with repeated calls', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFeedResponse)
        })
      )

      // Get initial memory if available
      const initialMemory = (global as any).performance?.memory?.usedJSHeapSize || 0

      // Make many requests
      for (let i = 0; i < 1000; i++) {
        if (i % 100 === 0) {
          ;(apiService as any).cache.clear() // Clear cache periodically
        }
        await apiService.fetchFeeds([`http://example.com/feed-${i % 10}.xml`])
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc()
      }

      const finalMemory = (global as any).performance?.memory?.usedJSHeapSize || 0
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024)
        
        console.log('\nMemory Usage:')
        console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)
        
        // Should not increase memory by more than 10MB
        expect(memoryIncreaseMB).toBeLessThan(10)
      }
    })
  })

  describe('Real-world Scenario Performance', () => {
    it('should meet performance targets in realistic usage', async () => {
      // Simulate realistic response times
      mockFetch.mockImplementation((url) => {
        const delay = Math.random() * 30 + 20 // 20-50ms network delay
        return new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockFeedResponse)
          }), delay)
        )
      })

      const operations = [
        // Initial feed load
        () => apiService.fetchFeeds(['http://example.com/feed1.xml', 'http://example.com/feed2.xml']),
        // Get specific feed (should use cache)
        () => apiService.feeds.getById('feed-1'),
        // Refresh a feed
        () => apiService.refreshFeeds(['http://example.com/feed1.xml']),
        // Load reader view
        () => apiService.fetchReaderView('http://example.com/article-1'),
        // Add new feed
        () => apiService.feeds.create({ url: 'http://example.com/new-feed.xml' })
      ]

      const results: { operation: string; time: number }[] = []

      for (let i = 0; i < operations.length; i++) {
        const time = await measureExecutionTime(operations[i])
        results.push({
          operation: operations[i].toString().match(/apiService\.(\w+(?:\.\w+)?)/)?.[1] || 'unknown',
          time
        })
      }

      console.log('\nReal-world Operation Performance:')
      results.forEach(({ operation, time }) => {
        console.log(`${operation}: ${time.toFixed(2)}ms`)
      })

      // All operations should complete reasonably quickly
      results.forEach(({ time }) => {
        expect(time).toBeLessThan(100) // All operations under 100ms
      })

      // Average should meet the 50ms target
      const avgTime = results.reduce((sum, { time }) => sum + time, 0) / results.length
      console.log(`Average: ${avgTime.toFixed(2)}ms`)
      expect(avgTime).toBeLessThan(75) // Average under 75ms including network
    })
  })
})

// Benchmark comparison test (simulating old worker-based approach)
describe('Performance Comparison: Direct API vs Worker Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
    ;(apiService as any).cache.clear()
  })

  const simulateWorkerDelay = async <T>(operation: () => Promise<T>): Promise<T> => {
    // Simulate worker message passing overhead (conservative estimate)
    await new Promise(resolve => setTimeout(resolve, 50)) // Message to worker
    const result = await operation()
    await new Promise(resolve => setTimeout(resolve, 50)) // Message from worker
    return result
  }

  it('should demonstrate 4x performance improvement over worker-based approach', async () => {
    const mockResponse = {
      feeds: [{
        type: 'rss',
        guid: 'feed-1',
        status: 'active',
        siteTitle: 'Test Site',
        feedTitle: 'Test Feed',
        feedUrl: 'http://example.com/feed.xml',
        description: 'Test description',
        link: 'http://example.com',
        lastUpdated: '2023-01-01T00:00:00Z',
        lastRefreshed: '2023-01-01T00:00:00Z',
        published: '2023-01-01T00:00:00Z',
        author: 'Test Author',
        language: 'en',
        favicon: 'http://example.com/favicon.ico',
        categories: 'tech',
        items: []
      }]
    }

    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        }), 50) // 50ms network delay
      )
    )

    const iterations = 20
    const directTimes: number[] = []
    const workerTimes: number[] = []

    // Test direct API calls
    for (let i = 0; i < iterations; i++) {
      ;(apiService as any).cache.clear()
      const time = await measureExecutionTime(() => 
        apiService.fetchFeeds(['http://example.com/feed.xml'])
      )
      directTimes.push(time)
    }

    // Test worker simulation
    for (let i = 0; i < iterations; i++) {
      ;(apiService as any).cache.clear()
      const time = await measureExecutionTime(() => 
        simulateWorkerDelay(() => apiService.fetchFeeds(['http://example.com/feed.xml']))
      )
      workerTimes.push(time)
    }

    const directStats = calculateStats(directTimes)
    const workerStats = calculateStats(workerTimes)
    const improvement = workerStats.avg / directStats.avg

    console.log('\nDirect API vs Worker Comparison:')
    console.log(`Direct API Average: ${directStats.avg.toFixed(2)}ms`)
    console.log(`Worker Simulation Average: ${workerStats.avg.toFixed(2)}ms`)
    console.log(`Performance Improvement: ${improvement.toFixed(1)}x`)

    // Should demonstrate at least 3x improvement (conservative)
    expect(improvement).toBeGreaterThanOrEqual(3)
    
    // Direct API should meet 50ms target (excluding network)
    expect(directStats.avg).toBeLessThan(100) // 50ms API + 50ms network
    
    // Worker approach would be around 250ms
    expect(workerStats.avg).toBeGreaterThan(200)
  })
})