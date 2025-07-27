#!/usr/bin/env node

/**
 * Comprehensive migration readiness validation script
 * Performs pre-migration checks to ensure system is ready for Day 3 migration
 */

const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function header(message) {
  log(`\n${colors.bold}${colors.cyan}🔍 ${message}${colors.reset}`)
}

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warningsList: [],
  recommendations: [],
}

/**
 * Check system requirements
 */
function checkSystemRequirements() {
  header('System Requirements')
  
  // Check Node.js version
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
  
  if (majorVersion >= 16) {
    success(`Node.js version: ${nodeVersion}`)
    results.passed++
  } else {
    error(`Node.js version too old: ${nodeVersion} (requires >= 16)`)
    results.failed++
    results.errors.push(`Node.js version ${nodeVersion} is too old`)
  }
  
  // Check if running on Windows (current environment)
  if (process.platform === 'win32') {
    success('Platform: Windows (supported)')
    results.passed++
  } else {
    info(`Platform: ${process.platform}`)
    results.passed++
  }
}

/**
 * Check project structure and files
 */
function checkProjectStructure() {
  header('Project Structure Validation')
  
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.mjs',
    'lib/feature-flags.ts',
    'hooks/useAuth.ts',
    'hooks/queries/use-feeds.ts',
    'config/migration-config.ts',
    'lib/persistence/auth-backup.ts',
    'lib/persistence/feed-backup.ts',
    'lib/persistence/migration-monitor.ts',
    'utils/test-migration-helpers.ts',
    'scripts/validate-migration-readiness.js',
  ]
  
  const optionalFiles = [
    '.env.local',
    '.env.development',
    '.env.example',
  ]
  
  // Check required files
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Required: ${file}`)
      results.passed++
    } else {
      error(`Missing required file: ${file}`)
      results.failed++
      results.errors.push(`Missing required file: ${file}`)
    }
  })
  
  // Check optional files
  optionalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Optional: ${file}`)
      results.passed++
    } else {
      warning(`Optional file not found: ${file}`)
      results.warnings++
      results.warningsList.push(`Consider creating: ${file}`)
    }
  })
}

/**
 * Check dependencies
 */
function checkDependencies() {
  header('Dependencies Validation')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const criticalDeps = {
      '@tanstack/react-query': '^4.0.0',
      'zustand': '^4.0.0', 
      'localforage': '^1.10.0',
      'next': '^13.0.0',
      'react': '^18.0.0',
      'typescript': '^4.0.0',
    }
    
    const recommendedDeps = {
      '@tanstack/react-query-devtools': '^4.0.0',
      'jest': '^29.0.0',
      '@testing-library/react': '^13.0.0',
      '@testing-library/jest-dom': '^5.0.0',
    }
    
    // Check critical dependencies
    Object.entries(criticalDeps).forEach(([dep, minVersion]) => {
      if (allDeps[dep]) {
        success(`Critical dependency: ${dep}@${allDeps[dep]}`)
        results.passed++
      } else {
        error(`Missing critical dependency: ${dep}`)
        results.failed++
        results.errors.push(`Missing critical dependency: ${dep}`)
      }
    })
    
    // Check recommended dependencies
    Object.entries(recommendedDeps).forEach(([dep, minVersion]) => {
      if (allDeps[dep]) {
        success(`Recommended dependency: ${dep}@${allDeps[dep]}`)
        results.passed++
      } else {
        warning(`Missing recommended dependency: ${dep}`)
        results.warnings++
        results.warningsList.push(`Consider installing: ${dep}`)
      }
    })
    
  } catch (err) {
    error('Failed to read package.json')
    results.failed++
    results.errors.push('Failed to read package.json')
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  header('Environment Configuration')
  
  const envFiles = ['.env.local', '.env.development', '.env']
  let envConfig = {}
  let envFile = null
  
  // Find and load environment file
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envFile = file
      try {
        const envContent = fs.readFileSync(file, 'utf8')
        envContent.split('\n').forEach(line => {
          const [key, value] = line.split('=')
          if (key && value) {
            envConfig[key.trim()] = value.trim()
          }
        })
        break
      } catch (err) {
        warning(`Failed to read ${file}`)
      }
    }
  }
  
  if (envFile) {
    success(`Environment file found: ${envFile}`)
    results.passed++
  } else {
    warning('No environment file found')
    results.warnings++
    results.warningsList.push('Create .env.local for environment configuration')
    results.recommendations.push('Copy .env.example to .env.local and configure feature flags')
  }
  
  // Check critical environment variables
  const criticalEnvVars = [
    'NEXT_PUBLIC_RQ_AUTH',
    'NEXT_PUBLIC_RQ_FEEDS',
  ]
  
  const optionalEnvVars = [
    'NEXT_PUBLIC_OFFLINE_SUPPORT',
    'NEXT_PUBLIC_BACKGROUND_SYNC',
    'NEXT_PUBLIC_MIGRATION_TIMEOUT',
    'NEXT_PUBLIC_MIGRATION_AUTO_ROLLBACK',
  ]
  
  criticalEnvVars.forEach(envVar => {
    if (envConfig[envVar] !== undefined) {
      success(`Environment variable: ${envVar}=${envConfig[envVar]}`)
      results.passed++
    } else {
      warning(`Environment variable not set: ${envVar}`)
      results.warnings++
      results.warningsList.push(`Set environment variable: ${envVar}`)
    }
  })
  
  optionalEnvVars.forEach(envVar => {
    if (envConfig[envVar] !== undefined) {
      info(`Optional environment variable: ${envVar}=${envConfig[envVar]}`)
    }
  })
}

/**
 * Check TypeScript configuration
 */
function checkTypeScriptConfig() {
  header('TypeScript Configuration')
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
    
    // Check compiler options
    const requiredOptions = {
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    }
    
    const compilerOptions = tsConfig.compilerOptions || {}
    
    Object.entries(requiredOptions).forEach(([option, expectedValue]) => {
      if (compilerOptions[option] === expectedValue) {
        success(`TypeScript option: ${option}=${expectedValue}`)
        results.passed++
      } else {
        warning(`TypeScript option not optimal: ${option}=${compilerOptions[option]} (recommended: ${expectedValue})`)
        results.warnings++
        results.warningsList.push(`Consider setting TypeScript option: ${option}=${expectedValue}`)
      }
    })
    
    // Check paths configuration
    if (compilerOptions.paths) {
      success('TypeScript path mapping configured')
      results.passed++
    } else {
      warning('TypeScript path mapping not configured')
      results.warnings++
      results.warningsList.push('Consider configuring TypeScript path mapping for better imports')
    }
    
  } catch (err) {
    error('Failed to read tsconfig.json')
    results.failed++
    results.errors.push('Failed to read tsconfig.json')
  }
}

/**
 * Check test configuration
 */
function checkTestConfiguration() {
  header('Test Configuration')
  
  // Check Jest configuration
  const jestConfigFiles = ['jest.config.js', 'jest.config.ts', 'jest.config.json']
  let jestConfigFound = false
  
  jestConfigFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Jest configuration: ${file}`)
      jestConfigFound = true
      results.passed++
    }
  })
  
  if (!jestConfigFound) {
    error('No Jest configuration found')
    results.failed++
    results.errors.push('No Jest configuration found')
  }
  
  // Check test directories
  const testDirs = ['__tests__', 'tests']
  let testDirFound = false
  
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      success(`Test directory: ${dir}`)
      testDirFound = true
      results.passed++
    }
  })
  
  if (!testDirFound) {
    warning('No test directory found')
    results.warnings++
    results.warningsList.push('Create test directory (__tests__ or tests)')
  }
  
  // Check specific test files
  const testFiles = [
    '__tests__/integration/security-api-integration.test.ts',
    '__tests__/integration/type-guards-api-integration.test.ts', 
    '__tests__/integration/user-flows.test.tsx',
  ]
  
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Test file: ${file}`)
      results.passed++
    } else {
      warning(`Test file missing: ${file}`)
      results.warnings++
      results.warningsList.push(`Create test file: ${file}`)
    }
  })
}

/**
 * Check storage capabilities
 */
function checkStorageCapabilities() {
  header('Storage Capabilities')
  
  // Since this is a Node.js script, we can't directly test browser APIs
  // But we can check if the code is structured correctly
  
  const storageFiles = [
    'lib/persistence/indexdb-adapter.ts',
    'lib/persistence/react-query-persister.ts',
    'types/persistence.ts',
    'utils/persistence-helpers.ts',
  ]
  
  storageFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Storage file: ${file}`)
      results.passed++
    } else {
      error(`Missing storage file: ${file}`)
      results.failed++
      results.errors.push(`Missing storage file: ${file}`)
    }
  })
  
  // Check for storage-related content
  try {
    const indexdbAdapter = fs.readFileSync('lib/persistence/indexdb-adapter.ts', 'utf8')
    
    const requiredMethods = ['get', 'set', 'delete', 'clear', 'getMany', 'setMany']
    requiredMethods.forEach(method => {
      if (indexdbAdapter.includes(method)) {
        success(`IndexedDB adapter method: ${method}`)
        results.passed++
      } else {
        error(`Missing IndexedDB adapter method: ${method}`)
        results.failed++
        results.errors.push(`Missing IndexedDB adapter method: ${method}`)
      }
    })
    
  } catch (err) {
    error('Failed to validate IndexedDB adapter')
    results.failed++
    results.errors.push('Failed to validate IndexedDB adapter')
  }
}

/**
 * Check migration infrastructure
 */
function checkMigrationInfrastructure() {
  header('Migration Infrastructure')
  
  const migrationFiles = [
    'lib/persistence/auth-backup.ts',
    'lib/persistence/feed-backup.ts', 
    'lib/persistence/migration-monitor.ts',
    'config/migration-config.ts',
  ]
  
  migrationFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`Migration file: ${file}`)
      results.passed++
      
      // Check file content for required functionality
      try {
        const content = fs.readFileSync(file, 'utf8')
        
        if (file.includes('backup')) {
          const backupMethods = ['createBackup', 'validateBackup', 'rollbackToBackup', 'getMigrationStatus']
          backupMethods.forEach(method => {
            if (content.includes(method)) {
              success(`  Backup method: ${method}`)
              results.passed++
            } else {
              error(`  Missing backup method: ${method}`)
              results.failed++
              results.errors.push(`Missing backup method in ${file}: ${method}`)
            }
          })
        }
        
        if (file.includes('monitor')) {
          const monitorMethods = ['getGlobalStatus', 'runPreMigrationChecks', 'rollback']
          monitorMethods.forEach(method => {
            if (content.includes(method)) {
              success(`  Monitor method: ${method}`)
              results.passed++
            } else {
              error(`  Missing monitor method: ${method}`)
              results.failed++
              results.errors.push(`Missing monitor method in ${file}: ${method}`)
            }
          })
        }
        
      } catch (err) {
        warning(`Failed to validate content of ${file}`)
        results.warnings++
        results.warningsList.push(`Failed to validate content of ${file}`)
      }
      
    } else {
      error(`Missing migration file: ${file}`)
      results.failed++
      results.errors.push(`Missing migration file: ${file}`)
    }
  })
}

/**
 * Check React Query integration
 */
function checkReactQueryIntegration() {
  header('React Query Integration')
  
  const reactQueryFiles = [
    'hooks/useAuth.ts',
    'hooks/queries/use-feeds.ts',
  ]
  
  reactQueryFiles.forEach(file => {
    if (fs.existsSync(file)) {
      success(`React Query file: ${file}`)
      results.passed++
      
      try {
        const content = fs.readFileSync(file, 'utf8')
        
        // Check for React Query imports
        if (content.includes('@tanstack/react-query')) {
          success(`  React Query imported in ${file}`)
          results.passed++
        } else {
          error(`  React Query not imported in ${file}`)
          results.failed++
          results.errors.push(`React Query not imported in ${file}`)
        }
        
        // Check for query keys
        if (content.includes('Keys')) {
          success(`  Query keys defined in ${file}`)
          results.passed++
        } else {
          warning(`  Query keys not found in ${file}`)
          results.warnings++
          results.warningsList.push(`Consider defining query keys in ${file}`)
        }
        
        // Check for hooks
        if (file.includes('auth')) {
          const authHooks = ['useAuth', 'useLogin', 'useLogout']
          authHooks.forEach(hook => {
            if (content.includes(hook)) {
              success(`  Auth hook: ${hook}`)
              results.passed++
            } else {
              error(`  Missing auth hook: ${hook}`)
              results.failed++
              results.errors.push(`Missing auth hook in ${file}: ${hook}`)
            }
          })
        }
        
        if (file.includes('feeds')) {
          const feedHooks = ['useFeeds', 'useAddFeed']
          feedHooks.forEach(hook => {
            if (content.includes(hook)) {
              success(`  Feed hook: ${hook}`)
              results.passed++
            } else {
              error(`  Missing feed hook: ${hook}`)
              results.failed++
              results.errors.push(`Missing feed hook in ${file}: ${hook}`)
            }
          })
        }
        
      } catch (err) {
        warning(`Failed to validate ${file}`)
        results.warnings++
        results.warningsList.push(`Failed to validate ${file}`)
      }
      
    } else {
      error(`Missing React Query file: ${file}`)
      results.failed++
      results.errors.push(`Missing React Query file: ${file}`)
    }
  })
}

/**
 * Generate migration readiness report
 */
function generateReport() {
  header('Migration Readiness Report')
  
  // Calculate overall score
  const totalChecks = results.passed + results.failed + results.warnings
  const score = totalChecks > 0 ? (results.passed / totalChecks) * 100 : 0
  
  log(`\n${colors.bold}📊 Overall Readiness Score: ${score.toFixed(1)}%${colors.reset}`)
  
  if (score >= 90) {
    success('🚀 EXCELLENT - Ready for migration!')
  } else if (score >= 75) {
    success('✅ GOOD - Minor issues to address')
  } else if (score >= 60) {
    warning('⚠️  FAIR - Several issues need attention')
  } else {
    error('❌ POOR - Major issues must be resolved')
  }
  
  log(`\n${colors.bold}Summary:${colors.reset}`)
  log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`)
  log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`)
  log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`)
  
  // Show critical errors
  if (results.errors.length > 0) {
    log(`\n${colors.bold}${colors.red}🚨 Critical Issues:${colors.reset}`)
    results.errors.forEach((err, index) => {
      error(`${index + 1}. ${err}`)
    })
  }
  
  // Show warnings
  if (results.warningsList.length > 0) {
    log(`\n${colors.bold}${colors.yellow}⚠️  Warnings:${colors.reset}`)
    results.warningsList.forEach((warn, index) => {
      warning(`${index + 1}. ${warn}`)
    })
  }
  
  // Show recommendations
  if (results.recommendations.length > 0) {
    log(`\n${colors.bold}${colors.blue}💡 Recommendations:${colors.reset}`)
    results.recommendations.forEach((rec, index) => {
      info(`${index + 1}. ${rec}`)
    })
  }
  
  // Migration readiness status
  log(`\n${colors.bold}🎯 Migration Readiness Status:${colors.reset}`)
  
  if (results.failed === 0) {
    success('✅ All critical requirements met')
    success('✅ Infrastructure is ready for migration')
    success('✅ Safety nets are in place')
    
    log(`\n${colors.bold}${colors.green}🚀 READY TO PROCEED WITH MIGRATION${colors.reset}`)
    
    log(`\n${colors.bold}Next Steps:${colors.reset}`)
    info('1. Set feature flags in .env.local:')
    info('   NEXT_PUBLIC_RQ_AUTH=true')
    info('   NEXT_PUBLIC_RQ_FEEDS=true')
    info('2. Run comprehensive tests: npm test')
    info('3. Monitor migration progress in development')
    info('4. Gradually enable features in production')
    
  } else {
    error('❌ Critical requirements not met')
    error('❌ Must resolve errors before migration')
    
    log(`\n${colors.bold}${colors.red}🛑 NOT READY FOR MIGRATION${colors.reset}`)
    
    log(`\n${colors.bold}Required Actions:${colors.reset}`)
    results.errors.forEach((err, index) => {
      error(`${index + 1}. Fix: ${err}`)
    })
    
    info('\nRe-run this script after addressing the issues.')
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0)
}

/**
 * Main validation function
 */
async function validateMigrationReadiness() {
  log(`${colors.bold}${colors.magenta}🔍 Day 3 Migration Readiness Validation${colors.reset}\n`)
  log(`${colors.cyan}Validating system readiness for React Query migration...${colors.reset}\n`)
  
  // Run all validation checks
  checkSystemRequirements()
  checkProjectStructure()
  checkDependencies()
  checkEnvironmentConfig()
  checkTypeScriptConfig()
  checkTestConfiguration()
  checkStorageCapabilities()
  checkMigrationInfrastructure()
  checkReactQueryIntegration()
  
  // Generate final report
  generateReport()
}

// Run the validation
validateMigrationReadiness().catch(err => {
  error(`Validation failed: ${err.message}`)
  process.exit(1)
})