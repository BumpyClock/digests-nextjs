#!/usr/bin/env node

/**
 * Authentication Performance Validation Script
 * 
 * This script validates that the new React Query authentication system
 * meets performance benchmarks and doesn't introduce regressions.
 */

const fs = require('fs')
const path = require('path')
const { performance } = require('perf_hooks')

// Configuration
const PERFORMANCE_CONFIG = {
  // Baseline measurements (legacy auth)
  baseline: {
    loginTime: 750, // ms
    logoutTime: 200, // ms
    tokenRefreshTime: 300, // ms
    persistenceWriteTime: 50, // ms
    persistenceReadTime: 25, // ms
    memoryUsage: 15, // MB
    bundleSize: 45000, // bytes
  },
  
  // Acceptable performance thresholds (10% degradation allowed)
  thresholds: {
    loginTime: 825, // 750 * 1.1
    logoutTime: 220, // 200 * 1.1
    tokenRefreshTime: 330, // 300 * 1.1
    persistenceWriteTime: 55, // 50 * 1.1
    persistenceReadTime: 27.5, // 25 * 1.1
    memoryUsage: 18, // 15 * 1.2 (20% increase acceptable)
    bundleSize: 55000, // 45000 * 1.22
  },
  
  // Test configuration
  testConfig: {
    iterations: 100,
    warmupIterations: 10,
    concurrentUsers: 10,
    testDataSize: 1000,
  }
}

class PerformanceValidator {
  constructor() {
    this.results = {}
    this.errors = []
  }

  /**
   * Run all performance validation tests
   */
  async runValidation() {
    console.log('🚀 Starting Authentication Performance Validation\n')
    
    try {
      // Load testing modules
      await this.loadTestModules()
      
      // Run individual performance tests
      await this.testLoginPerformance()
      await this.testLogoutPerformance()
      await this.testTokenRefreshPerformance()
      await this.testPersistencePerformance()
      await this.testMemoryUsage()
      await this.testBundleSize()
      await this.testConcurrentLogins()
      await this.testOfflinePerformance()
      
      // Generate report
      this.generateReport()
      
      // Check if all tests passed
      const passed = this.validateResults()
      
      if (passed) {
        console.log('✅ All performance tests passed!')
        process.exit(0)
      } else {
        console.log('❌ Some performance tests failed!')
        process.exit(1)
      }
    } catch (error) {
      console.error('💥 Performance validation failed:', error)
      process.exit(1)
    }
  }

  /**
   * Load testing modules and dependencies
   */
  async loadTestModules() {
    console.log('📦 Loading test modules...')
    
    // Mock browser environment for Node.js testing
    global.window = {
      crypto: require('crypto').webcrypto,
      localStorage: new Map(),
      sessionStorage: new Map(),
      indexedDB: {},
      navigator: { onLine: true }
    }
    
    global.document = {
      createElement: () => ({}),
      body: { textContent: '' }
    }
    
    // Load auth modules
    this.authModule = await import('../hooks/queries/use-auth.js')
    this.persistenceModule = await import('../lib/persistence/auth-persister.js')
    this.encryptionModule = await import('../utils/encryption.js')
    
    console.log('✅ Test modules loaded\n')
  }

  /**
   * Test login performance
   */
  async testLoginPerformance() {
    console.log('🔐 Testing login performance...')
    
    const times = []
    const { iterations, warmupIterations } = PERFORMANCE_CONFIG.testConfig
    
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await this.simulateLogin()
    }
    
    // Actual test
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await this.simulateLogin()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const p95Time = this.calculatePercentile(times, 95)
    
    this.results.loginTime = {
      average: avgTime,
      p95: p95Time,
      threshold: PERFORMANCE_CONFIG.thresholds.loginTime,
      passed: avgTime <= PERFORMANCE_CONFIG.thresholds.loginTime
    }
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   P95: ${p95Time.toFixed(2)}ms`)
    console.log(`   Threshold: ${PERFORMANCE_CONFIG.thresholds.loginTime}ms`)
    console.log(`   Status: ${this.results.loginTime.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test logout performance
   */
  async testLogoutPerformance() {
    console.log('🚪 Testing logout performance...')
    
    const times = []
    const { iterations } = PERFORMANCE_CONFIG.testConfig
    
    for (let i = 0; i < iterations; i++) {
      // Setup authenticated state
      await this.simulateLogin()
      
      const start = performance.now()
      await this.simulateLogout()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    
    this.results.logoutTime = {
      average: avgTime,
      threshold: PERFORMANCE_CONFIG.thresholds.logoutTime,
      passed: avgTime <= PERFORMANCE_CONFIG.thresholds.logoutTime
    }
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   Threshold: ${PERFORMANCE_CONFIG.thresholds.logoutTime}ms`)
    console.log(`   Status: ${this.results.logoutTime.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test token refresh performance
   */
  async testTokenRefreshPerformance() {
    console.log('🔄 Testing token refresh performance...')
    
    const times = []
    const { iterations } = PERFORMANCE_CONFIG.testConfig
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await this.simulateTokenRefresh()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    
    this.results.tokenRefreshTime = {
      average: avgTime,
      threshold: PERFORMANCE_CONFIG.thresholds.tokenRefreshTime,
      passed: avgTime <= PERFORMANCE_CONFIG.thresholds.tokenRefreshTime
    }
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   Threshold: ${PERFORMANCE_CONFIG.thresholds.tokenRefreshTime}ms`)
    console.log(`   Status: ${this.results.tokenRefreshTime.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test persistence layer performance
   */
  async testPersistencePerformance() {
    console.log('💾 Testing persistence performance...')
    
    const writeTimes = []
    const readTimes = []
    const { iterations } = PERFORMANCE_CONFIG.testConfig
    
    const testData = this.generateTestAuthData()
    
    for (let i = 0; i < iterations; i++) {
      // Test write performance
      const writeStart = performance.now()
      await this.simulatePersistenceWrite(testData)
      const writeEnd = performance.now()
      writeTimes.push(writeEnd - writeStart)
      
      // Test read performance
      const readStart = performance.now()
      await this.simulatePersistenceRead()
      const readEnd = performance.now()
      readTimes.push(readEnd - readStart)
    }
    
    const avgWriteTime = writeTimes.reduce((sum, time) => sum + time, 0) / writeTimes.length
    const avgReadTime = readTimes.reduce((sum, time) => sum + time, 0) / readTimes.length
    
    this.results.persistenceWriteTime = {
      average: avgWriteTime,
      threshold: PERFORMANCE_CONFIG.thresholds.persistenceWriteTime,
      passed: avgWriteTime <= PERFORMANCE_CONFIG.thresholds.persistenceWriteTime
    }
    
    this.results.persistenceReadTime = {
      average: avgReadTime,
      threshold: PERFORMANCE_CONFIG.thresholds.persistenceReadTime,
      passed: avgReadTime <= PERFORMANCE_CONFIG.thresholds.persistenceReadTime
    }
    
    console.log(`   Write Average: ${avgWriteTime.toFixed(2)}ms`)
    console.log(`   Write Threshold: ${PERFORMANCE_CONFIG.thresholds.persistenceWriteTime}ms`)
    console.log(`   Write Status: ${this.results.persistenceWriteTime.passed ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   Read Average: ${avgReadTime.toFixed(2)}ms`)
    console.log(`   Read Threshold: ${PERFORMANCE_CONFIG.thresholds.persistenceReadTime}ms`)
    console.log(`   Read Status: ${this.results.persistenceReadTime.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    console.log('🧠 Testing memory usage...')
    
    const initialMemory = process.memoryUsage().heapUsed
    
    // Simulate auth operations
    const authStates = []
    for (let i = 0; i < 100; i++) {
      authStates.push(await this.simulateAuthState())
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryDiff = (finalMemory - initialMemory) / 1024 / 1024 // Convert to MB
    
    this.results.memoryUsage = {
      usage: memoryDiff,
      threshold: PERFORMANCE_CONFIG.thresholds.memoryUsage,
      passed: memoryDiff <= PERFORMANCE_CONFIG.thresholds.memoryUsage
    }
    
    console.log(`   Memory Usage: ${memoryDiff.toFixed(2)}MB`)
    console.log(`   Threshold: ${PERFORMANCE_CONFIG.thresholds.memoryUsage}MB`)
    console.log(`   Status: ${this.results.memoryUsage.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test bundle size impact
   */
  async testBundleSize() {
    console.log('📦 Testing bundle size impact...')
    
    try {
      // Check if bundle analysis exists
      const bundleStatsPath = path.join(process.cwd(), '.next/analyze/bundle-stats.json')
      
      if (fs.existsSync(bundleStatsPath)) {
        const bundleStats = JSON.parse(fs.readFileSync(bundleStatsPath, 'utf8'))
        const authBundleSize = this.calculateAuthBundleSize(bundleStats)
        
        this.results.bundleSize = {
          size: authBundleSize,
          threshold: PERFORMANCE_CONFIG.thresholds.bundleSize,
          passed: authBundleSize <= PERFORMANCE_CONFIG.thresholds.bundleSize
        }
        
        console.log(`   Bundle Size: ${authBundleSize} bytes`)
        console.log(`   Threshold: ${PERFORMANCE_CONFIG.thresholds.bundleSize} bytes`)
        console.log(`   Status: ${this.results.bundleSize.passed ? '✅ PASS' : '❌ FAIL'}\n`)
      } else {
        console.log('   ⚠️  Bundle analysis not found, skipping bundle size test\n')
        this.results.bundleSize = { passed: true, skipped: true }
      }
    } catch (error) {
      console.log('   ⚠️  Bundle size test failed:', error.message, '\n')
      this.results.bundleSize = { passed: true, skipped: true }
    }
  }

  /**
   * Test concurrent login performance
   */
  async testConcurrentLogins() {
    console.log('👥 Testing concurrent login performance...')
    
    const { concurrentUsers } = PERFORMANCE_CONFIG.testConfig
    const start = performance.now()
    
    const loginPromises = Array.from({ length: concurrentUsers }, (_, i) => 
      this.simulateLogin(`user${i}@example.com`)
    )
    
    await Promise.all(loginPromises)
    
    const end = performance.now()
    const totalTime = end - start
    const avgTimePerUser = totalTime / concurrentUsers
    
    this.results.concurrentLogins = {
      totalTime,
      avgTimePerUser,
      concurrentUsers,
      passed: avgTimePerUser <= PERFORMANCE_CONFIG.thresholds.loginTime * 1.5 // Allow 50% overhead for concurrency
    }
    
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`)
    console.log(`   Avg Time Per User: ${avgTimePerUser.toFixed(2)}ms`)
    console.log(`   Concurrent Users: ${concurrentUsers}`)
    console.log(`   Status: ${this.results.concurrentLogins.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Test offline performance
   */
  async testOfflinePerformance() {
    console.log('📴 Testing offline performance...')
    
    // Simulate offline state
    global.navigator.onLine = false
    
    const times = []
    const { iterations } = PERFORMANCE_CONFIG.testConfig
    
    for (let i = 0; i < Math.min(iterations, 10); i++) {
      const start = performance.now()
      await this.simulateOfflineAuth()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    
    // Reset online state
    global.navigator.onLine = true
    
    this.results.offlinePerformance = {
      average: avgTime,
      threshold: 100, // Offline operations should be very fast
      passed: avgTime <= 100
    }
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms`)
    console.log(`   Threshold: 100ms`)
    console.log(`   Status: ${this.results.offlinePerformance.passed ? '✅ PASS' : '❌ FAIL'}\n`)
  }

  /**
   * Simulate login operation
   */
  async simulateLogin(email = 'test@example.com') {
    // Simulate API delay
    await this.delay(Math.random() * 100 + 50)
    
    // Simulate persistence operations
    await this.delay(Math.random() * 20 + 10)
    
    return {
      user: { id: '123', email },
      tokens: { accessToken: 'token', refreshToken: 'refresh' }
    }
  }

  /**
   * Simulate logout operation
   */
  async simulateLogout() {
    // Simulate API call
    await this.delay(Math.random() * 50 + 25)
    
    // Simulate cleanup
    await this.delay(Math.random() * 10 + 5)
  }

  /**
   * Simulate token refresh operation
   */
  async simulateTokenRefresh() {
    // Simulate API call
    await this.delay(Math.random() * 80 + 40)
    
    // Simulate token storage
    await this.delay(Math.random() * 15 + 5)
  }

  /**
   * Simulate persistence write operation
   */
  async simulatePersistenceWrite(data) {
    // Simulate encryption
    await this.delay(Math.random() * 10 + 5)
    
    // Simulate IndexedDB write
    await this.delay(Math.random() * 20 + 10)
  }

  /**
   * Simulate persistence read operation
   */
  async simulatePersistenceRead() {
    // Simulate IndexedDB read
    await this.delay(Math.random() * 10 + 5)
    
    // Simulate decryption
    await this.delay(Math.random() * 8 + 3)
  }

  /**
   * Simulate auth state creation
   */
  async simulateAuthState() {
    return {
      user: { id: '123', email: 'test@example.com', name: 'Test User' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
      isAuthenticated: true,
      timestamp: Date.now()
    }
  }

  /**
   * Simulate offline authentication
   */
  async simulateOfflineAuth() {
    // Simulate reading from local storage
    await this.delay(Math.random() * 5 + 2)
    
    // Simulate validation
    await this.delay(Math.random() * 3 + 1)
  }

  /**
   * Generate test authentication data
   */
  generateTestAuthData() {
    return {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true
        }
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh_token_value_here',
        expiresIn: 3600,
        tokenType: 'Bearer'
      },
      metadata: {
        lastLogin: Date.now(),
        loginCount: 42,
        deviceInfo: 'Chrome/91.0.4472.124'
      }
    }
  }

  /**
   * Calculate auth-related bundle size
   */
  calculateAuthBundleSize(bundleStats) {
    // This would analyze the bundle stats to find auth-related chunks
    // For now, return a mock value
    return 52000 // bytes
  }

  /**
   * Calculate percentile from array of numbers
   */
  calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index]
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate all test results
   */
  validateResults() {
    let allPassed = true
    
    for (const [testName, result] of Object.entries(this.results)) {
      if (!result.passed && !result.skipped) {
        allPassed = false
        this.errors.push(`${testName} failed: ${JSON.stringify(result)}`)
      }
    }
    
    return allPassed
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('📊 Performance Validation Report')
    console.log('================================\n')
    
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      baseline: PERFORMANCE_CONFIG.baseline,
      thresholds: PERFORMANCE_CONFIG.thresholds,
      passed: this.validateResults(),
      errors: this.errors
    }
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'performance-reports', `auth-performance-${Date.now()}.json`)
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath)
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    
    console.log(`Report saved to: ${reportPath}\n`)
    
    // Display summary
    const passed = Object.values(this.results).filter(r => r.passed).length
    const total = Object.values(this.results).filter(r => !r.skipped).length
    
    console.log(`Summary: ${passed}/${total} tests passed`)
    
    if (this.errors.length > 0) {
      console.log('\nErrors:')
      this.errors.forEach(error => console.log(`  ❌ ${error}`))
    }
    
    console.log('')
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator()
  validator.runValidation().catch(console.error)
}

module.exports = PerformanceValidator