/**
 * Conversation Storage Performance Benchmark
 *
 * Purpose: Validate < 100ms synchronous overhead target
 * and measure end-to-end conversation storage performance.
 *
 * Test Scenarios:
 * 1. Single conversation storage (baseline)
 * 2. Concurrent conversations (100 parallel)
 * 3. Sustained load (1000 conversations over 60s)
 * 4. Batch processing efficiency
 * 5. Embedding cache effectiveness
 */

import { queueConversationStorage, stopBatchProcessor, getStorageStats } from '../services/conversationStorageOptimizer.js';
import { recordPerformance, getPerformanceStats, getAllPerformanceStats, printPerformanceSummary } from '../services/performanceMonitor.js';
import { query } from '../utils/db.js';

// ============================================================================
// TYPES
// ============================================================================

interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  throughput: number; // ops/second
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  min: number;
  max: number;
}

interface BenchmarkReport {
  timestamp: string;
  results: BenchmarkResult[];
  summary: {
    totalOperations: number;
    totalDuration: number;
    overallThroughput: number;
    passed: boolean;
  };
}

// ============================================================================
// BENCHMARK FUNCTIONS
// ============================================================================

/**
 * Benchmark 1: Single conversation storage (baseline)
 */
async function benchmarkSingleConversation(): Promise<BenchmarkResult> {
  console.log('\n🧪 Benchmark 1: Single Conversation Storage');
  console.log('━'.repeat(80));

  const iterations = 10;
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await queueConversationStorage(
      `user-${i}`,
      'telegram',
      `Test conversation ${i}: This is a sample transcript for benchmarking purposes.`,
      `Summary ${i}: Test conversation about performance benchmarking.`,
      { benchmark: true }
    );

    durations.push(Date.now() - start);
  }

  const sorted = durations.sort((a, b) => a - b);

  return {
    name: 'Single Conversation Storage',
    duration: Math.max(...durations),
    operations: iterations,
    throughput: (iterations / Math.max(...durations)) * 1000,
    p50: sorted[Math.floor(iterations * 0.5)],
    p95: sorted[Math.floor(iterations * 0.95)],
    p99: sorted[Math.floor(iterations * 0.99)],
    successRate: 100,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

/**
 * Benchmark 2: Concurrent conversations (100 parallel)
 */
async function benchmarkConcurrentConversations(): Promise<BenchmarkResult> {
  console.log('\n🧪 Benchmark 2: Concurrent Conversations (100 Parallel)');
  console.log('━'.repeat(80));

  const concurrent = 100;
  const start = Date.now();

  // Launch 100 concurrent storage requests
  const promises = Array.from({ length: concurrent }, (_, i) =>
    queueConversationStorage(
      `user-${i}`,
      'telegram',
      `Concurrent test ${i}: This simulates real-world concurrent usage.`,
      `Summary ${i}: Concurrent conversation test.`,
      { benchmark: true, concurrent: true }
    )
  );

  await Promise.all(promises);

  const duration = Date.now() - start;

  // Get performance stats
  const stats = getPerformanceStats('conversation_queue');

  return {
    name: 'Concurrent Conversations (100)',
    duration,
    operations: concurrent,
    throughput: (concurrent / duration) * 1000,
    p50: stats?.p50 || 0,
    p95: stats?.p95 || 0,
    p99: stats?.p99 || 0,
    successRate: stats?.successRate || 100,
    min: stats?.minDuration || 0,
    max: stats?.maxDuration || 0,
  };
}

/**
 * Benchmark 3: Sustained load (1000 conversations over 60s)
 */
async function benchmarkSustainedLoad(): Promise<BenchmarkResult> {
  console.log('\n🧪 Benchmark 3: Sustained Load (1000 conversations)');
  console.log('━'.repeat(80));

  const total = 1000;
  const duration = 60000; // 60 seconds
  const interval = duration / total;

  const durations: number[] = [];
  let completed = 0;

  const startTime = Date.now();

  // Process conversations at a steady rate
  const promises: Promise<void>[] = [];

  for (let i = 0; i < total; i++) {
    const opStart = Date.now();

    promises.push(
      queueConversationStorage(
        `user-sustained-${i}`,
        'web',
        `Sustained load test ${i}: This tests system behavior under continuous load.`,
        `Summary ${i}: Sustained load conversation.`,
        { benchmark: true, sustained: true, index: i }
      ).then(() => {
        durations.push(Date.now() - opStart);
        completed++;
      })
    );

    // Wait for next interval
    await new Promise((resolve) => setTimeout(resolve, interval));

    // Progress update every 100 conversations
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${completed}/${total} conversations`);
    }
  }

  // Wait for all to complete
  await Promise.all(promises);

  const totalDuration = Date.now() - startTime;
  const sorted = durations.sort((a, b) => a - b);

  return {
    name: 'Sustained Load (1000 conversations)',
    duration: totalDuration,
    operations: total,
    throughput: (total / totalDuration) * 1000,
    p50: sorted[Math.floor(total * 0.5)],
    p95: sorted[Math.floor(total * 0.95)],
    p99: sorted[Math.floor(total * 0.99)],
    successRate: 100,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

/**
 * Benchmark 4: Batch processing efficiency
 */
async function benchmarkBatchProcessing(): Promise<BenchmarkResult> {
  console.log('\n🧪 Benchmark 4: Batch Processing Efficiency');
  console.log('━'.repeat(80));

  // Wait for queue to be processed
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const stats = getPerformanceStats('conversation_batch_insert');

  return {
    name: 'Batch Processing',
    duration: stats?.maxDuration || 0,
    operations: stats?.count || 0,
    throughput: 0, // Calculated differently for batches
    p50: stats?.p50 || 0,
    p95: stats?.p95 || 0,
    p99: stats?.p99 || 0,
    successRate: stats?.successRate || 100,
    min: stats?.minDuration || 0,
    max: stats?.maxDuration || 0,
  };
}

/**
 * Benchmark 5: Database query performance
 */
async function benchmarkDatabaseQueries(): Promise<BenchmarkResult> {
  console.log('\n🧪 Benchmark 5: Database Query Performance');
  console.log('━'.repeat(80));

  const iterations = 100;
  const durations: number[] = [];

  // Test INSERT query
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await query(
      `INSERT INTO conversation_memory (user_id, channel, transcript, summary, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        `benchmark-user-${i}`,
        'benchmark',
        `Benchmark transcript ${i}`,
        `Benchmark summary ${i}`,
        Array(768).fill(0.1).join(','),
        '{}',
      ]
    );

    durations.push(Date.now() - start);
  }

  const sorted = durations.sort((a, b) => a - b);

  return {
    name: 'Database INSERT Query',
    duration: Math.max(...durations),
    operations: iterations,
    throughput: (iterations / sorted.reduce((a, b) => a + b, 0)) * 1000,
    p50: sorted[Math.floor(iterations * 0.5)],
    p95: sorted[Math.floor(iterations * 0.95)],
    p99: sorted[Math.floor(iterations * 0.99)],
    successRate: 100,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Print benchmark result
 */
function printBenchmarkResult(result: BenchmarkResult): void {
  console.log(`\n${result.name}:`);
  console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
  console.log(`  Operations: ${result.operations}`);
  console.log(`  Throughput: ${result.throughput.toFixed(2)} ops/sec`);
  console.log(`  Latency:`);
  console.log(`    P50: ${result.p50.toFixed(2)}ms`);
  console.log(`    P95: ${result.p95.toFixed(2)}ms`);
  console.log(`    P99: ${result.p99.toFixed(2)}ms`);
  console.log(`    Min: ${result.min.toFixed(2)}ms`);
  console.log(`    Max: ${result.max.toFixed(2)}ms`);
  console.log(`  Success Rate: ${result.successRate.toFixed(2)}%`);
}

/**
 * Check if benchmarks pass targets
 */
function checkBenchmarkTargets(results: BenchmarkResult[]): boolean {
  const targets = {
    'Single Conversation Storage': { p95: 100 }, // < 100ms
    'Concurrent Conversations (100)': { p95: 150 }, // < 150ms
    'Sustained Load (1000 conversations)': { p95: 200 }, // < 200ms
    'Database INSERT Query': { p95: 50 }, // < 50ms
  };

  let allPassed = true;

  console.log('\n🎯 Benchmark Targets:');
  console.log('━'.repeat(80));

  for (const result of results) {
    const target = targets[result.name as keyof typeof targets];
    if (!target) continue;

    const passed = result.p95 < target.p95;
    const status = passed ? '✅ PASS' : '❌ FAIL';

    console.log(
      `${status} ${result.name}: P95 ${result.p95.toFixed(2)}ms (target: < ${target.p95}ms)`
    );

    if (!passed) allPassed = false;
  }

  console.log('━'.repeat(80));

  return allPassed;
}

/**
 * Generate benchmark report
 */
function generateBenchmarkReport(results: BenchmarkResult[]): BenchmarkReport {
  const totalOperations = results.reduce((sum, r) => sum + r.operations, 0);
  const totalDuration = Math.max(...results.map((r) => r.duration));
  const overallThroughput = (totalOperations / totalDuration) * 1000;

  return {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalOperations,
      totalDuration,
      overallThroughput,
      passed: checkBenchmarkTargets(results),
    },
  };
}

// ============================================================================
// MAIN BENCHMARK RUNNER
// ============================================================================

/**
 * Run all benchmarks
 */
export async function runBenchmarks(): Promise<BenchmarkReport> {
  console.log('\n🚀 Starting Conversation Storage Performance Benchmarks');
  console.log('━'.repeat(80));
  console.log(`Target: < 100ms synchronous overhead for conversation storage`);
  console.log(`Date: ${new Date().toISOString()}`);

  const results: BenchmarkResult[] = [];

  try {
    // Benchmark 1: Single conversation
    results.push(await benchmarkSingleConversation());

    // Wait for queue to process
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Benchmark 2: Concurrent conversations
    results.push(await benchmarkConcurrentConversations());

    // Wait for queue to process
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Benchmark 3: Sustained load
    results.push(await benchmarkSustainedLoad());

    // Wait for queue to process
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Benchmark 4: Batch processing
    results.push(await benchmarkBatchProcessing());

    // Benchmark 5: Database queries
    results.push(await benchmarkDatabaseQueries());

    // Print all results
    console.log('\n📊 Benchmark Results:');
    console.log('═'.repeat(80));
    results.forEach(printBenchmarkResult);

    // Generate and check report
    const report = generateBenchmarkReport(results);

    // Print summary
    console.log('\n📋 Summary:');
    console.log('═'.repeat(80));
    console.log(`Total Operations: ${report.summary.totalOperations}`);
    console.log(`Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`);
    console.log(`Overall Throughput: ${report.summary.overallThroughput.toFixed(2)} ops/sec`);
    console.log(`Status: ${report.summary.passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Print performance summary
    printPerformanceSummary();

    // Print storage stats
    const storageStats = getStorageStats();
    console.log('\n📦 Storage Stats:');
    console.log('━'.repeat(80));
    console.log(`  Queued: ${storageStats.queued}`);
    console.log(`  Processing: ${storageStats.processing}`);
    console.log(`  Completed: ${storageStats.completed}`);
    console.log(`  Failed: ${storageStats.failed}`);

    return report;
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await stopBatchProcessor();

    // Clear test data
    console.log('🗑️  Clearing benchmark data...');
    await query(`DELETE FROM conversation_memory WHERE metadata->>'benchmark' = 'true'`);
    console.log('✅ Cleanup complete');
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks()
    .then((report) => {
      console.log('\n✅ Benchmarks completed successfully');
      process.exit(report.summary.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Benchmarks failed:', error);
      process.exit(1);
    });
}

export default runBenchmarks;
