/**
 * Performance measurement script for establishing baseline metrics
 */

const { performance } = require("perf_hooks");
const { apiService } = require("../services/api-service");
const fs = require("fs").promises;
const path = require("path");

// Test data
const TEST_URLS = [
  "https://example.com/feed1.xml",
  "https://example.com/feed2.xml",
  "https://example.com/feed3.xml",
];

const TEST_ARTICLE_URL = "https://example.com/article/test";

// Metrics collection
const metrics = {
  apiLatency: [],
  memoryUsage: [],
  cachePerformance: {
    hits: 0,
    misses: 0,
    hitRate: 0,
  },
  retryMetrics: {
    totalRequests: 0,
    retriedRequests: 0,
    failedRequests: 0,
  },
};

// Measure API latency
async function measureApiLatency() {
  console.log("📊 Measuring API latency...");

  // Cold cache test
  const coldStart = performance.now();
  try {
    await apiService.fetchFeeds(TEST_URLS);
    const coldLatency = performance.now() - coldStart;
    metrics.apiLatency.push({ type: "cold", latency: coldLatency });
    console.log(`  Cold cache latency: ${coldLatency.toFixed(2)}ms`);
  } catch (error) {
    console.error("  Cold cache test failed:", error.message);
  }

  // Warm cache test
  const warmStart = performance.now();
  try {
    await apiService.fetchFeeds(TEST_URLS);
    const warmLatency = performance.now() - warmStart;
    metrics.apiLatency.push({ type: "warm", latency: warmLatency });
    console.log(`  Warm cache latency: ${warmLatency.toFixed(2)}ms`);
  } catch (error) {
    console.error("  Warm cache test failed:", error.message);
  }

  // Reader view test
  const readerStart = performance.now();
  try {
    await apiService.fetchReaderView(TEST_ARTICLE_URL);
    const readerLatency = performance.now() - readerStart;
    metrics.apiLatency.push({ type: "reader", latency: readerLatency });
    console.log(`  Reader view latency: ${readerLatency.toFixed(2)}ms`);
  } catch (error) {
    console.error("  Reader view test failed:", error.message);
  }
}

// Measure memory usage
async function measureMemoryUsage() {
  console.log("\\n💾 Measuring memory usage...");

  // Initial memory
  if (global.gc) global.gc();
  const initialMemory = process.memoryUsage();
  metrics.memoryUsage.push({
    phase: "initial",
    heapUsed: initialMemory.heapUsed / 1024 / 1024,
  });

  // After loading feeds
  await apiService.fetchFeeds(TEST_URLS);
  const afterFeedsMemory = process.memoryUsage();
  metrics.memoryUsage.push({
    phase: "afterFeeds",
    heapUsed: afterFeedsMemory.heapUsed / 1024 / 1024,
  });

  // After multiple operations
  for (let i = 0; i < 10; i++) {
    await apiService.fetchFeeds([TEST_URLS[i % TEST_URLS.length]]);
  }
  const afterMultipleMemory = process.memoryUsage();
  metrics.memoryUsage.push({
    phase: "afterMultiple",
    heapUsed: afterMultipleMemory.heapUsed / 1024 / 1024,
  });

  console.log(
    `  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
  console.log(
    `  After feeds: ${(afterFeedsMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
  console.log(
    `  After multiple: ${(afterMultipleMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
}

// Measure bundle size impact
async function measureBundleSize() {
  console.log("\\n📦 Analyzing bundle size impact...");

  try {
    // Check if we have build output
    const buildStatsPath = path.join(__dirname, "../.next/build-stats.json");

    // For now, we'll estimate based on source file sizes
    const apiServiceSize = (
      await fs.stat(path.join(__dirname, "../services/api-service.ts"))
    ).size;
    const typeGuardsSize = (
      await fs.stat(path.join(__dirname, "../utils/type-guards.ts"))
    ).size;
    const securitySize = (
      await fs.stat(path.join(__dirname, "../utils/security.ts"))
    ).size;

    const totalSize = (apiServiceSize + typeGuardsSize + securitySize) / 1024;

    console.log(`  API Service: ${(apiServiceSize / 1024).toFixed(2)}KB`);
    console.log(`  Type Guards: ${(typeGuardsSize / 1024).toFixed(2)}KB`);
    console.log(`  Security Utils: ${(securitySize / 1024).toFixed(2)}KB`);
    console.log(`  Total Impact: ~${totalSize.toFixed(2)}KB (uncompressed)`);

    metrics.bundleSize = {
      apiService: apiServiceSize,
      typeGuards: typeGuardsSize,
      security: securitySize,
      total: apiServiceSize + typeGuardsSize + securitySize,
    };
  } catch (error) {
    console.log("  Unable to measure exact bundle size - run build first");
    console.log("  Estimated impact: ~15-20KB (uncompressed)");
  }
}

// Measure cache efficiency
async function measureCacheEfficiency() {
  console.log("\\n🎯 Measuring cache efficiency...");

  // Reset cache statistics
  metrics.cachePerformance = { hits: 0, misses: 0, hitRate: 0 };

  // Simulate realistic usage pattern
  const urls = [
    TEST_URLS[0],
    TEST_URLS[0],
    TEST_URLS[1],
    TEST_URLS[0],
    TEST_URLS[2],
  ];

  for (const url of urls) {
    const start = performance.now();
    await apiService.fetchFeeds([url]);
    const duration = performance.now() - start;

    // Assume cache hit if response is very fast (<5ms)
    if (duration < 5) {
      metrics.cachePerformance.hits++;
    } else {
      metrics.cachePerformance.misses++;
    }
  }

  const total = metrics.cachePerformance.hits + metrics.cachePerformance.misses;
  metrics.cachePerformance.hitRate =
    (metrics.cachePerformance.hits / total) * 100;

  console.log(`  Cache hits: ${metrics.cachePerformance.hits}`);
  console.log(`  Cache misses: ${metrics.cachePerformance.misses}`);
  console.log(`  Hit rate: ${metrics.cachePerformance.hitRate.toFixed(1)}%`);
}

// Generate performance report
async function generateReport() {
  console.log("\\n📄 Generating performance report...");

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      avgColdLatency:
        metrics.apiLatency
          .filter((m) => m.type === "cold")
          .reduce((sum, m) => sum + m.latency, 0) /
          metrics.apiLatency.filter((m) => m.type === "cold").length || 0,
      avgWarmLatency:
        metrics.apiLatency
          .filter((m) => m.type === "warm")
          .reduce((sum, m) => sum + m.latency, 0) /
          metrics.apiLatency.filter((m) => m.type === "warm").length || 0,
      memoryGrowth:
        metrics.memoryUsage.length > 1
          ? (
              ((metrics.memoryUsage[metrics.memoryUsage.length - 1].heapUsed -
                metrics.memoryUsage[0].heapUsed) /
                metrics.memoryUsage[0].heapUsed) *
              100
            ).toFixed(1) + "%"
          : "N/A",
      cacheHitRate: metrics.cachePerformance.hitRate.toFixed(1) + "%",
      bundleSizeImpact: metrics.bundleSize
        ? `${(metrics.bundleSize.total / 1024).toFixed(1)}KB`
        : "Unknown",
    },
    details: metrics,
  };

  // Save report
  const reportPath = path.join(__dirname, "../docs/performance-baseline.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log("\\n✅ Performance baseline established!");
  console.log("\\n📊 Summary:");
  console.log(
    `  Average cold latency: ${report.summary.avgColdLatency.toFixed(2)}ms`,
  );
  console.log(
    `  Average warm latency: ${report.summary.avgWarmLatency.toFixed(2)}ms`,
  );
  console.log(`  Memory growth: ${report.summary.memoryGrowth}`);
  console.log(`  Cache hit rate: ${report.summary.cacheHitRate}`);
  console.log(`  Bundle size impact: ${report.summary.bundleSizeImpact}`);

  return report;
}

// Main execution
async function main() {
  console.log("🚀 Starting performance baseline measurement...\\n");

  try {
    await measureApiLatency();
    await measureMemoryUsage();
    await measureBundleSize();
    await measureCacheEfficiency();

    const report = await generateReport();

    // Create markdown report
    const markdownReport = `# Performance Baseline Report

Generated: ${new Date().toISOString()}

## Executive Summary

- **Average Cold Latency**: ${report.summary.avgColdLatency.toFixed(2)}ms
- **Average Warm Latency**: ${report.summary.avgWarmLatency.toFixed(2)}ms
- **Memory Growth**: ${report.summary.memoryGrowth}
- **Cache Hit Rate**: ${report.summary.cacheHitRate}
- **Bundle Size Impact**: ${report.summary.bundleSizeImpact}

## Detailed Metrics

### API Latency
${metrics.apiLatency.map((m) => `- ${m.type}: ${m.latency.toFixed(2)}ms`).join("\\n")}

### Memory Usage
${metrics.memoryUsage.map((m) => `- ${m.phase}: ${m.heapUsed.toFixed(2)}MB`).join("\\n")}

### Cache Performance
- Hits: ${metrics.cachePerformance.hits}
- Misses: ${metrics.cachePerformance.misses}
- Hit Rate: ${metrics.cachePerformance.hitRate.toFixed(1)}%

## Optimization Opportunities

1. **Request Deduplication**: Currently showing ${report.summary.cacheHitRate} cache hit rate
2. **Memory Management**: ${report.summary.memoryGrowth} growth observed
3. **Bundle Size**: Total impact of ~${report.summary.bundleSizeImpact} (can be reduced with tree-shaking)

## Recommendations

1. Implement aggressive caching for frequently accessed feeds
2. Add request deduplication for concurrent identical requests
3. Consider lazy-loading security utilities for smaller initial bundle
4. Monitor circuit breaker effectiveness in production`;

    await fs.writeFile(
      path.join(__dirname, "../docs/performance-baseline.md"),
      markdownReport,
    );

    console.log(
      "\\n📝 Reports saved to docs/performance-baseline.md and docs/performance-baseline.json",
    );
  } catch (error) {
    console.error("\\n❌ Error during performance measurement:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  measureApiLatency,
  measureMemoryUsage,
  measureCacheEfficiency,
};
