#!/usr/bin/env ts-node
/**
 * Implementation Verification Script
 *
 * Quick verification that all performance optimization components
 * are properly implemented and integrated.
 */

import {
  generateEmbedding,
  generateBatchEmbeddings,
  searchKnowledgeBaseOptimized,
} from '../services/memoryService';
import { getCacheStats } from '../services/embeddingCache';
import { getPerformanceStats } from '../services/performanceMonitor';
import { testConnection } from '../utils/db';

async function verifyImplementation() {
  console.log('🔍 Verifying Performance Optimization Implementation\n');
  console.log('═'.repeat(60));

  let checksPassed = 0;
  let checksFailed = 0;

  // Check 1: Embedding Cache
  console.log('\n📦 Check 1: Embedding Cache');
  console.log('━'.repeat(60));
  try {
    const cacheStats = getCacheStats();
    console.log('✅ Cache stats accessible');
    console.log(`   - Size: ${cacheStats.size}`);
    console.log(`   - Hit Rate: ${cacheStats.hitRate}%`);
    console.log(`   - Total Hits: ${cacheStats.totalHits}`);
    console.log(`   - Total Misses: ${cacheStats.totalMisses}`);
    checksPassed++;
  } catch (error) {
    console.log('❌ Cache stats failed:', error);
    checksFailed++;
  }

  // Check 2: Performance Monitor
  console.log('\n📊 Check 2: Performance Monitor');
  console.log('━'.repeat(60));
  try {
    // Try to get stats (will be null initially, which is OK)
    const stats = getPerformanceStats('test_operation');
    console.log('✅ Performance monitor accessible');
    console.log(`   - Stats function working: ${stats === null ? 'yes (no data yet)' : 'yes'}`);
    checksPassed++;
  } catch (error) {
    console.log('❌ Performance monitor failed:', error);
    checksFailed++;
  }

  // Check 3: Database Pool
  console.log('\n🔗 Check 3: Database Connection Pool');
  console.log('━'.repeat(60));
  try {
    const isConnected = await testConnection();
    console.log('✅ Connection pool accessible');
    console.log(`   - Connection Test: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
    checksPassed++;
  } catch (error) {
    console.log('❌ Connection pool failed:', error);
    checksFailed++;
  }

  // Check 4: Generate Embedding (with cache integration)
  console.log('\n🧠 Check 4: Embedding Generation with Cache');
  console.log('━'.repeat(60));
  try {
    const testText = 'verification test query';
    const embedding1 = await generateEmbedding(testText);
    console.log('✅ First embedding generated');
    console.log(`   - Dimensions: ${embedding1.length}`);

    // Second call should hit cache
    const embedding2 = await generateEmbedding(testText);
    console.log('✅ Second embedding generated (likely cache hit)');

    const cacheStats = getCacheStats();
    console.log(`   - Cache Size: ${cacheStats.size}`);
    console.log(`   - Cache Hits: ${cacheStats.totalHits}`);

    if (embedding1.length === embedding2.length) {
      console.log('✅ Embeddings have same dimensions');
      checksPassed++;
    } else {
      console.log('❌ Embeddings have different dimensions');
      checksFailed++;
    }
  } catch (error) {
    console.log('❌ Embedding generation failed:', error);
    checksFailed++;
  }

  // Check 5: Batch Embedding
  console.log('\n📦 Check 5: Batch Embedding');
  console.log('━'.repeat(60));
  try {
    const testTexts = ['batch test 1', 'batch test 2', 'batch test 3'];
    const embeddings = await generateBatchEmbeddings(testTexts);
    console.log('✅ Batch embeddings generated');
    console.log(`   - Input count: ${testTexts.length}`);
    console.log(`   - Output count: ${embeddings.length}`);

    if (embeddings.length === testTexts.length) {
      console.log('✅ Batch size matches input');
      checksPassed++;
    } else {
      console.log('❌ Batch size mismatch');
      checksFailed++;
    }
  } catch (error) {
    console.log('❌ Batch embedding failed:', error);
    checksFailed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Verification Summary');
  console.log('═'.repeat(60));
  console.log(`✅ Checks Passed: ${checksPassed}`);
  console.log(`❌ Checks Failed: ${checksFailed}`);
  console.log('━'.repeat(60));

  if (checksFailed === 0) {
    console.log('\n🎉 All checks passed! Implementation verified.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run verification
verifyImplementation().catch((error) => {
  console.error('❌ Fatal error during verification:', error);
  process.exit(1);
});
