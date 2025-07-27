/**
 * Test utilities for migration validation and testing
 * Provides mock data, validation helpers, and test scenarios
 */

import { AuthBackupService } from '@/lib/persistence/auth-backup'
import { FeedBackupService } from '@/lib/persistence/feed-backup'
import { migrationMonitor } from '@/lib/persistence/migration-monitor'
import type { User, AuthTokens, AuthState } from '@/types/auth'
import type { Feed, FeedItem } from '@/types'

/**
 * Mock data generators for testing
 */
export const MockDataGenerators = {
  /**
   * Generate mock user data
   */
  createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: false,
          feedUpdates: true,
          weeklyDigest: true,
        },
      },
      ...overrides,
    }
  },

  /**
   * Generate mock auth tokens
   */
  createMockTokens(overrides: Partial<AuthTokens> = {}): AuthTokens {
    return {
      accessToken: 'mock-access-token-' + Math.random().toString(36),
      refreshToken: 'mock-refresh-token-' + Math.random().toString(36),
      expiresIn: 3600, // 1 hour
      tokenType: 'Bearer',
      ...overrides,
    }
  },

  /**
   * Generate mock auth state
   */
  createMockAuthState(overrides: Partial<AuthState> = {}): AuthState {
    const user = this.createMockUser()
    const tokens = this.createMockTokens()

    return {
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      ...overrides,
    }
  },

  /**
   * Generate mock feed data
   */
  createMockFeed(overrides: Partial<Feed> = {}): Feed {
    const id = Math.random().toString(36).substr(2, 9)
    
    return {
      type: 'feed',
      guid: `feed-${id}`,
      status: 'active',
      siteTitle: `Test Site ${id}`,
      feedTitle: `Test Feed ${id}`,
      feedUrl: `https://example.com/feeds/${id}.xml`,
      description: `Test feed description for ${id}`,
      link: `https://example.com/site/${id}`,
      lastUpdated: new Date().toISOString(),
      lastRefreshed: new Date().toISOString(),
      published: new Date().toISOString(),
      author: `Author ${id}`,
      language: 'en',
      favicon: `https://example.com/favicon-${id}.ico`,
      categories: 'technology,programming',
      ...overrides,
    }
  },

  /**
   * Generate mock feed item data
   */
  createMockFeedItem(feedUrl: string, overrides: Partial<FeedItem> = {}): FeedItem {
    const id = Math.random().toString(36).substr(2, 9)
    
    return {
      id: `item-${id}`,
      feedUrl,
      title: `Test Article ${id}`,
      description: `Test article description for ${id}`,
      link: `https://example.com/articles/${id}`,
      published: new Date().toISOString(),
      pubDate: new Date().toISOString(),
      author: `Author ${id}`,
      content: `<p>Test article content for ${id}</p>`,
      categories: ['technology', 'programming'],
      ...overrides,
    }
  },

  /**
   * Generate multiple mock feeds with items
   */
  createMockFeedsWithItems(feedCount: number = 5, itemsPerFeed: number = 10): {
    feeds: Feed[]
    items: FeedItem[]
  } {
    const feeds: Feed[] = []
    const items: FeedItem[] = []

    for (let i = 0; i < feedCount; i++) {
      const feed = this.createMockFeed()
      feeds.push(feed)

      for (let j = 0; j < itemsPerFeed; j++) {
        const item = this.createMockFeedItem(feed.feedUrl)
        items.push(item)
      }
    }

    return { feeds, items }
  },

  /**
   * Generate mock Zustand store state
   */
  createMockZustandState(overrides: any = {}): any {
    const { feeds, items } = this.createMockFeedsWithItems(3, 5)
    
    return {
      feeds,
      feedItems: items,
      readItems: new Set(['item-1', 'item-2']),
      readLaterItems: new Set(['item-3']),
      activeFeed: feeds[0]?.feedUrl || null,
      initialized: true,
      hydrated: true,
      ...overrides,
    }
  },
}

/**
 * Migration test scenarios
 */
export const MigrationTestScenarios = {
  /**
   * Test successful auth migration
   */
  async testAuthMigrationSuccess(): Promise<boolean> {
    try {
      const mockAuthState = MockDataGenerators.createMockAuthState()
      const authBackup = new AuthBackupService()
      
      // Create backup
      const backupId = await authBackup.createBackup(mockAuthState)
      
      // Validate backup
      const isValid = await authBackup.validateBackup(backupId)
      
      // Check migration status
      const status = await authBackup.getMigrationStatus()
      
      return isValid && status?.canRollback === true
    } catch (error) {
      console.error('Auth migration test failed:', error)
      return false
    }
  },

  /**
   * Test successful feed migration
   */
  async testFeedMigrationSuccess(): Promise<boolean> {
    try {
      const mockFeedState = MockDataGenerators.createMockZustandState()
      const feedBackup = new FeedBackupService()
      
      // Create backup
      const backupId = await feedBackup.createBackup(mockFeedState)
      
      // Validate backup
      const isValid = await feedBackup.validateBackup(backupId)
      
      // Check migration status
      const status = await feedBackup.getMigrationStatus()
      
      return isValid && status?.canRollback === true
    } catch (error) {
      console.error('Feed migration test failed:', error)
      return false
    }
  },

  /**
   * Test migration rollback functionality
   */
  async testMigrationRollback(): Promise<boolean> {
    try {
      const authBackup = new AuthBackupService()
      const feedBackup = new FeedBackupService()
      
      // Create test backups
      const authState = MockDataGenerators.createMockAuthState()
      const feedState = MockDataGenerators.createMockZustandState()
      
      await authBackup.createBackup(authState)
      await feedBackup.createBackup(feedState)
      
      // Simulate migration failure and rollback
      await authBackup.updateMigrationStatus({ phase: 'failed', error: 'Test failure' })
      await feedBackup.updateMigrationStatus({ phase: 'failed', error: 'Test failure' })
      
      // Attempt rollback
      const authRollback = await authBackup.attemptAutoRollback()
      const feedRollback = await feedBackup.attemptAutoRollback()
      
      return authRollback && feedRollback
    } catch (error) {
      console.error('Rollback test failed:', error)
      return false
    }
  },

  /**
   * Test migration monitoring
   */
  async testMigrationMonitoring(): Promise<boolean> {
    try {
      // Test pre-migration checks
      const preChecks = await migrationMonitor.runPreMigrationChecks()
      
      // Test health status
      const health = await migrationMonitor.getHealthStatus()
      
      // Test global status
      const status = await migrationMonitor.getGlobalStatus()
      
      return preChecks.passed && health.healthy && status.phase === 'not-started'
    } catch (error) {
      console.error('Migration monitoring test failed:', error)
      return false
    }
  },

  /**
   * Test data consistency validation
   */
  async testDataConsistency(): Promise<boolean> {
    try {
      const feedBackup = new FeedBackupService()
      const zustandState = MockDataGenerators.createMockZustandState()
      const reactQueryState = {
        feeds: zustandState.feeds,
        items: zustandState.feedItems,
      }
      
      // Compare states
      const comparison = await feedBackup.compareStates(zustandState, reactQueryState)
      
      return comparison.isConsistent
    } catch (error) {
      console.error('Data consistency test failed:', error)
      return false
    }
  },
}

/**
 * Test validation utilities
 */
export const ValidationHelpers = {
  /**
   * Validate auth state structure
   */
  validateAuthState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      (state.user === null || (typeof state.user === 'object' && state.user.id)) &&
      (state.tokens === null || (typeof state.tokens === 'object' && state.tokens.accessToken)) &&
      typeof state.isAuthenticated === 'boolean'
    )
  },

  /**
   * Validate feed state structure
   */
  validateFeedState(state: any): boolean {
    return (
      state &&
      typeof state === 'object' &&
      Array.isArray(state.feeds) &&
      Array.isArray(state.feedItems) &&
      (state.readItems instanceof Set || Array.isArray(state.readItems)) &&
      typeof state.initialized === 'boolean'
    )
  },

  /**
   * Validate backup data integrity
   */
  validateBackupData(backup: any): boolean {
    return (
      backup &&
      typeof backup === 'object' &&
      backup.zustandState &&
      backup.metadata &&
      backup.checksum &&
      typeof backup.metadata.timestamp === 'number'
    )
  },

  /**
   * Validate migration status
   */
  validateMigrationStatus(status: any): boolean {
    const validPhases = ['not-started', 'in-progress', 'completed', 'failed', 'rolled-back']
    
    return (
      status &&
      typeof status === 'object' &&
      validPhases.includes(status.phase) &&
      typeof status.progress === 'number' &&
      status.progress >= 0 &&
      status.progress <= 1 &&
      typeof status.retryCount === 'number' &&
      typeof status.autoRollback === 'boolean' &&
      typeof status.canRollback === 'boolean'
    )
  },
}

/**
 * Test environment setup utilities
 */
export const TestEnvironmentUtils = {
  /**
   * Set up test environment variables
   */
  setupTestEnvironment(): void {
    // Set test-specific environment variables
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_MIGRATION_TIMEOUT = '30000' // 30 seconds for tests
    process.env.NEXT_PUBLIC_MIGRATION_AUTO_ROLLBACK = 'false'
    process.env.NEXT_PUBLIC_MIGRATION_VERBOSE_LOGGING = 'false'
    process.env.NEXT_PUBLIC_RQ_AUTH = 'false'
    process.env.NEXT_PUBLIC_RQ_FEEDS = 'false'
  },

  /**
   * Clean up test environment
   */
  cleanupTestEnvironment(): void {
    // Clear test storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
  },

  /**
   * Mock IndexedDB for testing
   */
  mockIndexedDB(): void {
    if (typeof window !== 'undefined' && !window.indexedDB) {
      // Simple IndexedDB mock for testing environments
      (window as any).indexedDB = {
        open: jest.fn().mockResolvedValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn().mockResolvedValue({}),
            get: jest.fn().mockResolvedValue(null),
            put: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
          }),
        }),
      }
    }
  },

  /**
   * Create test query client
   */
  createTestQueryClient(): any {
    // Return a mock query client for testing
    return {
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
      removeQueries: jest.fn(),
      clear: jest.fn(),
      cancelQueries: jest.fn(),
      prefetchQuery: jest.fn(),
    }
  },
}

/**
 * Performance testing utilities
 */
export const PerformanceTestUtils = {
  /**
   * Measure migration performance
   */
  async measureMigrationPerformance<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number; memoryUsed: number }> {
    const startTime = Date.now()
    const startMemory = this.getMemoryUsage()
    
    try {
      const result = await operation()
      const endTime = Date.now()
      const endMemory = this.getMemoryUsage()
      
      const duration = endTime - startTime
      const memoryUsed = endMemory - startMemory
      
      console.log(`[Performance] ${label}: ${duration}ms, Memory: ${memoryUsed}bytes`)
      
      return { result, duration, memoryUsed }
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      console.error(`[Performance] ${label} failed after ${duration}ms:`, error)
      throw error
    }
  },

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // @ts-ignore - memory property exists in Chrome
      const memory = (performance as any).memory
      return memory ? memory.usedJSHeapSize : 0
    }
    return 0
  },

  /**
   * Test large dataset migration
   */
  async testLargeDatasetMigration(feedCount: number = 100, itemsPerFeed: number = 1000): Promise<{
    success: boolean
    duration: number
    memoryPeak: number
  }> {
    const { feeds, items } = MockDataGenerators.createMockFeedsWithItems(feedCount, itemsPerFeed)
    
    const performance = await this.measureMigrationPerformance(async () => {
      const feedBackup = new FeedBackupService()
      const mockState = { 
        feeds, 
        feedItems: items, 
        readItems: new Set(), 
        readLaterItems: new Set(),
        activeFeed: null,
        initialized: true 
      }
      
      return await feedBackup.createBackup(mockState)
    }, `Large dataset migration (${feedCount} feeds, ${items.length} items)`)
    
    return {
      success: true,
      duration: performance.duration,
      memoryPeak: performance.memoryUsed,
    }
  },
}

/**
 * Export all test utilities
 */
export const MigrationTestUtils = {
  MockDataGenerators,
  MigrationTestScenarios,
  ValidationHelpers,
  TestEnvironmentUtils,
  PerformanceTestUtils,
}

/**
 * Jest test helpers
 */
export const JestHelpers = {
  /**
   * Create async test with timeout
   */
  createAsyncTest(testFn: () => Promise<void>, timeout: number = 30000) {
    return async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout)
      })
      
      await Promise.race([testFn(), timeoutPromise])
    }
  },

  /**
   * Mock React Query for testing
   */
  mockReactQuery() {
    return {
      useQuery: jest.fn(),
      useMutation: jest.fn(),
      useQueryClient: jest.fn().mockReturnValue(TestEnvironmentUtils.createTestQueryClient()),
    }
  },

  /**
   * Mock migration services
   */
  mockMigrationServices() {
    return {
      authBackupService: {
        createBackup: jest.fn(),
        validateBackup: jest.fn(),
        rollbackToBackup: jest.fn(),
        getMigrationStatus: jest.fn(),
      },
      feedBackupService: {
        createBackup: jest.fn(),
        validateBackup: jest.fn(),
        rollbackToBackup: jest.fn(),
        getMigrationStatus: jest.fn(),
      },
      migrationMonitor: {
        getGlobalStatus: jest.fn(),
        runPreMigrationChecks: jest.fn(),
        getHealthStatus: jest.fn(),
      },
    }
  },
}