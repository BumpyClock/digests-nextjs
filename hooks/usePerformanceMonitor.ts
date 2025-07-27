'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { performanceMetrics } from '@/store/middleware/performanceMiddleware'

interface PerformanceSample {
  timestamp: number
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  cache: {
    queryCount: number
    mutationCount: number
    activeQueries: number
    staleQueries: number
    fetchingQueries: number
  }
  persistence?: {
    pendingWrites: number
    lastWriteTime?: number
    storageEstimate?: number
  }
}

interface PerformanceAlert {
  type: 'MEMORY_SPIKE' | 'CACHE_MISS_RATE' | 'PERSISTENCE_SLOW' | 'RENDER_SPIKE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  timestamp: number
  value?: number
}

export function usePerformanceMonitor(enabled = true) {
  const queryClient = useQueryClient()
  const samplesRef = useRef<PerformanceSample[]>([])
  const alertsRef = useRef<PerformanceAlert[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get memory usage if available
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      }
    }
    return undefined
  }, [])

  // Get React Query cache metrics
  const getCacheMetrics = useCallback(() => {
    const queryCache = queryClient.getQueryCache()
    const mutationCache = queryClient.getMutationCache()
    const queries = queryCache.getAll()
    
    return {
      queryCount: queries.length,
      mutationCount: mutationCache.getAll().length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
    }
  }, [queryClient])

  // Get persistence metrics (mock for now, would connect to actual persistence layer)
  const getPersistenceMetrics = useCallback(() => {
    // This would connect to the actual IndexedDB persistence layer
    return {
      pendingWrites: 0,
      lastWriteTime: undefined,
      storageEstimate: undefined,
    }
  }, [])

  // Collect performance sample
  const collectSample = useCallback(() => {
    const sample: PerformanceSample = {
      timestamp: Date.now(),
      memory: getMemoryUsage(),
      cache: getCacheMetrics(),
      persistence: getPersistenceMetrics(),
    }

    // Store sample
    samplesRef.current.push(sample)
    
    // Keep only last 100 samples
    if (samplesRef.current.length > 100) {
      samplesRef.current.shift()
    }

    // Check for alerts
    checkForAlerts(sample)

    // Log to performance metrics middleware
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Monitor]', {
        memory: sample.memory ? `${(sample.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        queries: sample.cache.queryCount,
        active: sample.cache.activeQueries,
        stale: sample.cache.staleQueries,
      })
    }

    return sample
  }, [getMemoryUsage, getCacheMetrics, getPersistenceMetrics])

  // Check for performance alerts
  const checkForAlerts = useCallback((sample: PerformanceSample) => {
    const alerts: PerformanceAlert[] = []

    // Memory spike detection
    if (sample.memory && samplesRef.current.length > 5) {
      const recentSamples = samplesRef.current.slice(-5)
      const avgMemory = recentSamples
        .filter(s => s.memory)
        .reduce((sum, s) => sum + (s.memory?.usedJSHeapSize || 0), 0) / recentSamples.length

      if (sample.memory.usedJSHeapSize > avgMemory * 1.1) { // 10% spike
        alerts.push({
          type: 'MEMORY_SPIKE',
          severity: sample.memory.usedJSHeapSize > avgMemory * 1.2 ? 'HIGH' : 'MEDIUM',
          message: `Memory usage spiked to ${(sample.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
          timestamp: sample.timestamp,
          value: sample.memory.usedJSHeapSize,
        })
      }
    }

    // High stale query ratio
    if (sample.cache.queryCount > 0) {
      const staleRatio = sample.cache.staleQueries / sample.cache.queryCount
      if (staleRatio > 0.3) { // More than 30% stale
        alerts.push({
          type: 'CACHE_MISS_RATE',
          severity: staleRatio > 0.5 ? 'HIGH' : 'MEDIUM',
          message: `${(staleRatio * 100).toFixed(0)}% of queries are stale`,
          timestamp: sample.timestamp,
          value: staleRatio,
        })
      }
    }

    // Store alerts
    alerts.forEach(alert => {
      alertsRef.current.push(alert)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Performance Alert] ${alert.type}: ${alert.message}`)
      }
    })

    // Keep only last 50 alerts
    if (alertsRef.current.length > 50) {
      alertsRef.current = alertsRef.current.slice(-50)
    }
  }, [])

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const samples = samplesRef.current
    if (samples.length === 0) return null

    const memorySamples = samples.filter(s => s.memory).map(s => s.memory!.usedJSHeapSize)
    const avgMemory = memorySamples.reduce((sum, m) => sum + m, 0) / memorySamples.length
    const maxMemory = Math.max(...memorySamples)
    
    const avgQueries = samples.reduce((sum, s) => sum + s.cache.queryCount, 0) / samples.length
    const avgActiveQueries = samples.reduce((sum, s) => sum + s.cache.activeQueries, 0) / samples.length

    return {
      samples: samples.length,
      memory: {
        average: avgMemory,
        peak: maxMemory,
        current: memorySamples[memorySamples.length - 1] || 0,
      },
      cache: {
        averageQueries: avgQueries,
        averageActive: avgActiveQueries,
        currentQueries: samples[samples.length - 1].cache.queryCount,
      },
      alerts: alertsRef.current.length,
      recentAlerts: alertsRef.current.slice(-5),
    }
  }, [])

  // Export metrics for external monitoring
  const exportMetrics = useCallback(() => {
    return {
      samples: samplesRef.current,
      alerts: alertsRef.current,
      summary: getPerformanceSummary(),
    }
  }, [getPerformanceSummary])

  // Set up monitoring interval
  useEffect(() => {
    if (!enabled) return

    // Initial sample
    collectSample()

    // Set up interval (every 5 seconds)
    intervalRef.current = setInterval(() => {
      collectSample()
    }, 5000)

    // Export to window for debugging
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).__PERFORMANCE_MONITOR__ = {
        getSummary: getPerformanceSummary,
        export: exportMetrics,
        samples: samplesRef,
        alerts: alertsRef,
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, collectSample, getPerformanceSummary, exportMetrics])

  return {
    collectSample,
    getPerformanceSummary,
    exportMetrics,
    alerts: alertsRef.current,
  }
}

// Hook to monitor specific component renders
export function useComponentRenderMonitor(componentName: string) {
  const renderCount = useRef(0)
  const renderTimes = useRef<number[]>([])
  const lastRenderTime = useRef<number>(0)

  useEffect(() => {
    const now = performance.now()
    const renderTime = lastRenderTime.current ? now - lastRenderTime.current : 0
    lastRenderTime.current = now
    
    renderCount.current++
    renderTimes.current.push(renderTime)
    
    // Keep only last 50 render times
    if (renderTimes.current.length > 50) {
      renderTimes.current.shift()
    }

    // Log slow renders
    if (renderTime > 16 && renderCount.current > 1) { // Skip first render
      performanceMetrics.recordMetric(`${componentName}-render`, renderTime)
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Slow Render] ${componentName} took ${renderTime.toFixed(1)}ms to render`)
      }
    }

    // Log render count periodically
    if (process.env.NODE_ENV === 'development' && renderCount.current % 10 === 0) {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      console.log(`[Render Stats] ${componentName}: ${renderCount.current} renders, avg ${avgRenderTime.toFixed(1)}ms`)
    }
  })

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0,
  }
}