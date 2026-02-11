#!/usr/bin/env ts-node
/**
 * RAG Performance Benchmark Script
 *
 * Purpose:
 * - Measure embedding generation performance
 * - Test vector search speed
 * - Evaluate cache effectiveness
 * - Benchmark batch processing
 *
 * Usage:
 * ```bash
 * npx ts-node src/scripts/benchmark_rag.ts
 * ```
 */

import {
  generateEmbedding,
  generateBatchEmbeddings,
  searchKnowledgeBaseOptimized,
} from '../services/memoryService';
import { getCacheStats } from '../services/embeddingCache';
import { printPerformanceSummary } from '../services/performanceMonitor';

// ============================================================================
// BENCHMARK CONFIGURATION
// ============================================================================

const TEST_QUERIES = [
  'haircut prices',
  'barber shop hours',
  'mens grooming services',
  'walk-in appointments',
  'beard trim cost',
];

const SHOP_ID = 1;

// ============================================================================
// BENCHMARK TESTS
// ============================================================================

/**
 * Test 1: Embedding Generation Performance
 */
async function benchmarkEmbeddingGeneration() {
  console.log('\n📊 Test 1: Embedding Generation (10 queries)');
  console.log('━'.repeat(60));

  const startTime = Date.now();

  for (let i = 0; i < 10; i++) {
    const query = `Test query number ${i + 1} for performance testing`;
    await generateEmbedding(query);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / 10;

  console.log(`✅ Total: ${totalTime}ms`);
  console.log(`✅ Average: ${avgTime.toFixed(2)}ms per embedding`);
  console.log(`✅ Target: < 500ms per embedding`);
  console.log(`✅ Status: ${avgTime < 500 ? '✅ PASS' : '❌ FAIL'}`);

  return { totalTime, avgTime, passed: avgTime < 500 };
}

/**
 * Test 2: Vector Search Performance
 */
async function benchmarkVectorSearch() {
  console.log('\n📊 Test 2: Vector Search (10 queries)');
  console.log('━'.repeat(60));

  const startTime = Date.now();

  for (let i = 0; i < 10; i++) {
    const query = TEST_QUERIES[i % TEST_QUERIES.length];
    await searchKnowledgeBaseOptimized(query, SHOP_ID, 5, undefined, 0.7);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / 10;

  console.log(`✅ Total: ${totalTime}ms`);
  console.log(`✅ Average: ${avgTime.toFixed(2)}ms per search`);
  console.log(`✅ Target: < 200ms per search`);
  console.log(`✅ Status: ${avgTime < 200 ? '✅ PASS' : '❌ FAIL'}`);

  return { totalTime, avgTime, passed: avgTime < 200 };
}

/**
 * Test 3: Batch Embedding Performance
 */
async function benchmarkBatchEmbedding() {
  console.log('\n📊 Test 3: Batch Embedding (50 texts)');
  console.log('━'.repeat(60));

  const startTime = Date.now();

  const texts = Array.from({ length: 50 }, (_, i) => `Test text ${i + 1} for batch embedding performance`);
  await generateBatchEmbeddings(texts);

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / 50;

  console.log(`✅ Total: ${totalTime}ms`);
  console.log(`✅ Average: ${avgTime.toFixed(2)}ms per embedding`);
  console.log(`✅ Target: < 300ms per embedding (with concurrency)`);
  console.log(`✅ Status: ${avgTime < 300 ? '✅ PASS' : '❌ FAIL'}`);

  return { totalTime, avgTime, passed: avgTime < 300 };
}

/**
 * Test 4: Cache Effectiveness
 */
async function benchmarkCacheEffectiveness() {
  console.log('\n📊 Test 4: Cache Hit Rate');
  console.log('━'.repeat(60));

  const query = 'cache test query for benchmarking';

  // Clear cache before test
  const cacheStats1 = getCacheStats();
  console.log(`📊 Cache size before test: ${cacheStats1.size}`);

  const startTime = Date.now();

  // First call (cache miss)
  await generateEmbedding(query);

  // Second call (cache hit)
  await generateEmbedding(query);

  // Third call (cache hit)
  await generateEmbedding(query);

  const totalTime = Date.now() - startTime;

  const cacheStats2 = getCacheStats();
  console.log(`✅ Total time (3 embeddings): ${totalTime}ms`);
  console.log(`✅ Cache size after test: ${cacheStats2.size}`);
  console.log(`✅ Cache hit rate: ${cacheStats2.hitRate.toFixed(2)}%`);
  console.log(`✅ Total hits: ${cacheStats2.totalHits}`);
  console.log(`✅ Total misses: ${cacheStats2.totalMisses}`);
  console.log(`✅ Target: < 10ms for cache hits`);
  console.log(`✅ Status: ${cacheStats2.hitRate > 0 ? '✅ PASS' : '❌ FAIL'}`);

  return {
    totalTime,
    hitRate: cacheStats2.hitRate,
    passed: cacheStats2.hitRate > 0,
  };
}

/**
 * Test 5: Sustained Performance (20 consecutive operations)
 */
async function benchmarkSustainedPerformance() {
  console.log('\n📊 Test 5: Sustained Performance (20 consecutive searches)');
  console.log('━'.repeat(60));

  const times: number[] = [];

  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    const query = TEST_QUERIES[i % TEST_QUERIES.length];
    await searchKnowledgeBaseOptimized(query, SHOP_ID, 5);
    times.push(Date.now() - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`✅ Average: ${avgTime.toFixed(2)}ms`);
  console.log(`✅ Min: ${minTime}ms`);
  console.log(`✅ Max: ${maxTime}ms`);
  console.log(`✅ Target: Consistent < 250ms`);
  console.log(`✅ Status: ${avgTime < 250 ? '✅ PASS' : '❌ FAIL'}`);

  return { avgTime, minTime, maxTime, passed: avgTime < 250 };
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

/**
 * Run all benchmarks and generate summary
 */
async function runBenchmarks() {
  console.log('\n🚀 RAG Performance Benchmarks');
  console.log('═'.repeat(60));
  console.log('Starting comprehensive performance testing...\n');

  const results: Record<string, any> = {};

  try {
    // Run all tests
    results.embedding = await benchmarkEmbeddingGeneration();
    results.vectorSearch = await benchmarkVectorSearch();
    results.batchEmbedding = await benchmarkBatchEmbedding();
    results.cache = await benchmarkCacheEffectiveness();
    results.sustained = await benchmarkSustainedPerformance();

    // Print performance summary
    console.log('\n📊 Detailed Performance Metrics');
    console.log('═'.repeat(60));
    printPerformanceSummary();

    // Print final summary
    console.log('\n📊 Final Summary');
    console.log('═'.repeat(60));

    const tests = [
      { name: 'Embedding Generation', result: results.embedding },
      { name: 'Vector Search', result: results.vectorSearch },
      { name: 'Batch Embedding', result: results.batchEmbedding },
      { name: 'Cache Effectiveness', result: results.cache },
      { name: 'Sustained Performance', result: results.sustained },
    ];

    let passCount = 0;
    tests.forEach((test) => {
      const status = test.result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.name}: ${status}`);
      if (test.result.passed) passCount++;
    });

    console.log('\n' + '━'.repeat(60));
    console.log(`Overall: ${passCount}/${tests.length} tests passed`);
    console.log('━'.repeat(60));

    // Exit with appropriate code
    process.exit(passCount === tests.length ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
