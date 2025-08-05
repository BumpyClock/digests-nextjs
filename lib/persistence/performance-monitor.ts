/**
 * Persistence layer performance monitoring
 * Tracks IndexedDB operations, throttling, and sync queue metrics
 */

import type { PersistenceAdapter } from "@/types/persistence";

export interface PersistenceMetrics {
  operations: {
    reads: number;
    writes: number;
    deletes: number;
    errors: number;
  };
  latency: {
    readAvg: number;
    writeAvg: number;
    readMax: number;
    writeMax: number;
  };
  throttling: {
    throttledWrites: number;
    pendingWrites: number;
    batchedWrites: number;
  };
  storage: {
    usage: number;
    quota: number;
    itemCount: number;
  };
}

export class PersistenceMonitor {
  private metrics: PersistenceMetrics = {
    operations: { reads: 0, writes: 0, deletes: 0, errors: 0 },
    latency: { readAvg: 0, writeAvg: 0, readMax: 0, writeMax: 0 },
    throttling: { throttledWrites: 0, pendingWrites: 0, batchedWrites: 0 },
    storage: { usage: 0, quota: 0, itemCount: 0 },
  };

  private readLatencies: number[] = [];
  private writeLatencies: number[] = [];
  private lastStorageCheck = 0;
  private storageCheckInterval = 30000; // 30 seconds

  constructor(private adapter: PersistenceAdapter) {}

  /**
   * Wrap a persistence operation with monitoring
   */
  async monitorOperation<T>(
    type: "read" | "write" | "delete",
    operation: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - start;

      // Update operation counts
      if (type === "read") {
        this.metrics.operations.reads++;
        this.recordLatency("read", duration);
      } else if (type === "write") {
        this.metrics.operations.writes++;
        this.recordLatency("write", duration);
      } else {
        this.metrics.operations.deletes++;
      }

      // Check storage periodically
      if (Date.now() - this.lastStorageCheck > this.storageCheckInterval) {
        await this.updateStorageMetrics();
      }

      return result;
    } catch (error) {
      this.metrics.operations.errors++;
      throw error;
    }
  }

  /**
   * Record operation latency
   */
  private recordLatency(type: "read" | "write", duration: number) {
    const latencies =
      type === "read" ? this.readLatencies : this.writeLatencies;

    latencies.push(duration);

    // Keep only last 100 measurements
    if (latencies.length > 100) {
      latencies.shift();
    }

    // Update metrics
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const max = Math.max(...latencies);

    if (type === "read") {
      this.metrics.latency.readAvg = avg;
      this.metrics.latency.readMax = max;
    } else {
      this.metrics.latency.writeAvg = avg;
      this.metrics.latency.writeMax = max;
    }

    // Log slow operations
    if (duration > 100 && process.env.NODE_ENV === "development") {
      console.warn(
        `[Persistence] Slow ${type} operation: ${duration.toFixed(1)}ms`,
      );
    }
  }

  /**
   * Update storage metrics
   */
  private async updateStorageMetrics() {
    this.lastStorageCheck = Date.now();

    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        this.metrics.storage.usage = estimate.usage || 0;
        this.metrics.storage.quota = estimate.quota || 0;
      } catch (error) {
        console.error("Failed to get storage estimate:", error);
      }
    }

    // Get item count from adapter if available
    if (
      "getItemCount" in this.adapter &&
      typeof this.adapter.getItemCount === "function"
    ) {
      try {
        this.metrics.storage.itemCount = await this.adapter.getItemCount();
      } catch (error) {
        console.error("Failed to get item count:", error);
      }
    }
  }

  /**
   * Record throttled write
   */
  recordThrottledWrite() {
    this.metrics.throttling.throttledWrites++;
  }

  /**
   * Update pending writes count
   */
  updatePendingWrites(count: number) {
    this.metrics.throttling.pendingWrites = count;
  }

  /**
   * Record batched write
   */
  recordBatchedWrite(batchSize: number) {
    this.metrics.throttling.batchedWrites += batchSize;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PersistenceMetrics {
    return {
      ...this.metrics,
      latency: {
        ...this.metrics.latency,
        readAvg: Number(this.metrics.latency.readAvg.toFixed(1)),
        writeAvg: Number(this.metrics.latency.writeAvg.toFixed(1)),
        readMax: Number(this.metrics.latency.readMax.toFixed(1)),
        writeMax: Number(this.metrics.latency.writeMax.toFixed(1)),
      },
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      operations: { reads: 0, writes: 0, deletes: 0, errors: 0 },
      latency: { readAvg: 0, writeAvg: 0, readMax: 0, writeMax: 0 },
      throttling: { throttledWrites: 0, pendingWrites: 0, batchedWrites: 0 },
      storage: { usage: 0, quota: 0, itemCount: 0 },
    };
    this.readLatencies = [];
    this.writeLatencies = [];
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    const totalOps =
      metrics.operations.reads +
      metrics.operations.writes +
      metrics.operations.deletes;
    const errorRate =
      totalOps > 0 ? (metrics.operations.errors / totalOps) * 100 : 0;
    const storageUsagePercent =
      metrics.storage.quota > 0
        ? (metrics.storage.usage / metrics.storage.quota) * 100
        : 0;

    return {
      totalOperations: totalOps,
      errorRate: errorRate.toFixed(1) + "%",
      avgReadLatency: metrics.latency.readAvg.toFixed(1) + "ms",
      avgWriteLatency: metrics.latency.writeAvg.toFixed(1) + "ms",
      throttleRate:
        metrics.operations.writes > 0
          ? (
              (metrics.throttling.throttledWrites / metrics.operations.writes) *
              100
            ).toFixed(1) + "%"
          : "0%",
      storageUsage: storageUsagePercent.toFixed(1) + "%",
      pendingWrites: metrics.throttling.pendingWrites,
    };
  }
}

/**
 * Create a monitored persistence adapter
 */
export function createMonitoredAdapter(
  adapter: PersistenceAdapter,
): PersistenceAdapter & { monitor: PersistenceMonitor } {
  const monitor = new PersistenceMonitor(adapter);

  return {
    monitor,

    async get<T>(key: string): Promise<T | null> {
      return monitor.monitorOperation("read", () => adapter.get<T>(key));
    },

    async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
      return monitor.monitorOperation("write", () =>
        adapter.set(key, value, _ttl),
      );
    },

    async delete(key: string): Promise<void> {
      return monitor.monitorOperation("delete", () => adapter.delete(key));
    },

    async clear(): Promise<void> {
      return monitor.monitorOperation("delete", () => adapter.clear());
    },

    async getMany<T>(keys: string[]): Promise<Map<string, T>> {
      return monitor.monitorOperation("read", () => adapter.getMany<T>(keys));
    },

    async setMany<T>(items: Map<string, T>, ttl?: number): Promise<void> {
      monitor.recordBatchedWrite(items.size);
      return monitor.monitorOperation("write", () => adapter.setMany(items));
    },

    async getStorageInfo(): Promise<{
      used: number;
      quota: number;
      available: number;
      count: number;
    }> {
      if (
        "getStorageInfo" in adapter &&
        typeof adapter.getStorageInfo === "function"
      ) {
        const info = await adapter.getStorageInfo();
        return {
          used: info.used || 0,
          quota: info.quota || 0,
          available: (info.quota || 0) - (info.used || 0),
          count: info.count || 0,
        };
      }
      // Fallback implementation
      return {
        used: 0,
        quota: 0,
        available: 0,
        count: 0,
      };
    },

    async deleteMany(keys: string[]): Promise<void> {
      return monitor.monitorOperation("delete", () => {
        if (adapter.deleteMany) {
          return adapter.deleteMany(keys);
        }
        // Fallback to individual deletes
        return Promise.all(keys.map((key) => adapter.delete(key))).then(
          () => {},
        );
      });
    },

    async keys(pattern?: string): Promise<string[]> {
      return monitor.monitorOperation("read", () => {
        if (adapter.keys) {
          return adapter.keys(pattern);
        }
        // Return empty array if not supported
        return Promise.resolve([]);
      });
    },

    async cleanup(): Promise<void> {
      if (adapter.cleanup) {
        return adapter.cleanup();
      }
      // No-op if not supported
      return Promise.resolve();
    },
  };
}

// Export global persistence monitor instance
let globalMonitor: PersistenceMonitor | null = null;

export function getGlobalPersistenceMonitor(): PersistenceMonitor | null {
  return globalMonitor;
}

export function setGlobalPersistenceMonitor(monitor: PersistenceMonitor) {
  globalMonitor = monitor;

  // Expose to window in development
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    (window as Record<string, unknown>).__PERSISTENCE_MONITOR__ = {
      getMetrics: () => monitor.getMetrics(),
      getSummary: () => monitor.getSummary(),
      reset: () => monitor.reset(),
    };
  }
}
