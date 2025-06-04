import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import React from 'react';

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(
  f: StateCreator<T, [], []>,
  name?: string
) => StateCreator<T, [], []>;

/**
 * Performance monitoring middleware for Zustand stores
 * Tracks state update performance and logs slow updates
 * 
 * @param config - The store configuration
 * @param name - Optional name for the store (used in logs)
 * @returns Enhanced store configuration with performance monitoring
 */
const performanceMiddlewareImpl: LoggerImpl = (config, name) => (set, get, api) =>
  config(
    (args) => {
      if (process.env.NODE_ENV === 'development') {
        const start = performance.now();
        const stateBefore = get();
        
        // Log the action being performed
        console.log(`[${name || 'Store'}] Updating:`, args);
        
        // Perform the actual state update
        set(args);
        
        const duration = performance.now() - start;
        const stateAfter = get();
        
        // Log slow updates (longer than one frame at 60fps)
        if (duration > 16) {
          console.warn(
            `[${name || 'Store'}] Slow update detected: ${duration.toFixed(2)}ms`,
            {
              action: args,
              stateBefore,
              stateAfter,
              duration: `${duration.toFixed(2)}ms`
            }
          );
        }
        
        // Log all updates in debug mode
        if (process.env.NEXT_PUBLIC_DEBUG_STORE === 'true') {
          console.log(
            `[${name || 'Store'}] Update completed in ${duration.toFixed(2)}ms`,
            {
              stateBefore,
              stateAfter,
            }
          );
        }
      } else {
        // In production, just pass through
        set(args);
      }
    },
    get,
    api
  );

export const withPerformanceMonitoring = performanceMiddlewareImpl as Logger;

/**
 * Component render counter for development
 * Helps identify components that re-render too frequently
 * 
 * @example
 * function MyComponent() {
 *   const renderCount = useRenderCount('MyComponent');
 *   // renderCount is logged in development
 * }
 */
export const useRenderCount = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    const renderCount = React.useRef(0);
    renderCount.current++;
    
    React.useEffect(() => {
      console.log(`[Render] ${componentName} rendered ${renderCount.current} times`);
    });
    
    return renderCount.current;
  }
  return 0;
};

/**
 * Store subscription debugger
 * Logs which components are subscribed to which parts of the store
 * 
 * @param storeName - Name of the store being debugged
 * @param selector - The selector function being used
 * @param componentName - Name of the component using the selector
 */
export const debugSubscription = <T, U>(
  storeName: string,
  selector: (state: T) => U,
  componentName: string
) => {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_SUBSCRIPTIONS === 'true') {
    console.log(
      `[Subscription] ${componentName} subscribed to ${storeName}`,
      {
        selector: selector.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }
};

/**
 * Performance metrics aggregator
 * Collects and reports performance metrics over time
 */
class PerformanceMetrics {
  private static instance: PerformanceMetrics;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }
  
  recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    // Keep only last 100 measurements
    const measurements = this.metrics.get(name)!;
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  getStats(name: string) {
    const measurements = this.metrics.get(name) || [];
    if (measurements.length === 0) return null;
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const max = Math.max(...measurements);
    const min = Math.min(...measurements);
    
    return {
      avg: avg.toFixed(2),
      max: max.toFixed(2),
      min: min.toFixed(2),
      count: measurements.length
    };
  }
  
  logAllStats() {
    console.log('=== Performance Metrics ===');
    this.metrics.forEach((_, name) => {
      console.log(`${name}:`, this.getStats(name));
    });
  }
}

// Export singleton instance
export const performanceMetrics = PerformanceMetrics.getInstance();

// Auto-log metrics every 30 seconds in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  setInterval(() => {
    performanceMetrics.logAllStats();
  }, 30000);
}