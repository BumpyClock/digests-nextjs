/**
 * Tests for usePersistentQuery hook
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePersistentQuery, usePersistentQueries, usePrefetchPersistentQuery } from '../usePersistentQuery'
import { IndexedDBAdapter } from '@/lib/persistence/indexdb-adapter'

// Mock the persistence module
jest.mock('@/lib/persistence', () => ({
  useOfflineStatus: jest.fn(() => ({
    isOnline: true,
    lastSync: Date.now(),
    updateLastSync: jest.fn(),
    isStale: false,
  })),
}))

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
}
global.indexedDB = mockIndexedDB as any

describe('usePersistentQuery', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    // Reset mocks
    jest.clearAllMocks()
    
    // Mock successful IndexedDB operations
    mockIndexedDB.open.mockReturnValue({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        close: jest.fn(),
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            get: jest.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: null,
            })),
            put: jest.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
          })),
        })),
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('should fetch data and persist it', async () => {
    const mockData = { id: 1, name: 'Test' }
    const queryFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toEqual(mockData)
    })

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should handle offline-first behavior', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const mockData = { id: 1, name: 'Cached' }
    const queryFn = jest.fn().mockResolvedValue({ id: 1, name: 'Fresh' })

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn, {
        initialData: mockData,
        offlineFirst: true,
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
    })

    // Query function should not be called when offline with initial data
    expect(queryFn).not.toHaveBeenCalled()
  })

  it('should sync data when coming online', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    const mockUpdateLastSync = jest.fn()
    const isOnlineRef = { current: false }

    useOfflineStatus.mockImplementation(() => ({
      isOnline: isOnlineRef.current,
      lastSync: Date.now(),
      updateLastSync: mockUpdateLastSync,
      isStale: false,
    }))

    const localData = { id: 1, name: 'Local' }
    const remoteData = { id: 1, name: 'Remote' }
    const queryFn = jest.fn().mockResolvedValue(remoteData)
    const syncFn = jest.fn().mockImplementation((local, remote) => remote)

    const { result, rerender } = renderHook(
      () => usePersistentQuery(['test'], queryFn, {
        initialData: localData,
        syncOnReconnect: true,
        syncFn,
      }),
      { wrapper }
    )

    // Initially offline with local data
    expect(result.current.data).toEqual(localData)

    // Simulate coming online
    isOnlineRef.current = true
    rerender()

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('success')
    })

    expect(syncFn).toHaveBeenCalledWith(localData, remoteData)
    expect(mockUpdateLastSync).toHaveBeenCalled()
  })

  it('should handle sync conflicts', async () => {
    const localData = { id: 1, name: 'Local', version: 1 }
    const remoteData = { id: 1, name: 'Remote', version: 2 }
    const queryFn = jest.fn().mockResolvedValue(remoteData)
    const onConflict = jest.fn()
    
    const syncFn = jest.fn().mockImplementation((local, remote) => {
      // Simple version-based conflict resolution
      return remote.version > local.version ? remote : local
    })

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn, {
        initialData: localData,
        syncFn,
        onConflict,
      }),
      { wrapper }
    )

    await result.current.forceSync()

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('success')
    })

    expect(onConflict).toHaveBeenCalledWith(localData, remoteData)
  })

  it('should handle restoration callback', async () => {
    const restoredData = { id: 1, name: 'Restored' }
    const onRestore = jest.fn()
    const queryFn = jest.fn().mockResolvedValue(restoredData)

    // Simulate restored data by setting a past update time
    queryClient.setQueryData(['test'], restoredData)
    const query = queryClient.getQueryCache().find(['test'])
    if (query) {
      query.state.dataUpdatedAt = Date.now() - 2000
    }

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn, {
        onRestore,
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isRestored).toBe(true)
    })

    expect(onRestore).toHaveBeenCalledWith(restoredData)
  })

  it('should force sync when requested', async () => {
    const mockData = { id: 1, name: 'Test' }
    const queryFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Reset mock
    queryFn.mockClear()

    // Force sync
    await result.current.forceSync()

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled()
    })
  })

  it('should throw error when forcing sync offline', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const queryFn = jest.fn()

    const { result } = renderHook(
      () => usePersistentQuery(['test'], queryFn),
      { wrapper }
    )

    await expect(result.current.forceSync()).rejects.toThrow('Cannot sync while offline')
  })
})

describe('usePersistentQueries', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  })

  it('should manage multiple queries', async () => {
    const queries = [
      {
        queryKey: ['query1'],
        queryFn: jest.fn().mockResolvedValue({ id: 1 }),
      },
      {
        queryKey: ['query2'],
        queryFn: jest.fn().mockResolvedValue({ id: 2 }),
      },
    ]

    const { result } = renderHook(
      () => usePersistentQueries(queries),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.queries[0].isSuccess).toBe(true)
      expect(result.current.queries[1].isSuccess).toBe(true)
    })

    expect(result.current.queries[0].data).toEqual({ id: 1 })
    expect(result.current.queries[1].data).toEqual({ id: 2 })
    expect(result.current.syncStatus).toBe('success')
  })

  it('should sync all queries', async () => {
    const queries = [
      {
        queryKey: ['query1'],
        queryFn: jest.fn().mockResolvedValue({ id: 1 }),
      },
      {
        queryKey: ['query2'],
        queryFn: jest.fn().mockResolvedValue({ id: 2 }),
      },
    ]

    const { result } = renderHook(
      () => usePersistentQueries(queries),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('success')
    })

    // Clear mocks
    queries.forEach(q => q.queryFn.mockClear())

    // Sync all
    await result.current.syncAll()

    await waitFor(() => {
      queries.forEach(q => {
        expect(q.queryFn).toHaveBeenCalled()
      })
    })
  })

  it('should report correct sync status', async () => {
    const queries = [
      {
        queryKey: ['query1'],
        queryFn: jest.fn().mockResolvedValue({ id: 1 }),
      },
      {
        queryKey: ['query2'],
        queryFn: jest.fn().mockRejectedValue(new Error('Failed')),
      },
    ]

    const { result } = renderHook(
      () => usePersistentQueries(queries),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('error')
    })
  })
})

describe('usePrefetchPersistentQuery', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    // Mock query client import
    jest.mock('@/lib/query-client', () => ({
      queryClient,
    }))
  })

  it('should prefetch and persist data when online', async () => {
    const mockData = { id: 1, name: 'Prefetched' }
    const queryFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(
      () => usePrefetchPersistentQuery(),
      { wrapper }
    )

    await result.current.prefetchPersistent(['prefetch-test'], queryFn, {
      persist: true,
      ttl: 60000,
    })

    expect(queryFn).toHaveBeenCalled()
    
    // Check if data was set in query cache
    const cachedData = queryClient.getQueryData(['prefetch-test'])
    expect(cachedData).toEqual(mockData)
  })

  it('should not prefetch when offline', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const queryFn = jest.fn()

    const { result } = renderHook(
      () => usePrefetchPersistentQuery(),
      { wrapper }
    )

    await result.current.prefetchPersistent(['prefetch-test'], queryFn)

    expect(queryFn).not.toHaveBeenCalled()
  })

  it('should handle prefetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const queryFn = jest.fn().mockRejectedValue(new Error('Prefetch failed'))

    const { result } = renderHook(
      () => usePrefetchPersistentQuery(),
      { wrapper }
    )

    await result.current.prefetchPersistent(['prefetch-test'], queryFn)

    expect(consoleError).toHaveBeenCalledWith('Prefetch failed:', expect.any(Error))
    
    consoleError.mockRestore()
  })
})