/**
 * Quick Start Example - Conversation Storage Optimization
 *
 * This example demonstrates how to use the conversation storage
 * optimization system to achieve < 100ms synchronous overhead.
 */

import { queueConversationStorage, getStorageStats, printStorageStats } from '../services/conversationStorageOptimizer.js';
import { printDashboard, startMetricsStream } from '../services/metricsDashboard.js';
import { getPerformanceStats } from '../services/performanceMonitor.js';

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

async function example1_BasicUsage() {
  console.log('\n📚 Example 1: Basic Conversation Storage');
  console.log('━'.repeat(80));

  const startTime = Date.now();

  // Queue conversation for storage (returns immediately in < 5ms)
  const conversationId = await queueConversationStorage(
    'user-123',
    'telegram',
    'User: What are your hours?\nAI: We are open 9am-5pm Mon-Fri.',
    'Customer asked about business hours',
    { category: 'pricing', sentiment: 'neutral' }
  );

  const duration = Date.now() - startTime;

  console.log(`✅ Conversation queued: ${conversationId}`);
  console.log(`⏱️  Time: ${duration}ms (synchronous overhead)`);
  console.log(`🎯 Target: < 100ms, Status: ${duration < 100 ? '✅ PASS' : '❌ FAIL'}`);
}

// ============================================================================
// EXAMPLE 2: Concurrent Conversations
// ============================================================================

async function example2_ConcurrentConversations() {
  console.log('\n📚 Example 2: 100 Concurrent Conversations');
  console.log('━'.repeat(80));

  const CONCURRENT = 100;
  const startTime = Date.now();

  // Queue 100 conversations simultaneously
  const promises = Array.from({ length: CONCURRENT }, (_, i) =>
    queueConversationStorage(
      `user-${i}`,
      i % 2 === 0 ? 'telegram' : 'web',
      `Concurrent conversation ${i}: User message here`,
      `Summary ${i}: Brief summary`,
      { batch: 'test', index: i }
    )
  );

  await Promise.all(promises);

  const duration = Date.now() - startTime;

  console.log(`✅ All ${CONCURRENT} conversations queued`);
  console.log(`⏱️  Total time: ${duration}ms`);
  console.log(`📊 Average: ${(duration / CONCURRENT).toFixed(2)}ms per conversation`);
  console.log(`🎯 Throughput: ${(CONCURRENT / (duration / 1000)).toFixed(2)} conversations/second`);

  // Print storage stats
  const stats = getStorageStats();
  console.log(`\n📦 Storage Stats:`);
  console.log(`  Queued: ${stats.queued}`);
  console.log(`  Processing: ${stats.processing}`);
  console.log(`  Completed: ${stats.completed}`);
}

// ============================================================================
// EXAMPLE 3: Real-Time Monitoring
// ============================================================================

async function example3_RealTimeMonitoring() {
  console.log('\n📚 Example 3: Real-Time Performance Monitoring');
  console.log('━'.repeat(80));

  // Queue some conversations
  for (let i = 0; i < 10; i++) {
    await queueConversationStorage(
      `user-monitor-${i}`,
      'web',
      `Monitoring test ${i}`,
      `Summary ${i}`,
      { monitoring: true }
    );
  }

  // Print performance dashboard
  console.log('\n📊 Performance Dashboard:');
  printDashboard();

  // Get specific stats
  const queueStats = getPerformanceStats('conversation_queue');
  if (queueStats) {
    console.log('\n📈 Queue Performance:');
    console.log(`  Count: ${queueStats.count}`);
    console.log(`  Average: ${queueStats.avgDuration}ms`);
    console.log(`  P95: ${queueStats.p95}ms`);
    console.log(`  P99: ${queueStats.p99}ms`);
    console.log(`  Success Rate: ${queueStats.successRate}%`);
  }
}

// ============================================================================
// EXAMPLE 4: Performance Validation
// ============================================================================

async function example4_PerformanceValidation() {
  console.log('\n📚 Example 4: Performance Validation');
  console.log('━'.repeat(80));

  const ITERATIONS = 50;
  const durations: number[] = [];

  console.log(`Running ${ITERATIONS} iterations...`);

  for (let i = 0; i < ITERATIONS; i++) {
    const start = Date.now();

    await queueConversationStorage(
      `user-validate-${i}`,
      'telegram',
      `Validation test ${i}`,
      `Summary ${i}`,
      { validation: true }
    );

    durations.push(Date.now() - start);
  }

  const sorted = durations.sort((a, b) => a - b);

  console.log('\n📊 Performance Results:');
  console.log(`  P50: ${sorted[Math.floor(ITERATIONS * 0.5)]}ms`);
  console.log(`  P95: ${sorted[Math.floor(ITERATIONS * 0.95)]}ms`);
  console.log(`  P99: ${sorted[Math.floor(ITERATIONS * 0.99)]}ms`);
  console.log(`  Min: ${Math.min(...durations)}ms`);
  console.log(`  Max: ${Math.max(...durations)}ms`);

  const p95 = sorted[Math.floor(ITERATIONS * 0.95)];
  console.log(`\n🎯 Validation:`);
  console.log(`  Target: P95 < 100ms`);
  console.log(`  Actual: P95 = ${p95}ms`);
  console.log(`  Status: ${p95 < 100 ? '✅ PASS' : '❌ FAIL'}`);
}

// ============================================================================
// EXAMPLE 5: Continuous Monitoring
// ============================================================================

async function example5_ContinuousMonitoring() {
  console.log('\n📚 Example 5: Continuous Monitoring (10 seconds)');
  console.log('━'.repeat(80));

  // Start metrics stream (updates every 2 seconds)
  const streamInterval = startMetricsStream(2);

  // Add conversations over time
  let count = 0;
  const addInterval = setInterval(async () => {
    await queueConversationStorage(
      `user-stream-${count}`,
      'web',
      `Stream test ${count}`,
      `Summary ${count}`,
      { stream: true }
    );

    count++;

    if (count >= 20) {
      clearInterval(addInterval);
      clearInterval(streamInterval);

      console.log('\n✅ Continuous monitoring stopped after 10 seconds');
    }
  }, 500);

  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, 10000));
}

// ============================================================================
// MAIN MENU
// ============================================================================

async function main() {
  console.log('\n🚀 Conversation Storage Optimization - Quick Start');
  console.log('═'.repeat(80));
  console.log('This system achieves < 100ms synchronous overhead for conversation storage');
  console.log('through intelligent async batching, embedding caching, and parallel processing.');
  console.log('═'.repeat(80));

  const examples = [
    { name: 'Basic Usage', fn: example1_BasicUsage },
    { name: '100 Concurrent Conversations', fn: example2_ConcurrentConversations },
    { name: 'Real-Time Monitoring', fn: example3_RealTimeMonitoring },
    { name: 'Performance Validation', fn: example4_PerformanceValidation },
    { name: 'Continuous Monitoring', fn: example5_ContinuousMonitoring },
  ];

  console.log('\n📋 Available Examples:');
  examples.forEach((ex, i) => console.log(`  ${i + 1}. ${ex.name}`));
  console.log(`  6. Run All Examples`);
  console.log(`  0. Exit\n`);

  // For demo purposes, run all examples
  console.log('Running all examples...\n');

  await example1_BasicUsage();
  await new Promise(resolve => setTimeout(resolve, 2000));

  await example2_ConcurrentConversations();
  await new Promise(resolve => setTimeout(resolve, 2000));

  await example3_RealTimeMonitoring();
  await new Promise(resolve => setTimeout(resolve, 2000));

  await example4_PerformanceValidation();

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Quick Start Complete!');
  console.log('═'.repeat(80));
  console.log('\nNext Steps:');
  console.log('  1. Run full benchmark suite: npm run benchmark:storage');
  console.log('  2. Check performance metrics: printDashboard()');
  console.log('  3. Read the documentation: docs/PERFORMANCE_OPTIMIZATION_GUIDE.md');
  console.log('  4. Start using in your application: queueConversationStorage()\n');
}

// ============================================================================
// RUN
// ============================================================================

main().catch(console.error);

export {
  example1_BasicUsage,
  example2_ConcurrentConversations,
  example3_RealTimeMonitoring,
  example4_PerformanceValidation,
  example5_ContinuousMonitoring,
};
