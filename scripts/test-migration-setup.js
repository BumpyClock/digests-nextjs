#!/usr/bin/env node

/**
 * Test script to verify Day 3 migration infrastructure setup
 * Validates that all components are ready for migration
 */

const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings: [],
}

/**
 * Check if a file exists
 */
function checkFile(filePath, description) {
  const fullPath = path.resolve(process.cwd(), filePath)
  if (fs.existsSync(fullPath)) {
    success(`${description}: ${filePath}`)
    results.passed++
    return true
  } else {
    error(`${description} missing: ${filePath}`)
    results.failed++
    results.errors.push(`Missing file: ${filePath}`)
    return false
  }
}

/**
 * Check file content for specific patterns
 */
function checkFileContent(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const missing = patterns.filter(pattern => !content.includes(pattern))
    
    if (missing.length === 0) {
      success(`${description}: All required patterns found`)
      results.passed++
      return true
    } else {
      error(`${description}: Missing patterns: ${missing.join(', ')}`)
      results.failed++
      results.errors.push(`${filePath}: Missing patterns: ${missing.join(', ')}`)
      return false
    }
  } catch (err) {
    error(`${description}: Failed to read file`)
    results.failed++
    results.errors.push(`Failed to read ${filePath}: ${err.message}`)
    return false
  }
}

/**
 * Check package.json dependencies
 */
function checkDependencies() {
  info('Checking package.json dependencies...')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const required = [
      '@tanstack/react-query',
      'zustand',
      'localforage',
    ]
    
    const missing = required.filter(dep => !dependencies[dep])
    
    if (missing.length === 0) {
      success('All required dependencies are installed')
      results.passed++
    } else {
      error(`Missing dependencies: ${missing.join(', ')}`)
      results.failed++
      results.errors.push(`Missing dependencies: ${missing.join(', ')}`)
    }
  } catch (err) {
    error('Failed to read package.json')
    results.failed++
    results.errors.push(`Failed to read package.json: ${err.message}`)
  }
}

/**
 * Check environment variables
 */
function checkEnvironment() {
  info('Checking environment configuration...')
  
  const envFiles = ['.env.local', '.env.development', '.env']
  let envFound = false
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      envFound = true
      break
    }
  }
  
  if (envFound) {
    success('Environment configuration file found')
    results.passed++
  } else {
    warning('No environment configuration file found (.env.local, .env.development, or .env)')
    results.warnings++
    results.warnings.push('Consider creating environment configuration for feature flags')
  }
}

/**
 * Main test function
 */
async function runTests() {
  log(`${colors.bold}🧪 Testing Day 3 Migration Infrastructure Setup${colors.reset}\n`)
  
  // Test 1: Feature Flags
  info('Testing feature flags...')
  checkFile('lib/feature-flags.ts', 'Feature flags configuration')
  
  if (fs.existsSync('lib/feature-flags.ts')) {
    checkFileContent('lib/feature-flags.ts', [
      'USE_REACT_QUERY_AUTH',
      'USE_REACT_QUERY_FEEDS',
      'ENABLE_OFFLINE_SUPPORT',
    ], 'Feature flags content')
  }
  
  // Test 2: Auth Infrastructure
  info('\nTesting auth infrastructure...')
  checkFile('hooks/useAuth.ts', 'Auth React Query hooks')
  checkFile('types/auth.ts', 'Auth type definitions')
  checkFile('lib/persistence/auth-backup.ts', 'Auth backup service')
  
  if (fs.existsSync('hooks/useAuth.ts')) {
    checkFileContent('hooks/useAuth.ts', [
      'useAuth',
      'useLogin',
      'useLogout',
      'TokenStorage',
      'authKeys',
    ], 'Auth hooks content')
  }
  
  // Test 3: Feed Infrastructure
  info('\nTesting feed infrastructure...')
  checkFile('hooks/queries/use-feeds.ts', 'Feed React Query hooks')
  checkFile('lib/persistence/feed-backup.ts', 'Feed backup service')
  
  if (fs.existsSync('hooks/queries/use-feeds.ts')) {
    checkFileContent('hooks/queries/use-feeds.ts', [
      'useFeeds',
      'useAddFeed',
      'feedsKeys',
      'FeedsQueryData',
    ], 'Feed hooks content')
  }
  
  // Test 4: Persistence Layer
  info('\nTesting persistence layer...')
  checkFile('lib/persistence/index.ts', 'Persistence layer index')
  checkFile('lib/persistence/indexdb-adapter.ts', 'IndexedDB adapter')
  checkFile('lib/persistence/react-query-persister.ts', 'React Query persister')
  checkFile('types/persistence.ts', 'Persistence types')
  checkFile('utils/persistence-helpers.ts', 'Persistence utilities')
  
  // Test 5: Migration Infrastructure
  info('\nTesting migration infrastructure...')
  checkFile('lib/persistence/migration-monitor.ts', 'Migration monitor')
  checkFile('config/migration-config.ts', 'Migration configuration')
  
  if (fs.existsSync('lib/persistence/migration-monitor.ts')) {
    checkFileContent('lib/persistence/migration-monitor.ts', [
      'MigrationMonitor',
      'migrationMonitor',
      'GlobalMigrationStatus',
      'rollback',
    ], 'Migration monitor content')
  }
  
  // Test 6: Safety and Rollback
  info('\nTesting safety and rollback infrastructure...')
  if (fs.existsSync('lib/persistence/auth-backup.ts')) {
    checkFileContent('lib/persistence/auth-backup.ts', [
      'AuthBackupService',
      'createBackup',
      'rollbackToBackup',
      'validateBackup',
    ], 'Auth backup service content')
  }
  
  if (fs.existsSync('lib/persistence/feed-backup.ts')) {
    checkFileContent('lib/persistence/feed-backup.ts', [
      'FeedBackupService',
      'createBackup',
      'rollbackToBackup',
      'validateBackup',
    ], 'Feed backup service content')
  }
  
  // Test 7: Test Infrastructure
  info('\nTesting test infrastructure...')
  checkFile('__tests__/integration/security-api-integration.test.ts', 'Security integration tests')
  checkFile('__tests__/integration/type-guards-api-integration.test.ts', 'Type guards integration tests')
  checkFile('__tests__/integration/user-flows.test.tsx', 'User flows integration tests')
  
  // Test 8: Configuration Files
  info('\nTesting configuration files...')
  checkFile('jest.config.ts', 'Jest configuration')
  checkFile('tsconfig.json', 'TypeScript configuration')
  
  // Test 9: Dependencies and Environment
  info('\nTesting dependencies and environment...')
  checkDependencies()
  checkEnvironment()
  
  // Test 10: Migration Scripts
  info('\nTesting migration scripts...')
  checkFile('scripts/test-migration-setup.js', 'Migration setup test script')
  
  // Summary
  log(`\n${colors.bold}📊 Test Results Summary${colors.reset}`)
  log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`)
  log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`)
  log(`${colors.yellow}⚠️  Warnings: ${results.warnings.length}${colors.reset}`)
  
  if (results.errors.length > 0) {
    log(`\n${colors.bold}${colors.red}Errors:${colors.reset}`)
    results.errors.forEach(err => error(err))
  }
  
  if (results.warnings.length > 0) {
    log(`\n${colors.bold}${colors.yellow}Warnings:${colors.reset}`)
    results.warnings.forEach(warn => warning(warn))
  }
  
  // Recommendations
  log(`\n${colors.bold}📝 Recommendations:${colors.reset}`)
  
  if (results.failed === 0) {
    success('All core infrastructure is ready for Day 3 migration!')
    info('Next steps:')
    info('1. Run npm test to verify all tests pass')
    info('2. Set environment variables for feature flags')
    info('3. Test migration in development environment')
    info('4. Monitor performance during migration')
  } else {
    error('Some infrastructure components are missing or incomplete')
    info('Please address the errors above before proceeding with migration')
  }
  
  // Feature flag recommendations
  if (results.failed === 0) {
    log(`\n${colors.bold}🚩 Feature Flag Configuration:${colors.reset}`)
    info('Add these to your .env.local file:')
    info('NEXT_PUBLIC_RQ_AUTH=false    # Enable when ready for auth migration')
    info('NEXT_PUBLIC_RQ_FEEDS=false   # Enable when ready for feeds migration')
    info('NEXT_PUBLIC_OFFLINE_SUPPORT=false')
    info('NEXT_PUBLIC_BACKGROUND_SYNC=false')
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Run the tests
runTests().catch(err => {
  error(`Test execution failed: ${err.message}`)
  process.exit(1)
})