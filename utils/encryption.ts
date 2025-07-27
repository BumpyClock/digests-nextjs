/**
 * Encryption utilities using Web Crypto API
 * Provides secure encryption for sensitive data in persistence layer
 */

import type { SecurePersistConfig } from '@/types/persistence'

/**
 * Encryption key management
 */
export class EncryptionKeyManager {
  private static readonly KEY_STORAGE_NAME = 'digests_encryption_key'
  private static readonly SALT_STORAGE_NAME = 'digests_encryption_salt'
  private static cachedKey: CryptoKey | null = null

  /**
   * Generate a new encryption key
   */
  static async generateKey(
    password?: string,
    config?: SecurePersistConfig
  ): Promise<CryptoKey> {
    const algorithm = config?.algorithm || 'AES-GCM'
    
    if (password) {
      // Derive key from password
      return this.deriveKeyFromPassword(password, config)
    } else {
      // Generate random key
      return crypto.subtle.generateKey(
        {
          name: algorithm,
          length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )
    }
  }

  /**
   * Derive encryption key from password
   */
  static async deriveKeyFromPassword(
    password: string,
    config?: SecurePersistConfig
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    // Get or generate salt
    const salt = config?.salt || await this.getOrCreateSalt()
    const iterations = config?.iterations || 100000
    const algorithm = config?.algorithm || 'AES-GCM'

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: algorithm,
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Get or create persistent salt
   */
  private static async getOrCreateSalt(): Promise<Uint8Array> {
    // Try to get from IndexedDB
    const stored = localStorage.getItem(this.SALT_STORAGE_NAME)
    
    if (stored) {
      return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    }

    // Generate new salt
    const salt = crypto.getRandomValues(new Uint8Array(16))
    localStorage.setItem(this.SALT_STORAGE_NAME, btoa(String.fromCharCode(...salt)))
    
    return salt
  }

  /**
   * Store encryption key securely
   */
  static async storeKey(key: CryptoKey): Promise<void> {
    // Export key
    const exported = await crypto.subtle.exportKey('jwk', key)
    
    // Store in IndexedDB (more secure than localStorage)
    const db = await this.openKeyDatabase()
    const transaction = db.transaction(['keys'], 'readwrite')
    const store = transaction.objectStore('keys')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(exported, this.KEY_STORAGE_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
    
    // Cache in memory
    this.cachedKey = key
  }

  /**
   * Retrieve stored encryption key
   */
  static async retrieveKey(algorithm: string = 'AES-GCM'): Promise<CryptoKey | null> {
    // Check cache first
    if (this.cachedKey) {
      return this.cachedKey
    }

    try {
      const db = await this.openKeyDatabase()
      const transaction = db.transaction(['keys'], 'readonly')
      const store = transaction.objectStore('keys')
      
      const exported = await new Promise<JsonWebKey | null>((resolve, reject) => {
        const request = store.get(this.KEY_STORAGE_NAME)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
      
      db.close()
      
      if (!exported) {
        return null
      }

      // Import key
      const key = await crypto.subtle.importKey(
        'jwk',
        exported,
        {
          name: algorithm,
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      )
      
      // Cache it
      this.cachedKey = key
      return key
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error)
      return null
    }
  }

  /**
   * Open key storage database
   */
  private static openKeyDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('digests_keystore', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys')
        }
      }
    })
  }

  /**
   * Clear stored keys
   */
  static async clearKeys(): Promise<void> {
    this.cachedKey = null
    localStorage.removeItem(this.SALT_STORAGE_NAME)
    
    try {
      const db = await this.openKeyDatabase()
      const transaction = db.transaction(['keys'], 'readwrite')
      const store = transaction.objectStore('keys')
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(this.KEY_STORAGE_NAME)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
      
      db.close()
    } catch (error) {
      console.error('Failed to clear keys:', error)
    }
  }
}

/**
 * Main encryption utilities
 */
export class EncryptionUtils {
  /**
   * Encrypt data with AES-GCM
   */
  static async encrypt(
    data: string | Uint8Array,
    key: CryptoKey,
    config?: SecurePersistConfig
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const algorithm = config?.algorithm || 'AES-GCM'
    const iv = config?.generateIV?.() || crypto.getRandomValues(new Uint8Array(12))
    
    // Convert string to Uint8Array if needed
    const dataBuffer = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : data

    const encrypted = await crypto.subtle.encrypt(
      {
        name: algorithm,
        iv,
      },
      key,
      dataBuffer
    )

    return { encrypted, iv }
  }

  /**
   * Decrypt data
   */
  static async decrypt(
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
    key: CryptoKey,
    config?: SecurePersistConfig
  ): Promise<ArrayBuffer> {
    const algorithm = config?.algorithm || 'AES-GCM'
    
    return crypto.subtle.decrypt(
      {
        name: algorithm,
        iv,
      },
      key,
      encryptedData
    )
  }

  /**
   * Encrypt and encode for storage
   */
  static async encryptForStorage(
    data: unknown,
    key: CryptoKey,
    config?: SecurePersistConfig
  ): Promise<string> {
    // Serialize data
    const serialized = JSON.stringify(data)
    
    // Encrypt
    const { encrypted, iv } = await this.encrypt(serialized, key, config)
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    // Encode for storage
    return btoa(String.fromCharCode(...combined))
  }

  /**
   * Decode and decrypt from storage
   */
  static async decryptFromStorage(
    encoded: string,
    key: CryptoKey,
    config?: SecurePersistConfig
  ): Promise<unknown> {
    // Decode from base64
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    // Decrypt
    const decrypted = await this.decrypt(encrypted.buffer, iv, key, config)
    
    // Deserialize
    const decoded = new TextDecoder().decode(decrypted)
    return JSON.parse(decoded)
  }

  /**
   * Check if encryption is supported
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.encrypt === 'function'
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    const array = crypto.getRandomValues(new Uint8Array(length))
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Encrypted persistence adapter wrapper
 */
export class EncryptedPersistenceAdapter {
  private adapter: any // Using any to avoid circular dependency
  private key: CryptoKey
  private config?: SecurePersistConfig

  constructor(
    adapter: any,
    key: CryptoKey,
    config?: SecurePersistConfig
  ) {
    this.adapter = adapter
    this.key = key
    this.config = config
  }

  /**
   * Get and decrypt value
   */
  async get<T>(key: string): Promise<T | null> {
    const encrypted = await this.adapter.get<string>(key)
    
    if (!encrypted) {
      return null
    }

    try {
      const decrypted = await EncryptionUtils.decryptFromStorage(
        encrypted,
        this.key,
        this.config
      )
      return decrypted as T
    } catch (error) {
      console.error('Decryption failed for key:', key, error)
      return null
    }
  }

  /**
   * Encrypt and set value
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const encrypted = await EncryptionUtils.encryptForStorage(
      value,
      this.key,
      this.config
    )
    
    await this.adapter.set(key, encrypted, ttl)
  }

  /**
   * Delete value
   */
  async delete(key: string): Promise<void> {
    await this.adapter.delete(key)
  }

  /**
   * Clear all values
   */
  async clear(): Promise<void> {
    await this.adapter.clear()
  }

  /**
   * Get many values (batch decrypt)
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const encrypted = await this.adapter.getMany<string>(keys)
    const decrypted = new Map<string, T>()

    for (const [key, value] of encrypted) {
      if (value) {
        try {
          const data = await EncryptionUtils.decryptFromStorage(
            value,
            this.key,
            this.config
          )
          decrypted.set(key, data as T)
        } catch (error) {
          console.error('Batch decryption failed for key:', key, error)
        }
      }
    }

    return decrypted
  }

  /**
   * Set many values (batch encrypt)
   */
  async setMany<T>(entries: Map<string, T>): Promise<void> {
    const encrypted = new Map<string, string>()

    for (const [key, value] of entries) {
      const data = await EncryptionUtils.encryptForStorage(
        value,
        this.key,
        this.config
      )
      encrypted.set(key, data)
    }

    await this.adapter.setMany(encrypted)
  }

  /**
   * Get storage info
   */
  async getStorageInfo() {
    return this.adapter.getStorageInfo()
  }
}

/**
 * Create an encrypted query persister
 */
export async function createEncryptedPersister(
  adapter: any,
  password?: string,
  config?: SecurePersistConfig
) {
  // Get or create encryption key
  let key = await EncryptionKeyManager.retrieveKey(config?.algorithm)
  
  if (!key) {
    key = await EncryptionKeyManager.generateKey(password, config)
    await EncryptionKeyManager.storeKey(key)
  }

  // Return encrypted adapter
  return new EncryptedPersistenceAdapter(adapter, key, config)
}