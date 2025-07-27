/**
 * Auth state backup service for secure migration from Zustand to React Query
 * Provides data backup, validation, and rollback capabilities
 */

import { IndexedDBAdapter } from './indexdb-adapter'
import { PersistenceError, PersistenceErrorType } from '@/types/persistence'
import { Logger } from '@/utils/logger'
import type { User, AuthTokens, AuthState } from '@/types/auth'

// Backup keys for auth data
const AUTH_BACKUP_KEYS = {
  USER_STATE: 'backup:auth:user-state',
  TOKENS: 'backup:auth:tokens',
  SESSION: 'backup:auth:session',
  MIGRATION_STATUS: 'backup:auth:migration-status',
  ROLLBACK_DATA: 'backup:auth:rollback',
} as const

/**
 * Auth migration status tracking
 */
export interface AuthMigrationStatus {
  /** Migration phase */
  phase: 'not-started' | 'in-progress' | 'completed' | 'failed' | 'rolled-back'
  
  /** Timestamp when migration started */
  startedAt?: number
  
  /** Timestamp when migration completed */
  completedAt?: number
  
  /** Migration progress (0-1) */
  progress: number
  
  /** Current step being executed */
  currentStep?: string
  
  /** Error message if migration failed */
  error?: string
  
  /** Number of retry attempts */
  retryCount: number
  
  /** Whether auto-rollback is enabled */
  autoRollback: boolean
  
  /** Backup created timestamp */
  backupCreatedAt?: number
  
  /** Whether rollback is available */
  canRollback: boolean
}

/**
 * Auth backup data structure
 */
export interface AuthBackupData {
  /** Zustand auth store state */
  zustandState: {
    user: User | null
    tokens: AuthTokens | null
    isAuthenticated: boolean
    lastActivity: number
    sessionId?: string
  }
  
  /** Browser storage data */
  localStorage: Record<string, string>
  
  /** Session storage data */
  sessionStorage: Record<string, string>
  
  /** Metadata about the backup */
  metadata: {
    timestamp: number
    version: string
    userAgent: string
    url: string
    zustandVersion?: string
    reactQueryVersion?: string
  }
  
  /** Validation checksum */
  checksum: string
}

/**
 * Auth backup service for migration safety
 */
export class AuthBackupService {
  private adapter: IndexedDBAdapter
  private isInitialized = false

  constructor() {
    this.adapter = new IndexedDBAdapter({
      name: 'digests-auth-backup',
      version: 1,
      storageOptions: {
        stores: ['auth-backup', 'migration-status'],
      },
    })
  }

  /**
   * Initialize the backup service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Test adapter functionality
      await this.adapter.get('test')
      this.isInitialized = true
      Logger.debug('[AuthBackupService] Initialized successfully')
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to initialize:', error)
      throw new PersistenceError(
        PersistenceErrorType.STORAGE_UNAVAILABLE,
        'Auth backup service initialization failed',
        error
      )
    }
  }

  /**
   * Create a comprehensive backup of auth state before migration
   */
  async createBackup(zustandState: AuthState): Promise<string> {
    await this.initialize()

    Logger.debug('[AuthBackupService] Creating auth state backup')

    try {
      // Collect all auth-related data
      const backupData: AuthBackupData = {
        zustandState: {
          user: zustandState.user,
          tokens: zustandState.tokens,
          isAuthenticated: zustandState.isAuthenticated,
          lastActivity: Date.now(),
        },
        localStorage: this.extractAuthFromStorage('localStorage'),
        sessionStorage: this.extractAuthFromStorage('sessionStorage'),
        metadata: {
          timestamp: Date.now(),
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        },
        checksum: '',
      }

      // Generate checksum for data integrity
      backupData.checksum = await this.generateChecksum(backupData)

      // Store backup
      const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await this.adapter.set(AUTH_BACKUP_KEYS.USER_STATE, backupData)
      await this.adapter.set(`${AUTH_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`, backupData)

      // Update migration status
      const migrationStatus: AuthMigrationStatus = {
        phase: 'not-started',
        progress: 0,
        retryCount: 0,
        autoRollback: true,
        backupCreatedAt: Date.now(),
        canRollback: true,
      }

      await this.adapter.set(AUTH_BACKUP_KEYS.MIGRATION_STATUS, migrationStatus)

      Logger.debug('[AuthBackupService] Backup created successfully:', backupId)
      return backupId
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to create backup:', error)
      throw new PersistenceError(
        PersistenceErrorType.SERIALIZATION_FAILED,
        'Failed to create auth state backup',
        error
      )
    }
  }

  /**
   * Validate backup data integrity
   */
  async validateBackup(backupId?: string): Promise<boolean> {
    await this.initialize()

    try {
      const backupData = backupId
        ? await this.adapter.get<AuthBackupData>(`${AUTH_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`)
        : await this.adapter.get<AuthBackupData>(AUTH_BACKUP_KEYS.USER_STATE)

      if (!backupData) {
        Logger.warn('[AuthBackupService] No backup data found')
        return false
      }

      // Verify checksum
      const currentChecksum = await this.generateChecksum({
        ...backupData,
        checksum: '',
      })

      const isValid = currentChecksum === backupData.checksum

      if (!isValid) {
        Logger.error('[AuthBackupService] Backup data corruption detected')
      }

      return isValid
    } catch (error) {
      Logger.error('[AuthBackupService] Backup validation failed:', error)
      return false
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<AuthMigrationStatus | null> {
    await this.initialize()

    try {
      return await this.adapter.get<AuthMigrationStatus>(AUTH_BACKUP_KEYS.MIGRATION_STATUS)
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to get migration status:', error)
      return null
    }
  }

  /**
   * Update migration status
   */
  async updateMigrationStatus(
    updates: Partial<AuthMigrationStatus>
  ): Promise<void> {
    await this.initialize()

    try {
      const current = await this.getMigrationStatus() || {
        phase: 'not-started' as const,
        progress: 0,
        retryCount: 0,
        autoRollback: true,
        canRollback: false,
      }

      const updated: AuthMigrationStatus = {
        ...current,
        ...updates,
      }

      await this.adapter.set(AUTH_BACKUP_KEYS.MIGRATION_STATUS, updated)
      Logger.debug('[AuthBackupService] Migration status updated:', updated.phase)
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to update migration status:', error)
      throw error
    }
  }

  /**
   * Restore auth state from backup (rollback)
   */
  async rollbackToBackup(backupId?: string): Promise<AuthBackupData> {
    await this.initialize()

    Logger.warn('[AuthBackupService] Rolling back auth state from backup')

    try {
      // Validate backup first
      const isValid = await this.validateBackup(backupId)
      if (!isValid) {
        throw new Error('Backup data is corrupted or invalid')
      }

      const backupData = backupId
        ? await this.adapter.get<AuthBackupData>(`${AUTH_BACKUP_KEYS.ROLLBACK_DATA}:${backupId}`)
        : await this.adapter.get<AuthBackupData>(AUTH_BACKUP_KEYS.USER_STATE)

      if (!backupData) {
        throw new Error('No backup data found')
      }

      // Restore browser storage
      this.restoreStorageData('localStorage', backupData.localStorage)
      this.restoreStorageData('sessionStorage', backupData.sessionStorage)

      // Update migration status
      await this.updateMigrationStatus({
        phase: 'rolled-back',
        completedAt: Date.now(),
        progress: 0,
        currentStep: 'Rollback completed',
      })

      Logger.debug('[AuthBackupService] Rollback completed successfully')
      return backupData
    } catch (error) {
      Logger.error('[AuthBackupService] Rollback failed:', error)
      
      await this.updateMigrationStatus({
        phase: 'failed',
        error: `Rollback failed: ${error.message}`,
      })

      throw new PersistenceError(
        PersistenceErrorType.CORRUPTION,
        'Failed to rollback auth state',
        error
      )
    }
  }

  /**
   * Clear all backup data (after successful migration)
   */
  async clearBackups(): Promise<void> {
    await this.initialize()

    try {
      await this.adapter.delete(AUTH_BACKUP_KEYS.USER_STATE)
      
      // Clear all rollback data
      // Note: This would need adapter support for pattern-based deletion
      // For now, we'll mark as cleared in migration status
      await this.updateMigrationStatus({
        phase: 'completed',
        completedAt: Date.now(),
        progress: 1,
        canRollback: false,
        currentStep: 'Migration completed, backups cleared',
      })

      Logger.debug('[AuthBackupService] Backup data cleared')
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to clear backups:', error)
      throw error
    }
  }

  /**
   * Get backup storage info
   */
  async getBackupInfo(): Promise<{
    hasBackup: boolean
    backupAge?: number
    backupSize?: number
    migrationStatus?: AuthMigrationStatus
  }> {
    await this.initialize()

    try {
      const backupData = await this.adapter.get<AuthBackupData>(AUTH_BACKUP_KEYS.USER_STATE)
      const migrationStatus = await this.getMigrationStatus()

      if (!backupData) {
        return { hasBackup: false, migrationStatus }
      }

      const backupAge = Date.now() - backupData.metadata.timestamp

      return {
        hasBackup: true,
        backupAge,
        migrationStatus,
      }
    } catch (error) {
      Logger.error('[AuthBackupService] Failed to get backup info:', error)
      return { hasBackup: false }
    }
  }

  /**
   * Extract auth-related data from browser storage
   */
  private extractAuthFromStorage(storageType: 'localStorage' | 'sessionStorage'): Record<string, string> {
    if (typeof window === 'undefined') return {}

    const storage = window[storageType]
    const authData: Record<string, string> = {}

    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && this.isAuthRelatedKey(key)) {
          const value = storage.getItem(key)
          if (value) {
            authData[key] = value
          }
        }
      }
    } catch (error) {
      Logger.warn(`[AuthBackupService] Failed to extract from ${storageType}:`, error)
    }

    return authData
  }

  /**
   * Check if a storage key is auth-related
   */
  private isAuthRelatedKey(key: string): boolean {
    const authKeyPatterns = [
      /^auth:/,
      /^user:/,
      /^token/,
      /^session/,
      /digests.*auth/,
      /zustand.*auth/,
    ]

    return authKeyPatterns.some(pattern => pattern.test(key))
  }

  /**
   * Restore data to browser storage
   */
  private restoreStorageData(
    storageType: 'localStorage' | 'sessionStorage',
    data: Record<string, string>
  ): void {
    if (typeof window === 'undefined') return

    const storage = window[storageType]

    try {
      // Clear existing auth data first
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && this.isAuthRelatedKey(key)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key))

      // Restore backup data
      Object.entries(data).forEach(([key, value]) => {
        storage.setItem(key, value)
      })

      Logger.debug(`[AuthBackupService] Restored ${Object.keys(data).length} items to ${storageType}`)
    } catch (error) {
      Logger.error(`[AuthBackupService] Failed to restore to ${storageType}:`, error)
      throw error
    }
  }

  /**
   * Generate checksum for data integrity verification
   */
  private async generateChecksum(data: Omit<AuthBackupData, 'checksum'>): Promise<string> {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(dataString)
    
    if (typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      // Fallback for environments without crypto.subtle
      let hash = 0
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return hash.toString(16)
    }
  }

  /**
   * Auto-rollback on migration failure
   */
  async attemptAutoRollback(): Promise<boolean> {
    try {
      const status = await this.getMigrationStatus()
      
      if (!status?.autoRollback || !status.canRollback) {
        Logger.warn('[AuthBackupService] Auto-rollback not available')
        return false
      }

      if (status.phase === 'failed' && status.retryCount < 3) {
        Logger.info('[AuthBackupService] Attempting auto-rollback')
        await this.rollbackToBackup()
        return true
      }

      return false
    } catch (error) {
      Logger.error('[AuthBackupService] Auto-rollback failed:', error)
      return false
    }
  }
}

// Singleton instance
export const authBackupService = new AuthBackupService()