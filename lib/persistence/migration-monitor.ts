/**
 * Migration monitoring and rollback service
 * Coordinates auth and feed migrations with safety nets
 */

import { authBackupService, type AuthMigrationStatus } from './auth-backup'
import { feedBackupService, type FeedMigrationStatus } from './feed-backup'
import { Logger } from '@/utils/logger'
import { FEATURES } from '@/lib/feature-flags'

/**
 * Overall migration status combining auth and feed migrations
 */
export interface GlobalMigrationStatus {
  /** Overall migration phase */
  phase: 'not-started' | 'in-progress' | 'completed' | 'failed' | 'rolled-back'
  
  /** When migration started */
  startedAt?: number
  
  /** When migration completed */
  completedAt?: number
  
  /** Overall progress (0-1) */
  progress: number
  
  /** Current migration type being processed */
  currentMigration?: 'auth' | 'feeds' | 'cleanup'
  
  /** Individual migration statuses */
  auth: AuthMigrationStatus | null
  feeds: FeedMigrationStatus | null
  
  /** Global error if any */
  error?: string
  
  /** Whether auto-rollback occurred */
  autoRolledBack: boolean
  
  /** Migration performance metrics */
  metrics: {
    totalDuration?: number
    authDuration?: number
    feedsDuration?: number
    rollbackDuration?: number
  }
}

/**
 * Migration event types for monitoring
 */
export type MigrationEvent = 
  | { type: 'started'; migration: 'auth' | 'feeds' | 'global' }
  | { type: 'progress'; migration: 'auth' | 'feeds'; progress: number; step: string }
  | { type: 'completed'; migration: 'auth' | 'feeds' | 'global'; duration: number }
  | { type: 'failed'; migration: 'auth' | 'feeds' | 'global'; error: string }
  | { type: 'rollback-started'; migration: 'auth' | 'feeds' | 'global' }
  | { type: 'rollback-completed'; migration: 'auth' | 'feeds' | 'global' }

/**
 * Migration event listener
 */
export type MigrationEventListener = (event: MigrationEvent) => void

/**
 * Migration rollback options
 */
export interface RollbackOptions {
  /** Which migrations to rollback */
  migrations: ('auth' | 'feeds' | 'both')[]
  
  /** Whether to force rollback even if not marked as failed */
  force?: boolean
  
  /** Whether to clear all migration data after rollback */
  clearMigrationData?: boolean
  
  /** Custom validation after rollback */
  validate?: () => Promise<boolean>
}

/**
 * Migration safety configuration
 */
export interface MigrationSafetyConfig {
  /** Maximum time to wait for migration (ms) */
  timeout: number
  
  /** Maximum retry attempts */
  maxRetries: number
  
  /** Whether to enable auto-rollback on failure */
  autoRollback: boolean
  
  /** Validation checks to run during migration */
  validationChecks: string[]
  
  /** Performance thresholds */
  performanceThresholds: {
    maxDuration: number
    maxMemoryUsage: number
  }
}

/**
 * Migration monitoring service
 */
export class MigrationMonitor {
  private listeners: Set<MigrationEventListener> = new Set()
  private migrationStartTime?: number
  private config: MigrationSafetyConfig
  private timeoutId?: NodeJS.Timeout

  constructor(config?: Partial<MigrationSafetyConfig>) {
    this.config = {
      timeout: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      autoRollback: true,
      validationChecks: ['data-integrity', 'feature-flags', 'storage-capacity'],
      performanceThresholds: {
        maxDuration: 2 * 60 * 1000, // 2 minutes
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      },
      ...config,
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: MigrationEventListener): void {
    this.listeners.add(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: MigrationEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Emit migration event
   */
  private emit(event: MigrationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        Logger.error('[MigrationMonitor] Event listener error:', error)
      }
    })
  }

  /**
   * Get overall migration status
   */
  async getGlobalStatus(): Promise<GlobalMigrationStatus> {
    const authStatus = await authBackupService.getMigrationStatus()
    const feedsStatus = await feedBackupService.getMigrationStatus()

    // Determine overall phase
    let phase: GlobalMigrationStatus['phase'] = 'not-started'
    let progress = 0
    let currentMigration: 'auth' | 'feeds' | 'cleanup' | undefined

    if (authStatus?.phase === 'in-progress' || feedsStatus?.phase === 'in-progress') {
      phase = 'in-progress'
      if (authStatus?.phase === 'in-progress') {
        currentMigration = 'auth'
        progress = authStatus.progress * 0.5 // Auth is first half
      } else if (feedsStatus?.phase === 'in-progress') {
        currentMigration = 'feeds'
        progress = 0.5 + (feedsStatus.progress * 0.5) // Feeds is second half
      }
    } else if (authStatus?.phase === 'completed' && feedsStatus?.phase === 'completed') {
      phase = 'completed'
      progress = 1
    } else if (authStatus?.phase === 'failed' || feedsStatus?.phase === 'failed') {
      phase = 'failed'
    } else if (authStatus?.phase === 'rolled-back' || feedsStatus?.phase === 'rolled-back') {
      phase = 'rolled-back'
    } else if (authStatus?.phase === 'completed' && !feedsStatus) {
      progress = 0.5
      phase = 'in-progress'
    }

    const startedAt = Math.min(
      authStatus?.startedAt || Infinity,
      feedsStatus?.startedAt || Infinity
    )

    const completedAt = Math.max(
      authStatus?.completedAt || 0,
      feedsStatus?.completedAt || 0
    )

    return {
      phase,
      startedAt: startedAt === Infinity ? undefined : startedAt,
      completedAt: completedAt === 0 ? undefined : completedAt,
      progress,
      currentMigration,
      auth: authStatus,
      feeds: feedsStatus,
      autoRolledBack: authStatus?.phase === 'rolled-back' || feedsStatus?.phase === 'rolled-back',
      metrics: {
        totalDuration: completedAt && startedAt !== Infinity ? completedAt - startedAt : undefined,
        authDuration: authStatus?.completedAt && authStatus?.startedAt ? 
          authStatus.completedAt - authStatus.startedAt : undefined,
        feedsDuration: feedsStatus?.completedAt && feedsStatus?.startedAt ? 
          feedsStatus.completedAt - feedsStatus.startedAt : undefined,
      },
    }
  }

  /**
   * Start monitoring a migration
   */
  async startMigrationMonitoring(): Promise<void> {
    Logger.info('[MigrationMonitor] Starting migration monitoring')
    
    this.migrationStartTime = Date.now()
    this.emit({ type: 'started', migration: 'global' })

    // Set up timeout
    if (this.config.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.handleMigrationTimeout()
      }, this.config.timeout)
    }

    // Start monitoring loop
    this.startMonitoringLoop()
  }

  /**
   * Stop migration monitoring
   */
  stopMigrationMonitoring(): void {
    Logger.info('[MigrationMonitor] Stopping migration monitoring')
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }

  /**
   * Monitor migration progress in a loop
   */
  private async startMonitoringLoop(): Promise<void> {
    const checkInterval = 1000 // Check every second

    const monitor = async () => {
      try {
        const status = await this.getGlobalStatus()
        
        // Check for completion
        if (status.phase === 'completed') {
          this.handleMigrationCompleted(status)
          return
        }
        
        // Check for failure
        if (status.phase === 'failed') {
          await this.handleMigrationFailed(status)
          return
        }
        
        // Check performance thresholds
        await this.checkPerformanceThresholds(status)
        
        // Continue monitoring if still in progress
        if (status.phase === 'in-progress') {
          setTimeout(monitor, checkInterval)
        }
      } catch (error) {
        Logger.error('[MigrationMonitor] Monitoring error:', error)
        setTimeout(monitor, checkInterval)
      }
    }

    // Start monitoring
    setTimeout(monitor, checkInterval)
  }

  /**
   * Handle migration completion
   */
  private handleMigrationCompleted(status: GlobalMigrationStatus): void {
    Logger.info('[MigrationMonitor] Migration completed successfully')
    
    this.stopMigrationMonitoring()
    
    const duration = status.metrics.totalDuration || 0
    this.emit({ type: 'completed', migration: 'global', duration })
    
    // Optional: Clear backup data after successful migration
    if (this.config.autoRollback) {
      this.clearBackupDataAfterSuccess()
    }
  }

  /**
   * Handle migration failure
   */
  private async handleMigrationFailed(status: GlobalMigrationStatus): Promise<void> {
    Logger.error('[MigrationMonitor] Migration failed:', status.error)
    
    this.emit({ 
      type: 'failed', 
      migration: 'global', 
      error: status.error || 'Unknown migration error' 
    })
    
    // Attempt auto-rollback if enabled
    if (this.config.autoRollback) {
      await this.attemptAutoRollback()
    }
    
    this.stopMigrationMonitoring()
  }

  /**
   * Handle migration timeout
   */
  private async handleMigrationTimeout(): Promise<void> {
    Logger.error('[MigrationMonitor] Migration timeout exceeded')
    
    this.emit({ 
      type: 'failed', 
      migration: 'global', 
      error: 'Migration timeout exceeded' 
    })
    
    // Force rollback on timeout
    await this.rollback({ migrations: ['both'], force: true })
  }

  /**
   * Check performance thresholds
   */
  private async checkPerformanceThresholds(status: GlobalMigrationStatus): Promise<void> {
    const { performanceThresholds } = this.config
    
    // Check duration threshold
    if (this.migrationStartTime) {
      const duration = Date.now() - this.migrationStartTime
      if (duration > performanceThresholds.maxDuration) {
        Logger.warn('[MigrationMonitor] Migration duration threshold exceeded')
      }
    }
    
    // Check memory usage if available
    if (typeof window !== 'undefined' && 'performance' in window) {
      // @ts-ignore - memory is not standard but exists in Chrome
      const memory = (performance as any).memory
      if (memory && memory.usedJSHeapSize > performanceThresholds.maxMemoryUsage) {
        Logger.warn('[MigrationMonitor] Memory usage threshold exceeded')
      }
    }
  }

  /**
   * Attempt automatic rollback
   */
  private async attemptAutoRollback(): Promise<void> {
    Logger.warn('[MigrationMonitor] Attempting auto-rollback')
    
    this.emit({ type: 'rollback-started', migration: 'global' })
    
    try {
      await this.rollback({ migrations: ['both'], force: false })
      
      this.emit({ type: 'rollback-completed', migration: 'global' })
      Logger.info('[MigrationMonitor] Auto-rollback completed successfully')
    } catch (error) {
      Logger.error('[MigrationMonitor] Auto-rollback failed:', error)
      this.emit({ 
        type: 'failed', 
        migration: 'global', 
        error: `Auto-rollback failed: ${error.message}` 
      })
    }
  }

  /**
   * Manual rollback
   */
  async rollback(options: RollbackOptions): Promise<void> {
    Logger.warn('[MigrationMonitor] Starting manual rollback')
    
    const rollbackStartTime = Date.now()
    
    try {
      // Rollback auth if requested
      if (options.migrations.includes('auth') || options.migrations.includes('both')) {
        this.emit({ type: 'rollback-started', migration: 'auth' })
        await authBackupService.rollbackToBackup()
        this.emit({ type: 'rollback-completed', migration: 'auth' })
      }
      
      // Rollback feeds if requested
      if (options.migrations.includes('feeds') || options.migrations.includes('both')) {
        this.emit({ type: 'rollback-started', migration: 'feeds' })
        await feedBackupService.rollbackToBackup()
        this.emit({ type: 'rollback-completed', migration: 'feeds' })
      }
      
      // Run custom validation if provided
      if (options.validate) {
        const isValid = await options.validate()
        if (!isValid) {
          throw new Error('Rollback validation failed')
        }
      }
      
      // Clear migration data if requested
      if (options.clearMigrationData) {
        await this.clearMigrationData()
      }
      
      const rollbackDuration = Date.now() - rollbackStartTime
      Logger.info('[MigrationMonitor] Rollback completed in', rollbackDuration, 'ms')
      
    } catch (error) {
      Logger.error('[MigrationMonitor] Rollback failed:', error)
      throw error
    }
  }

  /**
   * Clear all migration data
   */
  private async clearMigrationData(): Promise<void> {
    try {
      await Promise.all([
        authBackupService.clearBackups(),
        feedBackupService.clearBackups(),
      ])
      
      Logger.debug('[MigrationMonitor] Migration data cleared')
    } catch (error) {
      Logger.error('[MigrationMonitor] Failed to clear migration data:', error)
    }
  }

  /**
   * Clear backup data after successful migration
   */
  private async clearBackupDataAfterSuccess(): Promise<void> {
    // Wait a bit before clearing to ensure everything is stable
    setTimeout(async () => {
      try {
        await this.clearMigrationData()
        Logger.debug('[MigrationMonitor] Backup data cleared after successful migration')
      } catch (error) {
        Logger.error('[MigrationMonitor] Failed to clear backup data:', error)
      }
    }, 30000) // Wait 30 seconds
  }

  /**
   * Run pre-migration validation checks
   */
  async runPreMigrationChecks(): Promise<{
    passed: boolean
    failures: string[]
    warnings: string[]
  }> {
    const failures: string[] = []
    const warnings: string[] = []

    try {
      // Check feature flags
      if (!FEATURES.USE_REACT_QUERY_AUTH && !FEATURES.USE_REACT_QUERY_FEEDS) {
        failures.push('No React Query features enabled')
      }

      // Check storage availability
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('test', 'test')
          localStorage.removeItem('test')
        } catch {
          failures.push('localStorage not available')
        }

        if (!('indexedDB' in window)) {
          warnings.push('IndexedDB not available, using localStorage fallback')
        }
      }

      // Check current data state
      const authStatus = await authBackupService.getMigrationStatus()
      const feedsStatus = await feedBackupService.getMigrationStatus()

      if (authStatus?.phase === 'in-progress') {
        failures.push('Auth migration already in progress')
      }

      if (feedsStatus?.phase === 'in-progress') {
        failures.push('Feeds migration already in progress')
      }

      // Check memory constraints
      if (typeof window !== 'undefined' && 'performance' in window) {
        // @ts-ignore
        const memory = (performance as any).memory
        if (memory && memory.usedJSHeapSize > 50 * 1024 * 1024) {
          warnings.push('High memory usage detected')
        }
      }

      return {
        passed: failures.length === 0,
        failures,
        warnings,
      }
    } catch (error) {
      Logger.error('[MigrationMonitor] Pre-migration checks failed:', error)
      return {
        passed: false,
        failures: ['Pre-migration check execution failed'],
        warnings,
      }
    }
  }

  /**
   * Get migration health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      const status = await this.getGlobalStatus()

      // Check for stuck migrations
      if (status.phase === 'in-progress' && status.startedAt) {
        const duration = Date.now() - status.startedAt
        if (duration > 10 * 60 * 1000) { // 10 minutes
          issues.push('Migration has been running for over 10 minutes')
          recommendations.push('Consider manual rollback or system restart')
        }
      }

      // Check for failed migrations
      if (status.phase === 'failed') {
        issues.push('Migration is in failed state')
        recommendations.push('Review error logs and attempt rollback')
      }

      // Check backup availability
      const authInfo = await authBackupService.getBackupInfo()
      const feedInfo = await feedBackupService.getBackupInfo()

      if (!authInfo.hasBackup && status.auth?.phase === 'in-progress') {
        issues.push('No auth backup available during migration')
      }

      if (!feedInfo.hasBackup && status.feeds?.phase === 'in-progress') {
        issues.push('No feeds backup available during migration')
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      }
    } catch (error) {
      Logger.error('[MigrationMonitor] Health check failed:', error)
      return {
        healthy: false,
        issues: ['Health check execution failed'],
        recommendations: ['Check system logs and restart if necessary'],
      }
    }
  }
}

// Singleton instance
export const migrationMonitor = new MigrationMonitor()

// Export monitoring utilities
export const MigrationUtils = {
  /**
   * Log migration event to console and any external monitoring
   */
  logEvent(event: MigrationEvent): void {
    const timestamp = new Date().toISOString()
    Logger.info(`[Migration ${event.type}] ${event.migration}:`, { ...event, timestamp })
    
    // Send to external monitoring if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'migration_event', {
        event_category: 'migration',
        event_label: `${event.migration}_${event.type}`,
        value: 'progress' in event ? event.progress : undefined,
      })
    }
  },

  /**
   * Create migration performance report
   */
  async createPerformanceReport(): Promise<{
    summary: string
    metrics: Record<string, number>
    recommendations: string[]
  }> {
    const status = await migrationMonitor.getGlobalStatus()
    const metrics: Record<string, number> = {}
    const recommendations: string[] = []

    if (status.metrics.totalDuration) {
      metrics.totalDuration = status.metrics.totalDuration
      
      if (status.metrics.totalDuration > 2 * 60 * 1000) {
        recommendations.push('Migration took longer than expected - consider optimizing data size')
      }
    }

    if (status.metrics.authDuration) {
      metrics.authDuration = status.metrics.authDuration
    }

    if (status.metrics.feedsDuration) {
      metrics.feedsDuration = status.metrics.feedsDuration
    }

    const summary = status.phase === 'completed' 
      ? `Migration completed successfully in ${Math.round((status.metrics.totalDuration || 0) / 1000)}s`
      : `Migration status: ${status.phase}`

    return { summary, metrics, recommendations }
  },
}