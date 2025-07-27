#!/usr/bin/env node

/**
 * State Migration Performance Monitor
 * 
 * Monitors performance during the migration from Zustand to React Query
 * Tracks memory usage, cache metrics, persistence overhead, and component re-renders
 * 
 * Usage: node scripts/monitor-state-migration.js
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const MONITORING_INTERVAL = 5000; // 5 seconds
const REPORT_INTERVAL = 60000; // 1 minute
const OUTPUT_DIR = path.join(__dirname, '..', 'performance-reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Performance baseline from Day 2
const BASELINE = {
  memoryUsage: {
    heapUsed: 4.49 * 1024 * 1024, // 4.49 MB in bytes
    heapTotal: 6.30 * 1024 * 1024, // 6.30 MB in bytes
    rss: 59.53 * 1024 * 1024, // 59.53 MB in bytes
  },
  cacheMetrics: {
    hitRate: 0.8, // 80% target
    size: 0,
  },
  persistenceLatency: 50, // 50ms target
  renderCount: 100, // baseline render count
  bundleSize: 529 * 1024, // 529 KB in bytes
};

// Performance thresholds
const THRESHOLDS = {
  memoryIncrease: 0.1, // 10% increase triggers alert
  cacheHitRate: 0.8, // 80% minimum
  persistenceLatency: 100, // 100ms maximum
  bundleSizeIncrease: 20 * 1024, // 20KB increase
};

// Metrics storage
let metrics = {
  startTime: Date.now(),
  samples: [],
  alerts: [],
  summary: {
    memoryPeak: 0,
    cacheHitRateMin: 1,
    persistenceLatencyMax: 0,
    renderCountTotal: 0,
  },
};

// Mock functions to simulate getting metrics from the application
// In a real implementation, these would interface with the actual application

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    rss: usage.rss,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

function getCacheMetrics() {
  // Simulate cache metrics
  // In real implementation, this would connect to React Query
  return {
    size: Math.floor(Math.random() * 100) + 50,
    hitRate: 0.75 + Math.random() * 0.2, // 75-95%
    missCount: Math.floor(Math.random() * 10),
    queries: {
      active: Math.floor(Math.random() * 20) + 10,
      inactive: Math.floor(Math.random() * 50) + 20,
      stale: Math.floor(Math.random() * 10),
    },
  };
}

function getPersistenceMetrics() {
  // Simulate IndexedDB metrics
  return {
    readLatency: 20 + Math.random() * 40, // 20-60ms
    writeLatency: 30 + Math.random() * 50, // 30-80ms
    syncQueueSize: Math.floor(Math.random() * 10),
    throttledWrites: Math.floor(Math.random() * 5),
    storageSize: Math.floor(Math.random() * 1000000) + 500000, // 0.5-1.5MB
  };
}

function getComponentMetrics() {
  // Simulate component render metrics
  return {
    totalRenders: Math.floor(Math.random() * 200) + 100,
    componentsRendered: {
      FeedList: Math.floor(Math.random() * 10) + 5,
      FeedCard: Math.floor(Math.random() * 50) + 20,
      ArticleReader: Math.floor(Math.random() * 5) + 1,
      SettingsPanel: Math.floor(Math.random() * 3),
    },
    slowRenders: Math.floor(Math.random() * 5), // Renders > 16ms
  };
}

function checkThresholds(current, baseline) {
  const alerts = [];

  // Memory threshold check
  const memoryIncrease = (current.memory.heapUsed - baseline.memoryUsage.heapUsed) / baseline.memoryUsage.heapUsed;
  if (memoryIncrease > THRESHOLDS.memoryIncrease) {
    alerts.push({
      type: 'MEMORY_SPIKE',
      severity: 'HIGH',
      message: `Memory usage increased by ${(memoryIncrease * 100).toFixed(1)}% (threshold: ${THRESHOLDS.memoryIncrease * 100}%)`,
      value: current.memory.heapUsed,
      baseline: baseline.memoryUsage.heapUsed,
    });
  }

  // Cache hit rate check
  if (current.cache.hitRate < THRESHOLDS.cacheHitRate) {
    alerts.push({
      type: 'LOW_CACHE_HIT_RATE',
      severity: 'MEDIUM',
      message: `Cache hit rate ${(current.cache.hitRate * 100).toFixed(1)}% below threshold ${THRESHOLDS.cacheHitRate * 100}%`,
      value: current.cache.hitRate,
      threshold: THRESHOLDS.cacheHitRate,
    });
  }

  // Persistence latency check
  const maxLatency = Math.max(current.persistence.readLatency, current.persistence.writeLatency);
  if (maxLatency > THRESHOLDS.persistenceLatency) {
    alerts.push({
      type: 'HIGH_PERSISTENCE_LATENCY',
      severity: 'MEDIUM',
      message: `Persistence latency ${maxLatency.toFixed(1)}ms exceeds threshold ${THRESHOLDS.persistenceLatency}ms`,
      value: maxLatency,
      threshold: THRESHOLDS.persistenceLatency,
    });
  }

  return alerts;
}

function collectMetrics() {
  const timestamp = Date.now();
  const memory = getMemoryUsage();
  const cache = getCacheMetrics();
  const persistence = getPersistenceMetrics();
  const components = getComponentMetrics();

  const sample = {
    timestamp,
    memory,
    cache,
    persistence,
    components,
  };

  // Check thresholds and generate alerts
  const alerts = checkThresholds(sample, BASELINE);
  if (alerts.length > 0) {
    metrics.alerts.push(...alerts);
    console.log('\n🚨 PERFORMANCE ALERTS:');
    alerts.forEach(alert => {
      console.log(`  [${alert.severity}] ${alert.type}: ${alert.message}`);
    });
  }

  // Update summary statistics
  metrics.summary.memoryPeak = Math.max(metrics.summary.memoryPeak, memory.heapUsed);
  metrics.summary.cacheHitRateMin = Math.min(metrics.summary.cacheHitRateMin, cache.hitRate);
  metrics.summary.persistenceLatencyMax = Math.max(
    metrics.summary.persistenceLatencyMax,
    Math.max(persistence.readLatency, persistence.writeLatency)
  );
  metrics.summary.renderCountTotal += components.totalRenders;

  metrics.samples.push(sample);

  // Keep only last 1000 samples to prevent memory issues
  if (metrics.samples.length > 1000) {
    metrics.samples.shift();
  }

  return sample;
}

function generateReport() {
  const now = Date.now();
  const duration = now - metrics.startTime;
  const samples = metrics.samples.slice(-12); // Last minute of samples

  // Calculate averages
  const avgMemory = samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / samples.length;
  const avgCacheHitRate = samples.reduce((sum, s) => sum + s.cache.hitRate, 0) / samples.length;
  const avgReadLatency = samples.reduce((sum, s) => sum + s.persistence.readLatency, 0) / samples.length;
  const avgWriteLatency = samples.reduce((sum, s) => sum + s.persistence.writeLatency, 0) / samples.length;

  const report = {
    timestamp: new Date().toISOString(),
    duration: duration / 1000, // seconds
    summary: {
      memoryUsage: {
        current: samples[samples.length - 1]?.memory.heapUsed || 0,
        average: avgMemory,
        peak: metrics.summary.memoryPeak,
        baseline: BASELINE.memoryUsage.heapUsed,
        increasePercent: ((avgMemory - BASELINE.memoryUsage.heapUsed) / BASELINE.memoryUsage.heapUsed * 100).toFixed(1),
      },
      cachePerformance: {
        hitRate: {
          current: samples[samples.length - 1]?.cache.hitRate || 0,
          average: avgCacheHitRate,
          minimum: metrics.summary.cacheHitRateMin,
          target: BASELINE.cacheMetrics.hitRate,
        },
        size: samples[samples.length - 1]?.cache.size || 0,
        queries: samples[samples.length - 1]?.cache.queries || {},
      },
      persistenceOverhead: {
        readLatency: {
          current: samples[samples.length - 1]?.persistence.readLatency || 0,
          average: avgReadLatency,
          maximum: metrics.summary.persistenceLatencyMax,
          target: BASELINE.persistenceLatency,
        },
        writeLatency: {
          current: samples[samples.length - 1]?.persistence.writeLatency || 0,
          average: avgWriteLatency,
        },
        syncQueueSize: samples[samples.length - 1]?.persistence.syncQueueSize || 0,
        storageSize: samples[samples.length - 1]?.persistence.storageSize || 0,
      },
      componentPerformance: {
        totalRenders: metrics.summary.renderCountTotal,
        recentRenders: samples[samples.length - 1]?.components || {},
      },
      alerts: {
        total: metrics.alerts.length,
        recent: metrics.alerts.slice(-10),
      },
    },
    recommendations: generateRecommendations(metrics),
  };

  // Console output
  console.log('\n📊 PERFORMANCE REPORT');
  console.log('====================');
  console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
  console.log(`\n📈 Memory Usage:`);
  console.log(`  Current: ${(report.summary.memoryUsage.current / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Average: ${(report.summary.memoryUsage.average / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Peak: ${(report.summary.memoryUsage.peak / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Increase: ${report.summary.memoryUsage.increasePercent}%`);
  
  console.log(`\n💾 Cache Performance:`);
  console.log(`  Hit Rate: ${(report.summary.cachePerformance.hitRate.current * 100).toFixed(1)}% (avg: ${(report.summary.cachePerformance.hitRate.average * 100).toFixed(1)}%)`);
  console.log(`  Active Queries: ${report.summary.cachePerformance.queries.active || 0}`);
  console.log(`  Cache Size: ${report.summary.cachePerformance.size}`);
  
  console.log(`\n⏱️ Persistence Overhead:`);
  console.log(`  Read Latency: ${report.summary.persistenceOverhead.readLatency.current.toFixed(1)}ms (avg: ${report.summary.persistenceOverhead.readLatency.average.toFixed(1)}ms)`);
  console.log(`  Write Latency: ${report.summary.persistenceOverhead.writeLatency.current.toFixed(1)}ms (avg: ${report.summary.persistenceOverhead.writeLatency.average.toFixed(1)}ms)`);
  console.log(`  Storage Size: ${(report.summary.persistenceOverhead.storageSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log(`\n🔄 Component Performance:`);
  console.log(`  Total Renders: ${report.summary.componentPerformance.totalRenders}`);
  console.log(`  Recent Renders:`, report.summary.componentPerformance.recentRenders.componentsRendered || {});
  
  console.log(`\n⚠️ Alerts: ${report.summary.alerts.total} total`);

  // Save report to file
  const filename = `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${filepath}`);

  return report;
}

function generateRecommendations(metrics) {
  const recommendations = [];
  
  // Memory recommendations
  const memoryIncrease = (metrics.summary.memoryPeak - BASELINE.memoryUsage.heapUsed) / BASELINE.memoryUsage.heapUsed;
  if (memoryIncrease > 0.05) {
    recommendations.push({
      area: 'Memory Management',
      priority: memoryIncrease > 0.1 ? 'HIGH' : 'MEDIUM',
      suggestion: 'Consider implementing query garbage collection more aggressively',
      details: `Memory increased by ${(memoryIncrease * 100).toFixed(1)}%. Review query retention policies.`,
    });
  }

  // Cache recommendations
  if (metrics.summary.cacheHitRateMin < 0.7) {
    recommendations.push({
      area: 'Cache Optimization',
      priority: 'HIGH',
      suggestion: 'Improve cache key stability and query deduplication',
      details: 'Low cache hit rate indicates redundant queries or unstable keys.',
    });
  }

  // Persistence recommendations
  if (metrics.summary.persistenceLatencyMax > 75) {
    recommendations.push({
      area: 'Persistence Performance',
      priority: 'MEDIUM',
      suggestion: 'Optimize IndexedDB operations with batching',
      details: 'Consider implementing write coalescing and read-ahead caching.',
    });
  }

  // Component recommendations
  const highRenderComponents = Object.entries(metrics.samples[metrics.samples.length - 1]?.components.componentsRendered || {})
    .filter(([_, count]) => count > 20);
  if (highRenderComponents.length > 0) {
    recommendations.push({
      area: 'Component Optimization',
      priority: 'MEDIUM',
      suggestion: `Optimize high-render components: ${highRenderComponents.map(([name]) => name).join(', ')}`,
      details: 'Consider implementing React.memo or useMemo for expensive computations.',
    });
  }

  return recommendations;
}

// Signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Monitoring stopped. Generating final report...');
  generateReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  generateReport();
  process.exit(0);
});

// Main monitoring loop
console.log('🚀 State Migration Performance Monitor Started');
console.log(`📊 Monitoring interval: ${MONITORING_INTERVAL / 1000}s`);
console.log(`📈 Report interval: ${REPORT_INTERVAL / 1000}s`);
console.log(`📁 Output directory: ${OUTPUT_DIR}`);
console.log('\nPress Ctrl+C to stop monitoring and generate final report.\n');

// Collect metrics every 5 seconds
setInterval(collectMetrics, MONITORING_INTERVAL);

// Generate report every minute
setInterval(generateReport, REPORT_INTERVAL);

// Initial metric collection
collectMetrics();