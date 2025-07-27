'use client'

import React, { useState, useEffect } from 'react'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'

interface PerformanceMonitorProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  minimized?: boolean
}

export function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  minimized: initialMinimized = true 
}: PerformanceMonitorProps) {
  const [minimized, setMinimized] = useState(initialMinimized)
  const [showAlerts, setShowAlerts] = useState(true)
  const { getPerformanceSummary, alerts } = usePerformanceMonitor(enabled)
  const [summary, setSummary] = useState(getPerformanceSummary())

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      setSummary(getPerformanceSummary())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [enabled, getPerformanceSummary])

  if (!enabled || !summary) return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  const memoryUsageMB = (summary.memory.current / 1024 / 1024).toFixed(1)
  const memoryPeakMB = (summary.memory.peak / 1024 / 1024).toFixed(1)
  const hasMemoryAlert = alerts.some(a => a.type === 'MEMORY_SPIKE' && Date.now() - a.timestamp < 30000)
  const hasCacheAlert = alerts.some(a => a.type === 'CACHE_MISS_RATE' && Date.now() - a.timestamp < 30000)

  if (minimized) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={() => setMinimized(false)}
          className={`
            px-3 py-1 rounded-lg shadow-lg backdrop-blur-sm
            ${hasMemoryAlert || hasCacheAlert 
              ? 'bg-red-500/90 text-white animate-pulse' 
              : 'bg-black/80 text-white hover:bg-black/90'
            }
            transition-all duration-200 text-xs font-mono
          `}
          title="Click to expand performance monitor"
        >
          ⚡ {memoryUsageMB}MB | Q: {summary.cache.currentQueries}
          {(hasMemoryAlert || hasCacheAlert) && ' ⚠️'}
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-80`}>
      <div className="bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl text-white p-4 font-mono text-xs">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            ⚡ Performance Monitor
            {(hasMemoryAlert || hasCacheAlert) && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </h3>
          <button
            onClick={() => setMinimized(true)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Minimize"
          >
            —
          </button>
        </div>

        {/* Memory Section */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">Memory</span>
            {hasMemoryAlert && <span className="text-red-400 text-xs">SPIKE</span>}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Current:</span>
              <span className={hasMemoryAlert ? 'text-red-400' : ''}>{memoryUsageMB} MB</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Peak:</span>
              <span>{memoryPeakMB} MB</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  hasMemoryAlert ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((summary.memory.current / summary.memory.peak) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* React Query Cache Section */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">React Query Cache</span>
            {hasCacheAlert && <span className="text-yellow-400 text-xs">STALE</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-1">{summary.cache.currentQueries}</span>
            </div>
            <div>
              <span className="text-gray-500">Active:</span>
              <span className="ml-1">{Math.round(summary.cache.averageActive)}</span>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {showAlerts && summary.recentAlerts.length > 0 && (
          <div className="border-t border-gray-700 pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400 text-xs">Recent Alerts</span>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                Hide
              </button>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {summary.recentAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${
                    alert.severity === 'HIGH' 
                      ? 'bg-red-900/50 text-red-300' 
                      : alert.severity === 'MEDIUM'
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
          <div>Samples: {summary.samples} | Alerts: {summary.alerts}</div>
        </div>
      </div>
    </div>
  )
}

// Export a hook for programmatic access
export function usePerformanceMonitorDisplay() {
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    // Allow toggling via keyboard shortcut (Ctrl+Shift+P)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setVisible(v => !v)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  return { visible, setVisible }
}