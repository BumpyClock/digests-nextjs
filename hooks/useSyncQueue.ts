/**
 * MIGRATION NOTICE: This sync queue has been replaced with React Query
 *
 * The legacy sync queue system has been removed as part of the React Query migration.
 * React Query now handles all sync operations, offline support, and background updates.
 *
 * React Query provides built-in:
 * - Automatic background refetching
 * - Optimistic updates
 * - Offline support with cache persistence
 * - Retry logic and error recovery
 *
 * No manual sync queue is needed anymore.
 */

// Types for backward compatibility
export interface FeedSyncOperation {
  id: string;
  type: "create" | "update" | "delete" | "ADD_FEED"; // Added legacy ADD_FEED type
  data: unknown;
  timestamp: number;
  priority?: "low" | "medium" | "high";
}

export interface SyncQueueOptions {
  persistQueue?: boolean;
  queueKey?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SyncQueueStatus {
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  isEmpty: boolean;
}

// Temporary stub to prevent build errors during migration
export const useSyncQueue = (_options?: SyncQueueOptions) => {
  return {
    addToQueue: (_operation: FeedSyncOperation) => {},
    processQueue: () => Promise.resolve(),
    clearQueue: () => {},
    queueSize: 0,
    isProcessing: false,
    queue: [] as Array<{ mutationKey: [string, unknown] }>,
    queueStatus: {
      pending: 0,
      succeeded: 0,
      failed: 0,
      total: 0,
      isEmpty: true,
    } as SyncQueueStatus,
    isOnline: true,
    forceSync: () => Promise.resolve(),
  };
};
