'use client'

import React, { useState, useEffect } from 'react'
import { usePerformanceMonitor, useComponentRenderMonitor } from '@/hooks/usePerformanceMonitor'
import { getGlobalPersistenceMonitor } from '@/lib/persistence/performance-monitor'
import { performanceMetrics } from '@/store/middleware/performanceMiddleware'

export default function PerformanceDashboard() {
  const { getPerformanceSummary, exportMetrics } = usePerformanceMonitor()
  const { renderCount } = useComponentRenderMonitor('PerformanceDashboard')
  const [summary, setSummary] = useState(getPerformanceSummary())
  const [persistenceMetrics, setPersistenceMetrics] = useState<any>(null)
  const [storeMetrics, setStoreMetrics] = useState<any>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      // Update performance summary
      setSummary(getPerformanceSummary())
      
      // Get persistence metrics
      const monitor = getGlobalPersistenceMonitor()
      if (monitor) {
        setPersistenceMetrics(monitor.getSummary())
      }

      // Get store metrics
      const stats: any = {}
      ;['FeedStore', 'UserStore', 'SettingsStore'].forEach(store => {
        const stat = performanceMetrics.getStats(store)
        if (stat) stats[store] = stat
      })
      setStoreMetrics(stats)
    }, 1000)

    return () => clearInterval(interval)
  }, [getPerformanceSummary])

  if (!summary) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Performance Dashboard</h1>
        <p>Loading performance data...</p>
      </div>
    )
  }

  const exportData = () => {
    const data = exportMetrics()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex gap-4">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export Metrics
          </button>
          <div className="text-sm text-gray-500">
            Dashboard renders: {renderCount}
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Memory Usage"
          value={`${(summary.memory.current / 1024 / 1024).toFixed(1)} MB`}
          subtitle={`Peak: ${(summary.memory.peak / 1024 / 1024).toFixed(1)} MB`}
          status={summary.memory.current > summary.memory.average * 1.1 ? 'warning' : 'good'}
        />
        <MetricCard
          title="Cache Size"
          value={summary.cache.currentQueries}
          subtitle={`Active: ${Math.round(summary.cache.averageActive)}`}
          status={summary.cache.currentQueries > 100 ? 'warning' : 'good'}
        />
        <MetricCard
          title="Persistence"
          value={persistenceMetrics?.avgWriteLatency || 'N/A'}
          subtitle={persistenceMetrics?.pendingWrites ? `${persistenceMetrics.pendingWrites} pending` : 'No pending'}
          status={persistenceMetrics?.pendingWrites > 10 ? 'warning' : 'good'}
        />
        <MetricCard
          title="Alerts"
          value={summary.alerts}
          subtitle={summary.recentAlerts.length > 0 ? 'Recent issues' : 'All clear'}
          status={summary.alerts > 5 ? 'error' : summary.alerts > 0 ? 'warning' : 'good'}
        />
      </div>

      {/* Memory Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Memory Usage Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {/* Simple bar chart representation */}
          {Array.from({ length: 20 }, (_, i) => {
            const height = Math.random() * 100 // In real app, use actual historical data
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t"
                style={{ height: `${height}%` }}
                title={`Sample ${i + 1}`}
              />
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* React Query Cache Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">React Query Cache</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Queries:</span>
              <span className="font-mono">{summary.cache.currentQueries}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Active:</span>
              <span className="font-mono">{summary.cache.averageActive.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Samples Collected:</span>
              <span className="font-mono">{summary.samples}</span>
            </div>
          </div>
        </div>

        {/* Persistence Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Persistence Layer</h2>
          {persistenceMetrics ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Operations:</span>
                <span className="font-mono">{persistenceMetrics.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Rate:</span>
                <span className="font-mono">{persistenceMetrics.errorRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Read Latency:</span>
                <span className="font-mono">{persistenceMetrics.avgReadLatency}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Write Latency:</span>
                <span className="font-mono">{persistenceMetrics.avgWriteLatency}</span>
              </div>
              <div className="flex justify-between">
                <span>Throttle Rate:</span>
                <span className="font-mono">{persistenceMetrics.throttleRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Storage Usage:</span>
                <span className="font-mono">{persistenceMetrics.storageUsage}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No persistence layer active</p>
          )}
        </div>
      </div>

      {/* Store Performance */}
      {storeMetrics && Object.keys(storeMetrics).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Store Update Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(storeMetrics).map(([store, stats]: [string, any]) => (
              <div key={store} className="border rounded p-4">
                <h3 className="font-semibold mb-2">{store}</h3>
                <div className="text-sm space-y-1">
                  <div>Avg: {stats.avg}ms</div>
                  <div>Max: {stats.max}ms</div>
                  <div>Min: {stats.min}ms</div>
                  <div>Count: {stats.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {summary.recentAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Performance Alerts</h2>
          <div className="space-y-2">
            {summary.recentAlerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded ${
                  alert.severity === 'HIGH' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                    : alert.severity === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{alert.type}</span>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  status 
}: { 
  title: string
  value: string | number
  subtitle: string
  status: 'good' | 'warning' | 'error'
}) {
  const statusColors = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className={`rounded-lg p-6 ${statusColors[status]}`}>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-sm mt-1 opacity-70">{subtitle}</p>
    </div>
  )
}