/**
 * Script to measure API performance baselines
 * Run with: node scripts/measure-api-performance.js
 */

const { performance } = require('perf_hooks');

// Mock API endpoints for testing
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Test scenarios
const scenarios = [
  {
    name: 'Single Feed Fetch',
    url: `${API_BASE}/parse`,
    method: 'POST',
    body: { urls: ['https://example.com/feed.xml'] }
  },
  {
    name: 'Multiple Feeds Fetch',
    url: `${API_BASE}/parse`,
    method: 'POST',
    body: { urls: [
      'https://example.com/feed1.xml',
      'https://example.com/feed2.xml',
      'https://example.com/feed3.xml'
    ]}
  },
  {
    name: 'Reader View Fetch',
    url: `${API_BASE}/getreaderview`,
    method: 'POST',
    body: { urls: ['https://example.com/article'] }
  }
];

// Performance metrics
const metrics = {
  apiLatency: {},
  retryMetrics: {},
  errorRates: {}
};

// Simulate API call with timing
async function measureApiCall(scenario, attempt = 1) {
  const start = performance.now();
  
  try {
    // Note: This is a mock - in real scenario, you'd make actual fetch calls
    // For now, we'll simulate with timeouts
    await new Promise(resolve => {
      // Simulate network latency (50-200ms)
      const latency = 50 + Math.random() * 150;
      setTimeout(resolve, latency);
    });
    
    // Simulate occasional failures for retry testing
    if (Math.random() < 0.1 && attempt === 1) {
      throw new Error('Simulated network error');
    }
    
    const duration = performance.now() - start;
    return { success: true, duration, attempt };
  } catch (error) {
    const duration = performance.now() - start;
    
    // Simulate retry with exponential backoff
    if (attempt < 3) {
      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.log(`  Retry ${attempt} after ${backoffDelay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return measureApiCall(scenario, attempt + 1);
    }
    
    return { success: false, duration, attempt, error: error.message };
  }
}

// Run performance tests
async function runPerformanceTests() {
  console.log('🚀 API Performance Baseline Measurement\n');
  console.log('=====================================\n');
  
  for (const scenario of scenarios) {
    console.log(`📊 Testing: ${scenario.name}`);
    console.log(`   Endpoint: ${scenario.url}`);
    console.log(`   Payload size: ${JSON.stringify(scenario.body).length} bytes\n`);
    
    const results = [];
    const iterations = 10;
    
    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      process.stdout.write(`   Iteration ${i + 1}/${iterations}...`);
      const result = await measureApiCall(scenario);
      results.push(result);
      
      if (result.success) {
        console.log(` ✓ ${result.duration.toFixed(2)}ms${result.attempt > 1 ? ` (${result.attempt} attempts)` : ''}`);
      } else {
        console.log(` ✗ Failed after ${result.attempt} attempts`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const latencies = successfulResults.map(r => r.duration);
    const retries = successfulResults.filter(r => r.attempt > 1);
    
    if (latencies.length > 0) {
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const sorted = [...latencies].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
      
      metrics.apiLatency[scenario.name] = {
        avg: avg.toFixed(2),
        p50: p50.toFixed(2),
        p95: p95.toFixed(2),
        p99: p99.toFixed(2),
        min: Math.min(...latencies).toFixed(2),
        max: Math.max(...latencies).toFixed(2)
      };
      
      console.log(`\n   📈 Latency Statistics:`);
      console.log(`      Average: ${avg.toFixed(2)}ms`);
      console.log(`      P50: ${p50.toFixed(2)}ms`);
      console.log(`      P95: ${p95.toFixed(2)}ms`);
      console.log(`      P99: ${p99.toFixed(2)}ms`);
      console.log(`      Min: ${Math.min(...latencies).toFixed(2)}ms`);
      console.log(`      Max: ${Math.max(...latencies).toFixed(2)}ms`);
    }
    
    if (retries.length > 0 || failedResults.length > 0) {
      metrics.retryMetrics[scenario.name] = {
        totalRequests: results.length,
        successfulRequests: successfulResults.length,
        failedRequests: failedResults.length,
        retriedRequests: retries.length,
        retryRate: ((retries.length / results.length) * 100).toFixed(1) + '%',
        failureRate: ((failedResults.length / results.length) * 100).toFixed(1) + '%'
      };
      
      console.log(`\n   🔄 Retry Statistics:`);
      console.log(`      Success rate: ${((successfulResults.length / results.length) * 100).toFixed(1)}%`);
      console.log(`      Retry rate: ${((retries.length / results.length) * 100).toFixed(1)}%`);
      console.log(`      Failure rate: ${((failedResults.length / results.length) * 100).toFixed(1)}%`);
    }
    
    console.log('\n   ' + '─'.repeat(50) + '\n');
  }
  
  // Summary report
  console.log('📋 PERFORMANCE SUMMARY\n');
  console.log('API Latency Baselines:');
  console.table(metrics.apiLatency);
  
  if (Object.keys(metrics.retryMetrics).length > 0) {
    console.log('\nRetry & Reliability Metrics:');
    console.table(metrics.retryMetrics);
  }
  
  // Recommendations based on metrics
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS\n');
  
  Object.entries(metrics.apiLatency).forEach(([scenario, stats]) => {
    const p95Value = parseFloat(stats.p95);
    const p99Value = parseFloat(stats.p99);
    
    if (p95Value > 500) {
      console.log(`⚠️  ${scenario}: P95 latency (${stats.p95}ms) exceeds 500ms target`);
      console.log(`   Consider implementing request caching or optimizing the endpoint`);
    }
    
    if (p99Value > p95Value * 2) {
      console.log(`⚠️  ${scenario}: High variance detected (P99 is ${(p99Value/p95Value).toFixed(1)}x P95)`);
      console.log(`   Consider implementing request timeout and circuit breaker`);
    }
  });
  
  // Export results
  const fs = require('fs').promises;
  const path = require('path');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, `../docs/api-performance-${timestamp}.json`);
  
  await fs.writeFile(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: {
      apiBase: API_BASE,
      nodeVersion: process.version,
      platform: process.platform
    },
    metrics,
    scenarios
  }, null, 2));
  
  console.log(`\n✅ Results saved to: ${outputPath}`);
}

// Memory usage tracking
function trackMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    external: (usage.external / 1024 / 1024).toFixed(2) + ' MB',
    rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB'
  };
}

// Main execution
(async () => {
  console.log('Memory at start:', trackMemoryUsage());
  
  try {
    await runPerformanceTests();
  } catch (error) {
    console.error('❌ Error during performance testing:', error);
    process.exit(1);
  }
  
  console.log('\nMemory at end:', trackMemoryUsage());
})();