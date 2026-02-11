# Load Testing Guide

## Overview

This guide provides load testing strategies for the conversation storage optimization system to validate **< 100ms synchronous overhead** and **100+ concurrent conversations**.

## Quick Start

### 1. Basic Load Test

```bash
npm run benchmark:storage
```

### 2. Custom Load Test

```typescript
import { queueConversationStorage } from './services/conversationStorageOptimizer.js';

// Test 100 concurrent conversations
const promises = Array.from({ length: 100 }, (_, i) =>
  queueConversationStorage(
    `user-${i}`,
    'telegram',
    `Load test transcript ${i}`,
    `Load test summary ${i}`,
    { loadTest: true, index: i }
  )
);

const startTime = Date.now();
await Promise.all(promises);
const duration = Date.now() - startTime;

console.log(`✅ 100 conversations queued in ${duration}ms`);
console.log(`Average: ${(duration / 100).toFixed(2)}ms per conversation`);
```

## Load Testing Scenarios

### Scenario 1: Sustained Load (1000 conversations)

**Purpose**: Test system behavior under continuous load over time.

```typescript
async function sustainedLoadTest() {
  const TOTAL = 1000;
  const INTERVAL_MS = 100; // New conversation every 100ms
  const completed = [];

  console.log(`🚀 Starting sustained load test: ${TOTAL} conversations`);

  const startTime = Date.now();

  for (let i = 0; i < TOTAL; i++) {
    const opStart = Date.now();

    queueConversationStorage(
      `user-sustained-${i}`,
      'web',
      `Sustained load test ${i}`,
      `Summary ${i}`,
      { loadTest: true, sustained: true }
    ).then(() => {
      completed.push(Date.now() - opStart);
    });

    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));

    // Progress update
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${TOTAL} conversations`);
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log(`\n✅ Sustained load test completed:`);
  console.log(`  Total: ${TOTAL} conversations`);
  console.log(`  Duration: ${totalDuration}ms`);
  console.log(`  Throughput: ${(TOTAL / (totalDuration / 1000)).toFixed(2)} ops/sec`);
}
```

**Expected Results**:
- Duration: ~100 seconds (1000 conversations × 100ms interval)
- Throughput: 10 ops/sec
- Queue size: < 100 (batch processing keeps up)
- No queue overflow

### Scenario 2: Spike Test (500 concurrent)

**Purpose**: Test system behavior under sudden traffic spike.

```typescript
async function spikeTest() {
  const CONCURRENT = 500;

  console.log(`🚀 Starting spike test: ${CONCURRENT} concurrent conversations`);

  const startTime = Date.now();

  const promises = Array.from({ length: CONCURRENT }, (_, i) =>
    queueConversationStorage(
      `user-spike-${i}`,
      'telegram',
      `Spike test ${i}`,
      `Summary ${i}`,
      { loadTest: true, spike: true }
    )
  );

  await Promise.all(promises);

  const duration = Date.now() - startTime;

  console.log(`\n✅ Spike test completed:`);
  console.log(`  Concurrent: ${CONCURRENT}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Average: ${(duration / CONCURRENT).toFixed(2)}ms per conversation`);

  // Check queue status
  const stats = getStorageStats();
  console.log(`  Queue size: ${stats.queued}`);
  console.log(`  Processing: ${stats.processing}`);
}
```

**Expected Results**:
- Duration: < 5 seconds (all queued)
- Average: < 10ms per conversation
- Queue size: ~490 (500 - 10 batch processed immediately)
- No memory overflow

### Scenario 3: Endurance Test (10,000 conversations)

**Purpose**: Test system stability over extended period.

```typescript
async function enduranceTest() {
  const TOTAL = 10000;
  const INTERVAL_MS = 50; // New conversation every 50ms

  console.log(`🚀 Starting endurance test: ${TOTAL} conversations`);

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < TOTAL; i++) {
    queueConversationStorage(
      `user-endurance-${i}`,
      'web',
      `Endurance test ${i}`,
      `Summary ${i}`,
      { loadTest: true, endurance: true }
    ).then(() => {
      completed++;
    }).catch(() => {
      failed++;
    });

    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));

    // Progress update every 1000
    if ((i + 1) % 1000 === 0) {
      const elapsed = Date.now() - startTime;
      const progress = ((i + 1) / TOTAL) * 100;

      console.log(`  Progress: ${progress.toFixed(1)}% (${i + 1}/${TOTAL}) - ${elapsed}ms elapsed`);
    }
  }

  // Wait for queue to flush
  console.log('\n⏳ Waiting for queue to flush...');
  await stopBatchProcessor();

  const totalDuration = Date.now() - startTime;

  console.log(`\n✅ Endurance test completed:`);
  console.log(`  Total: ${TOTAL}`);
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Throughput: ${(TOTAL / (totalDuration / 1000)).toFixed(2)} ops/sec`);
  console.log(`  Success Rate: ${((completed / TOTAL) * 100).toFixed(2)}%`);
}
```

**Expected Results**:
- Duration: ~8-10 minutes
- Success rate: > 99.9%
- No memory leaks
- Stable performance over time

### Scenario 4: Stress Test (Find Breaking Point)

**Purpose**: Find maximum concurrent capacity.

```typescript
async function stressTest() {
  let concurrent = 100;
  const MAX_CONCURRENT = 2000;
  const INCREMENT = 100;

  console.log(`🚀 Starting stress test...`);

  while (concurrent <= MAX_CONCURRENT) {
    console.log(`\n📊 Testing ${concurrent} concurrent conversations...`);

    const startTime = Date.now();

    const promises = Array.from({ length: concurrent }, (_, i) =>
      queueConversationStorage(
        `user-stress-${concurrent}-${i}`,
        'telegram',
        `Stress test ${concurrent}-${i}`,
        `Summary ${i}`,
        { loadTest: true, stress: true }
      )
    );

    try {
      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avg = duration / concurrent;
      const stats = getStorageStats();

      console.log(`  ✅ Success: ${duration}ms total, ${avg.toFixed(2)}ms avg`);
      console.log(`  Queue: ${stats.queued}, Processing: ${stats.processing}`);

      // Check if system is overwhelmed
      if (stats.queued > 1000 || avg > 50) {
        console.log(`  ⚠️  System limit reached at ${concurrent} concurrent`);
        break;
      }

      // Wait for queue to process
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.log(`  ❌ Failed at ${concurrent} concurrent:`, error.message);
      break;
    }

    concurrent += INCREMENT;
  }

  console.log(`\n✅ Stress test completed. Max capacity: ~${concurrent - INCREMENT} concurrent`);
}
```

**Expected Results**:
- Max capacity: 1000-1500 concurrent
- Queue overflow: > 1000 queued
- Performance degradation: > 50ms average

## Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Queue time P95 | < 10ms | < 20ms | > 20ms |
| Queue time P99 | < 20ms | < 50ms | > 50ms |
| Throughput | 100+ ops/sec | 50+ ops/sec | < 50 ops/sec |
| Queue size | < 100 | < 500 | > 500 |
| Success rate | > 99.9% | > 99% | < 99% |

## Monitoring During Load Tests

### Real-time Metrics

```typescript
import { startMetricsStream } from './services/metricsDashboard.js';

// Start monitoring before load test
startMetricsStream(5); // Update every 5 seconds
```

### Custom Monitoring

```typescript
import { getStorageStats } from './services/conversationStorageOptimizer.js';
import { getPerformanceStats } from './services/performanceMonitor.js';

setInterval(() => {
  const storageStats = getStorageStats();
  const perfStats = getPerformanceStats('conversation_queue');

  console.log('\n📊 Live Metrics:');
  console.log(`  Queue: ${storageStats.queued}`);
  console.log(`  Processing: ${storageStats.processing}`);
  console.log(`  Completed: ${storageStats.completed}`);
  console.log(`  P95: ${perfStats?.p95}ms`);
  console.log(`  P99: ${perfStats?.p99}ms`);
}, 10000); // Every 10 seconds
```

## Load Testing Tools

### Using Apache Bench (ab)

```bash
# Install ab
brew install httpd  # macOS
apt-get install apache2-utils  # Linux

# Test conversation storage endpoint
ab -n 1000 -c 10 -T 'application/json' \
   -p test-payload.json \
   http://localhost:3000/api/conversations
```

### Using wrk

```bash
# Install wrk
brew install wrk  # macOS

# Run load test
wrk -t4 -c100 -d30s \
    -s post-conversation.lua \
    http://localhost:3000/api/conversations
```

**post-conversation.lua**:
```lua
wrk.method = "POST"
wrk.body   = '{"userId":"user-1","channel":"web","transcript":"test","summary":"test"}'
wrk.headers["Content-Type"] = "application/json"
```

### Using autocannon (Node.js)

```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 100 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"userId":"user-1","channel":"web","transcript":"test","summary":"test"}' \
  http://localhost:3000/api/conversations
```

## Load Test Templates

### Template 1: Basic Load Test

```typescript
import { queueConversationStorage } from './services/conversationStorageOptimizer.js';
import { getStorageStats } from './services/conversationStorageOptimizer.js';
import { getPerformanceStats } from './services/performanceMonitor.js';

export async function basicLoadTest() {
  const CONCURRENT = 100;

  console.log(`🚀 Basic load test: ${CONCURRENT} concurrent`);

  const startTime = Date.now();

  await Promise.all(
    Array.from({ length: CONCURRENT }, (_, i) =>
      queueConversationStorage(
        `user-${i}`,
        'web',
        `Test ${i}`,
        `Summary ${i}`,
        { loadTest: true }
      )
    )
  );

  const duration = Date.now() - startTime;
  const stats = getStorageStats();
  const perf = getPerformanceStats('conversation_queue');

  console.log(`\n✅ Results:`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Average: ${(duration / CONCURRENT).toFixed(2)}ms`);
  console.log(`  P95: ${perf?.p95}ms`);
  console.log(`  Queue: ${stats.queued}`);

  return {
    duration,
    average: duration / CONCURRENT,
    p95: perf?.p95,
    queueSize: stats.queued,
  };
}
```

### Template 2: Ramp-up Load Test

```typescript
export async function rampUpLoadTest() {
  const MAX_CONCURRENT = 500;
  const RAMP_UP_TIME = 60000; // 60 seconds
  const INCREMENT_INTERVAL = 5000; // Add 50 every 5 seconds

  console.log(`🚀 Ramp-up test: 0 → ${MAX_CONCURRENT} over ${RAMP_UP_TIME / 1000}s`);

  const startTime = Date.now();
  let currentConcurrent = 0;

  const interval = setInterval(async () => {
    const increment = MAX_CONCURRENT / (RAMP_UP_TIME / INCREMENT_INTERVAL);
    currentConcurrent += increment;

    console.log(`  Ramping up: ${currentConcurrent.toFixed(0)} concurrent...`);

    // Add conversations
    const promises = Array.from({ length: increment }, (_, i) =>
      queueConversationStorage(
        `user-ramp-${currentConcurrent}-${i}`,
        'web',
        `Ramp test ${i}`,
        `Summary ${i}`,
        { loadTest: true, rampUp: true }
      )
    );

    await Promise.all(promises);

    const stats = getStorageStats();
    console.log(`    Queue: ${stats.queued}`);

    if (currentConcurrent >= MAX_CONCURRENT) {
      clearInterval(interval);

      const totalDuration = Date.now() - startTime;

      console.log(`\n✅ Ramp-up test completed in ${totalDuration}ms`);
      console.log(`  Final concurrent: ${currentConcurrent.toFixed(0)}`);
      console.log(`  Final queue: ${stats.queued}`);
    }
  }, INCREMENT_INTERVAL);
}
```

## Best Practices

1. **Start Small**: Begin with 10-100 concurrent, then scale up
2. **Monitor Continuously**: Watch queue size and processing time
3. **Test Realistic Scenarios**: Match production traffic patterns
4. **Test Failure Modes**: What happens if Ollama is slow?
5. **Clean Up**: Clear test data after each test
6. **Document Results**: Keep track of performance over time

## Troubleshooting

### Queue Overflow

**Problem**: Queue size keeps growing > 1000

**Solution**:
- Reduce concurrent load
- Increase batch size
- Add more batch processors
- Check Ollama API response time

### High Latency

**Problem**: P95 > 20ms, P99 > 50ms

**Solution**:
- Check embedding cache hit rate
- Optimize batch size
- Increase connection pool
- Check database query performance

### Memory Issues

**Problem**: Memory usage growing

**Solution**:
- Reduce max queue size
- Flush queue more frequently
- Check for memory leaks
- Monitor heap size

## Production Readiness Checklist

- [ ] Sustained load test (1000 conversations)
- [ ] Spike test (500 concurrent)
- [ ] Endurance test (10,000 conversations)
- [ ] Stress test (find breaking point)
- [ ] All performance targets met
- [ ] Monitoring configured
- [ ] Alerting set up
- [ ] Graceful shutdown tested
- [ ] Documentation complete

## Next Steps

1. Run all load test scenarios
2. Document results
3. Identify bottlenecks
4. Optimize configuration
5. Retest to validate improvements
6. Deploy to staging
7. Run production canary test
