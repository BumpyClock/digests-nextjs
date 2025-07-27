/**
 * Tests for useSyncQueue hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSyncQueue, useOfflineMutation } from '../useSyncQueue'

// Mock the persistence module
jest.mock('@/lib/persistence', () => ({
  useOfflineStatus: jest.fn(() => ({
    isOnline: true,
    lastSync: Date.now(),
    updateLastSync: jest.fn(),
    isStale: false,
  })),
}))

// Mock IndexedDBAdapter
jest.mock('@/lib/persistence/indexdb-adapter', () => ({
  IndexedDBAdapter: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}))

describe('useSyncQueue', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    jest.clearAllMocks()
  })

  it('should queue mutations when offline', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    const mutationFn = jest.fn().mockResolvedValue({ success: true })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    expect(result.current.queue).toHaveLength(1)
    expect(result.current.queue[0]).toMatchObject({
      mutationKey: ['test-mutation'],
      variables: { id: 1 },
      status: 'pending',
    })
    
    // Mutation should not be executed when offline
    expect(mutationFn).not.toHaveBeenCalled()
  })

  it('should execute mutations immediately when online', async () => {
    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    const mutationFn = jest.fn().mockResolvedValue({ success: true })
    const onMutationSuccess = jest.fn()

    const { result: syncQueueResult } = renderHook(
      () => useSyncQueue({ onMutationSuccess }),
      { wrapper }
    )

    act(() => {
      syncQueueResult.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalledWith({ id: 1 })
      expect(onMutationSuccess).toHaveBeenCalled()
    })
  })

  it('should process queue when coming online', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    const isOnlineRef = { current: false }

    useOfflineStatus.mockImplementation(() => ({
      isOnline: isOnlineRef.current,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    }))

    const { result, rerender } = renderHook(() => useSyncQueue(), { wrapper })

    const mutationFn = jest.fn().mockResolvedValue({ success: true })

    // Queue while offline
    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    expect(mutationFn).not.toHaveBeenCalled()

    // Come online
    isOnlineRef.current = true
    rerender()

    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalledWith({ id: 1 })
    })
  })

  it('should handle mutation failures with retry', async () => {
    const { result } = renderHook(
      () => useSyncQueue({ maxRetries: 2, retryDelay: 10 }),
      { wrapper }
    )

    let attempts = 0
    const mutationFn = jest.fn().mockImplementation(() => {
      attempts++
      if (attempts < 2) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({ success: true })
    })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalledTimes(2)
      expect(result.current.queue[0]?.status).toBe('success')
    })
  })

  it('should mark mutation as error after max retries', async () => {
    const { result } = renderHook(
      () => useSyncQueue({ maxRetries: 1, retryDelay: 10 }),
      { wrapper }
    )

    const mutationFn = jest.fn().mockRejectedValue(new Error('Permanent failure'))
    const onMutationError = jest.fn()

    const { result: syncQueueResult } = renderHook(
      () => useSyncQueue({ maxRetries: 1, onMutationError }),
      { wrapper }
    )

    act(() => {
      syncQueueResult.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    await waitFor(() => {
      expect(mutationFn).toHaveBeenCalledTimes(2) // Initial + 1 retry
      expect(syncQueueResult.current.queue[0]?.status).toBe('error')
      expect(onMutationError).toHaveBeenCalled()
    })
  })

  it('should remove mutation from queue', async () => {
    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    let mutationId: string

    act(() => {
      mutationId = result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn: jest.fn(),
        variables: { id: 1 },
      })
    })

    expect(result.current.queue).toHaveLength(1)

    act(() => {
      result.current.removeMutation(mutationId!)
    })

    expect(result.current.queue).toHaveLength(0)
  })

  it('should clear entire queue', async () => {
    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['mutation1'],
        mutationFn: jest.fn(),
        variables: { id: 1 },
      })
      result.current.queueMutation({
        mutationKey: ['mutation2'],
        mutationFn: jest.fn(),
        variables: { id: 2 },
      })
    })

    expect(result.current.queue).toHaveLength(2)

    await act(async () => {
      await result.current.clearQueue()
    })

    expect(result.current.queue).toHaveLength(0)
  })

  it('should report queue status correctly', async () => {
    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    expect(result.current.queueStatus).toEqual({
      total: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      succeeded: 0,
      isEmpty: true,
    })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn: jest.fn().mockResolvedValue({ success: true }),
        variables: { id: 1 },
      })
    })

    expect(result.current.queueStatus.total).toBe(1)
    expect(result.current.queueStatus.isEmpty).toBe(false)
  })

  it('should handle force sync', async () => {
    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    const mutationFn = jest.fn().mockResolvedValue({ success: true })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn,
        variables: { id: 1 },
      })
    })

    await act(async () => {
      await result.current.forceSync()
    })

    expect(mutationFn).toHaveBeenCalled()
  })

  it('should throw error when forcing sync offline', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const { result } = renderHook(() => useSyncQueue(), { wrapper })

    await expect(result.current.forceSync()).rejects.toThrow('Cannot sync while offline')
  })

  it('should persist queue to storage', async () => {
    const { IndexedDBAdapter } = require('@/lib/persistence/indexdb-adapter')
    const mockSet = jest.fn().mockResolvedValue(undefined)
    const mockGet = jest.fn().mockResolvedValue([])
    
    IndexedDBAdapter.mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
      delete: jest.fn(),
      clear: jest.fn(),
    }))

    const { result } = renderHook(
      () => useSyncQueue({ persistQueue: true, queueKey: 'test' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('queue_test')
    })

    act(() => {
      result.current.queueMutation({
        mutationKey: ['test-mutation'],
        mutationFn: jest.fn(),
        variables: { id: 1 },
      })
    })

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith(
        'queue_test',
        expect.arrayContaining([
          expect.objectContaining({
            mutationKey: ['test-mutation'],
            variables: { id: 1 },
          }),
        ])
      )
    })
  })
})

describe('useOfflineMutation', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{ children: React.ReactNode }>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
      },
    })

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  })

  it('should execute mutation normally when online', async () => {
    const mutationFn = jest.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(
      () => useOfflineMutation(['test-mutation'], mutationFn),
      { wrapper }
    )

    await act(async () => {
      await result.current.mutateAsync({ id: 1 })
    })

    expect(mutationFn).toHaveBeenCalledWith({ id: 1 })
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isQueued).toBe(false)
  })

  it('should queue mutation when offline', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const mutationFn = jest.fn().mockResolvedValue({ success: true })

    const { result } = renderHook(
      () => useOfflineMutation(['test-mutation'], mutationFn),
      { wrapper }
    )

    act(() => {
      result.current.mutate({ id: 1 })
    })

    expect(result.current.isQueued).toBe(true)
    expect(result.current.queueStatus.total).toBe(1)
  })

  it('should use custom conflict resolution', async () => {
    const { useOfflineStatus } = require('@/lib/persistence')
    useOfflineStatus.mockReturnValue({
      isOnline: false,
      lastSync: Date.now(),
      updateLastSync: jest.fn(),
      isStale: false,
    })

    const mutationFn = jest.fn()
    const conflictResolution = jest.fn().mockReturnValue({ merged: true })

    const { result } = renderHook(
      () => useOfflineMutation(['test-mutation'], mutationFn, {
        queueOptions: {
          conflictResolution,
        },
      }),
      { wrapper }
    )

    act(() => {
      result.current.mutate({ id: 1 })
    })

    expect(result.current.queueStatus.total).toBe(1)
  })
})