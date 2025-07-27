// ABOUTME: Secure persistence layer specifically for authentication data
// ABOUTME: Provides encrypted storage for tokens and auth state with React Query integration

import { createEncryptedPersister, EncryptionKeyManager } from '@/utils/encryption'
import { IndexedDBAdapter } from './indexdb-adapter'
import type { 
  PersistenceAdapter, 
  QueryPersistConfig,
  QueryPersister,
  SecurePersistConfig 
} from '@/types/persistence'
import type { AuthTokens, AuthState } from '@/types/auth'
import { Logger } from '@/utils/logger'

/**
 * Configuration for auth-specific persistence
 */
export interface AuthPersistConfig extends QueryPersistConfig {
  /** Enable encryption for auth data (strongly recommended) */
  enableEncryption?: boolean
  /** Custom encryption config for auth data */
  encryptionConfig?: SecurePersistConfig
  /** Token refresh threshold (refresh when this close to expiry) */
  refreshThreshold?: number
  /** Maximum token lifetime for security */
  maxTokenLifetime?: number
}

/**
 * Default configuration optimized for authentication data
 */
const DEFAULT_AUTH_CONFIG: AuthPersistConfig = {
  enableEncryption: true,
  throttleTime: 500, // Faster for auth updates
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  batchingInterval: 50, // Quick batching for auth
  persistedQueries: ['auth', 'user', 'auth-status'],
  excludedQueries: ['auth-temp', 'login-attempt'],
  refreshThreshold: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  maxTokenLifetime: 7 * 24 * 60 * 60 * 1000, // 7 days max
  encryptionConfig: {
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: 100000,
  }
}

/**
 * Specialized auth persistence class
 */
export class AuthPersister {
  private adapter: PersistenceAdapter
  private persister: QueryPersister
  private config: AuthPersistConfig
  private isEncrypted: boolean

  constructor(config: Partial<AuthPersistConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config }
    this.isEncrypted = this.config.enableEncryption ?? true
    
    // Initialize adapter and persister
    this.initializeAdapter()
  }

  /**
   * Initialize the persistence adapter
   */
  private async initializeAdapter(): Promise<void> {
    try {
      // Create base IndexedDB adapter
      const baseAdapter = new IndexedDBAdapter({
        dbName: 'digests_auth',
        version: 1,
        stores: ['auth_data', 'tokens', 'user_prefs']
      })

      if (this.isEncrypted) {
        // Wrap with encryption
        this.adapter = await createEncryptedPersister(
          baseAdapter,
          undefined, // Auto-generate key
          this.config.encryptionConfig
        )
      } else {
        this.adapter = baseAdapter
      }

      Logger.info('[AuthPersister] Initialized with encryption:', this.isEncrypted)
    } catch (error) {
      Logger.error('[AuthPersister] Failed to initialize adapter:', error)
      throw new Error('Failed to initialize auth persistence')
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      // Validate tokens before storing
      this.validateTokens(tokens)

      // Calculate expiry time
      const expiresAt = Date.now() + (tokens.expiresIn * 1000)
      
      // Store with metadata
      const tokenData = {
        ...tokens,
        storedAt: Date.now(),
        expiresAt,
        isValid: true
      }

      await this.adapter.set('auth_tokens', tokenData, this.config.maxTokenLifetime)
      
      Logger.debug('[AuthPersister] Tokens stored successfully')
    } catch (error) {
      Logger.error('[AuthPersister] Failed to store tokens:', error)
      throw error
    }
  }

  /**
   * Retrieve stored authentication tokens
   */
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokenData = await this.adapter.get<any>('auth_tokens')
      
      if (!tokenData) {
        return null
      }

      // Check if tokens are expired
      if (this.areTokensExpired(tokenData)) {
        Logger.debug('[AuthPersister] Tokens expired, removing')
        await this.clearTokens()
        return null
      }

      // Return clean token data
      const { storedAt, expiresAt, isValid, ...tokens } = tokenData
      return tokens as AuthTokens
    } catch (error) {
      Logger.error('[AuthPersister] Failed to get tokens:', error)
      return null
    }
  }

  /**
   * Store authentication state
   */
  async storeAuthState(state: AuthState): Promise<void> {
    try {
      const stateData = {
        ...state,
        lastUpdated: Date.now()
      }

      await this.adapter.set('auth_state', stateData)
      Logger.debug('[AuthPersister] Auth state stored')
    } catch (error) {
      Logger.error('[AuthPersister] Failed to store auth state:', error)
      throw error
    }
  }

  /**
   * Retrieve authentication state
   */
  async getAuthState(): Promise<AuthState | null> {
    try {
      const state = await this.adapter.get<AuthState & { lastUpdated: number }>('auth_state')
      
      if (!state) {
        return null
      }

      // Check if state is too old
      const maxAge = this.config.maxAge || 24 * 60 * 60 * 1000
      if (Date.now() - state.lastUpdated > maxAge) {
        await this.clearAuthState()
        return null
      }

      // Remove internal metadata
      const { lastUpdated, ...authState } = state
      return authState
    } catch (error) {
      Logger.error('[AuthPersister] Failed to get auth state:', error)
      return null
    }
  }

  /**
   * Check if tokens need refresh
   */
  async shouldRefreshTokens(): Promise<boolean> {
    try {
      const tokenData = await this.adapter.get<any>('auth_tokens')
      
      if (!tokenData || !tokenData.expiresAt) {
        return false
      }

      const timeUntilExpiry = tokenData.expiresAt - Date.now()
      const threshold = this.config.refreshThreshold || 5 * 60 * 1000
      
      return timeUntilExpiry <= threshold && timeUntilExpiry > 0
    } catch (error) {
      Logger.error('[AuthPersister] Error checking token refresh:', error)
      return false
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      await this.adapter.delete('auth_tokens')
      Logger.debug('[AuthPersister] Tokens cleared')
    } catch (error) {
      Logger.error('[AuthPersister] Failed to clear tokens:', error)
    }
  }

  /**
   * Clear authentication state
   */
  async clearAuthState(): Promise<void> {
    try {
      await this.adapter.delete('auth_state')
      Logger.debug('[AuthPersister] Auth state cleared')
    } catch (error) {
      Logger.error('[AuthPersister] Failed to clear auth state:', error)
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.clearTokens(),
        this.clearAuthState(),
        this.adapter.delete('user_data'),
        this.adapter.delete('user_preferences')
      ])
      
      // If encrypted, also clear encryption keys
      if (this.isEncrypted) {
        await EncryptionKeyManager.clearKeys()
      }
      
      Logger.info('[AuthPersister] All auth data cleared')
    } catch (error) {
      Logger.error('[AuthPersister] Failed to clear all auth data:', error)
      throw error
    }
  }

  /**
   * Get storage health information
   */
  async getStorageHealth(): Promise<{
    isHealthy: boolean
    usedSpace: number
    availableSpace: number
    tokenCount: number
    lastCleanup: number
  }> {
    try {
      const storageInfo = await this.adapter.getStorageInfo()
      const isHealthy = storageInfo.used < (storageInfo.quota * 0.8) // 80% threshold
      
      return {
        isHealthy,
        usedSpace: storageInfo.used,
        availableSpace: storageInfo.quota - storageInfo.used,
        tokenCount: storageInfo.count,
        lastCleanup: Date.now() // TODO: Track actual cleanup times
      }
    } catch (error) {
      Logger.error('[AuthPersister] Failed to get storage health:', error)
      return {
        isHealthy: false,
        usedSpace: 0,
        availableSpace: 0,
        tokenCount: 0,
        lastCleanup: 0
      }
    }
  }

  /**
   * Validate token structure
   */
  private validateTokens(tokens: AuthTokens): void {
    if (!tokens.accessToken) {
      throw new Error('Access token is required')
    }
    
    if (!tokens.refreshToken) {
      throw new Error('Refresh token is required')
    }
    
    if (!tokens.expiresIn || tokens.expiresIn <= 0) {
      throw new Error('Valid expiry time is required')
    }

    // Check for reasonable expiry bounds
    const maxAllowed = this.config.maxTokenLifetime || 7 * 24 * 60 * 60 * 1000
    if (tokens.expiresIn * 1000 > maxAllowed) {
      throw new Error('Token lifetime exceeds maximum allowed')
    }
  }

  /**
   * Check if tokens are expired
   */
  private areTokensExpired(tokenData: any): boolean {
    if (!tokenData.expiresAt) {
      return true
    }
    
    return Date.now() >= tokenData.expiresAt
  }

  /**
   * Static factory method
   */
  static async create(config?: Partial<AuthPersistConfig>): Promise<AuthPersister> {
    const persister = new AuthPersister(config)
    await persister.initializeAdapter()
    return persister
  }
}

/**
 * Global auth persister instance
 */
let globalAuthPersister: AuthPersister | null = null

/**
 * Get or create the global auth persister instance
 */
export async function getAuthPersister(): Promise<AuthPersister> {
  if (!globalAuthPersister) {
    globalAuthPersister = await AuthPersister.create()
  }
  return globalAuthPersister
}

/**
 * Reset the global auth persister (for testing or cleanup)
 */
export async function resetAuthPersister(): Promise<void> {
  if (globalAuthPersister) {
    await globalAuthPersister.clearAll()
    globalAuthPersister = null
  }
}