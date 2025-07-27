/**
 * Persistence layer type definitions for React Query offline support
 * These interfaces define the contract for storing and retrieving cached data
 */

/**
 * Core persistence adapter interface
 * Implementations can use IndexedDB, localStorage, or other storage mechanisms
 */
export interface PersistenceAdapter {
  /**
   * Retrieve a value by key
   * @returns The stored value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>
  
  /**
   * Store a value with optional TTL
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  
  /**
   * Remove a value by key
   */
  delete(key: string): Promise<void>
  
  /**
   * Clear all stored values
   */
  clear(): Promise<void>
  
  /**
   * Retrieve multiple values at once (for performance)
   */
  getMany<T>(keys: string[]): Promise<Map<string, T>>
  
  /**
   * Store multiple values at once (for performance)
   */
  setMany<T>(entries: Map<string, T>): Promise<void>
  
  /**
   * Get storage size information
   */
  getStorageInfo(): Promise<StorageInfo>
}

/**
 * Storage information for monitoring and cleanup
 */
export interface StorageInfo {
  /** Total storage used in bytes */
  used: number
  /** Total storage quota in bytes */
  quota: number
  /** Number of entries stored */
  count: number
  /** Oldest entry timestamp */
  oldestEntry?: number
}

/**
 * Persisted query data structure
 */
export interface PersistedQueryData<T = unknown> {
  /** Query key hash */
  key: string
  /** The actual query data */
  data: T
  /** When the data was last updated */
  dataUpdatedAt: number
  /** When this entry expires (optional) */
  expiresAt?: number
  /** Error state if any */
  error?: unknown
  /** Additional metadata */
  meta?: QueryMeta
}

/**
 * Metadata for persisted queries
 */
export interface QueryMeta {
  /** Feed URL for feed-specific queries */
  feedUrl?: string
  /** User ID for user-specific queries */
  userId?: string
  /** Query type for categorization */
  queryType?: 'feed' | 'article' | 'user' | 'config'
  /** Custom tags for filtering */
  tags?: string[]
}

/**
 * Configuration for React Query persistence
 */
export interface QueryPersistConfig {
  /** The persistence adapter to use */
  adapter: PersistenceAdapter
  
  /** Throttle time for write operations (ms) */
  throttleTime?: number
  
  /** Maximum age for cached data (ms) */
  maxAge?: number
  
  /** Interval for batching write operations (ms) */
  batchingInterval?: number
  
  /** List of query keys to persist (whitelist) */
  persistedQueries?: string[]
  
  /** List of query keys to exclude (blacklist) */
  excludedQueries?: string[]
  
  /** Custom serialization function */
  serialize?: (data: unknown) => string | Uint8Array
  
  /** Custom deserialization function */
  deserialize?: (data: string | Uint8Array) => unknown
  
  /** Enable compression for large data */
  enableCompression?: boolean
  
  /** Compression threshold in bytes */
  compressionThreshold?: number
  
  /** Enable encryption for sensitive data */
  enableEncryption?: boolean
  
  /** Encryption key or key derivation function */
  encryptionKey?: string | (() => Promise<CryptoKey>)
}

/**
 * Persister interface for React Query integration
 */
export interface QueryPersister {
  /** Persist query data */
  persistQuery(queryKey: unknown[], data: unknown): Promise<void>
  
  /** Restore query data */
  restoreQuery(queryKey: unknown[]): Promise<unknown | null>
  
  /** Remove persisted query */
  removeQuery(queryKey: unknown[]): Promise<void>
  
  /** Clear all persisted queries */
  clearQueries(): Promise<void>
}

/**
 * Options for individual query persistence
 */
export interface QueryPersistOptions {
  /** Whether to persist this query */
  persist?: boolean
  
  /** Custom TTL for this query */
  ttl?: number
  
  /** Custom serialization for this query */
  serialize?: (data: unknown) => string | Uint8Array
  
  /** Custom deserialization for this query */
  deserialize?: (data: string | Uint8Array) => unknown
  
  /** Whether to encrypt this query data */
  encrypt?: boolean
  
  /** Custom metadata for this query */
  meta?: QueryMeta
}

/**
 * Migration strategy for updating persisted data schema
 */
export interface MigrationStrategy {
  /** Current schema version */
  version: number
  
  /** Migrate data from old schema to new */
  migrate(oldData: unknown, oldVersion: number): Promise<unknown>
  
  /** Rollback to previous version if needed */
  rollback?(): Promise<void>
  
  /** Validate migrated data */
  validate?(data: unknown): boolean
}

/**
 * Persistence error types
 */
export enum PersistenceErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  CORRUPTION = 'CORRUPTION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  SERIALIZATION_FAILED = 'SERIALIZATION_FAILED',
}

/**
 * Custom error class for persistence operations
 */
export class PersistenceError extends Error {
  constructor(
    public type: PersistenceErrorType,
    message: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'PersistenceError'
  }
}

/**
 * Cleanup strategy for managing storage space
 */
export interface CleanupStrategy {
  /** Maximum storage to use (percentage of quota) */
  maxStoragePercent?: number
  
  /** Maximum number of entries to keep */
  maxEntries?: number
  
  /** Remove entries older than this (ms) */
  maxAge?: number
  
  /** Custom cleanup function */
  customCleanup?: (adapter: PersistenceAdapter) => Promise<void>
}

/**
 * Performance metrics for persistence operations
 */
export interface PersistenceMetrics {
  /** Track a read operation */
  trackRead(key: string, duration: number, hit: boolean): void
  
  /** Track a write operation */
  trackWrite(key: string, duration: number, size: number): void
  
  /** Track a delete operation */
  trackDelete(key: string, duration: number): void
  
  /** Get current metrics summary */
  getSummary(): MetricsSummary
}

/**
 * Summary of persistence metrics
 */
export interface MetricsSummary {
  /** Total number of reads */
  readCount: number
  
  /** Cache hit rate (0-1) */
  hitRate: number
  
  /** Average read duration (ms) */
  avgReadTime: number
  
  /** Total number of writes */
  writeCount: number
  
  /** Average write duration (ms) */
  avgWriteTime: number
  
  /** Total storage used (bytes) */
  storageUsed: number
}

/**
 * Sync status for offline/online transitions
 */
export interface SyncStatus {
  /** Whether currently online */
  isOnline: boolean
  
  /** Last successful sync timestamp */
  lastSync: number
  
  /** Queries pending sync */
  pendingQueries: string[]
  
  /** Whether sync is in progress */
  isSyncing: boolean
  
  /** Sync errors if any */
  errors?: SyncError[]
}

/**
 * Sync error information
 */
export interface SyncError {
  /** Query key that failed to sync */
  queryKey: string
  
  /** Error message */
  message: string
  
  /** Timestamp of error */
  timestamp: number
  
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Configuration for secure persistence
 */
export interface SecurePersistConfig {
  /** Encryption algorithm to use */
  algorithm?: 'AES-GCM' | 'AES-CBC'
  
  /** Key derivation function */
  kdf?: 'PBKDF2' | 'scrypt'
  
  /** Number of iterations for KDF */
  iterations?: number
  
  /** Salt for key derivation */
  salt?: Uint8Array
  
  /** IV generation function */
  generateIV?: () => Uint8Array
}

/**
 * Batch operation for performance
 */
export interface BatchOperation<T> {
  /** Operation type */
  type: 'set' | 'delete'
  
  /** Operation key */
  key: string
  
  /** Operation value (for set) */
  value?: T
  
  /** Operation TTL (for set) */
  ttl?: number
}

/**
 * Persistence adapter factory
 */
export interface PersistenceAdapterFactory {
  /** Create an adapter instance */
  create(config?: AdapterConfig): PersistenceAdapter
  
  /** Check if adapter is supported in current environment */
  isSupported(): boolean
  
  /** Get adapter capabilities */
  getCapabilities(): AdapterCapabilities
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  /** Database/storage name */
  name?: string
  
  /** Version for migrations */
  version?: number
  
  /** Storage options */
  storageOptions?: Record<string, unknown>
}

/**
 * Adapter capabilities
 */
export interface AdapterCapabilities {
  /** Maximum storage available */
  maxStorage?: number
  
  /** Supports encryption */
  encryption: boolean
  
  /** Supports compression */
  compression: boolean
  
  /** Supports transactions */
  transactions: boolean
  
  /** Supports indexing */
  indexing: boolean
}