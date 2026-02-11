/**
 * Performance Monitor - Track and analyze RAG system performance
 *
 * Purpose:
 * - Measure operation durations
 * - Track success/failure rates
 * - Identify performance bottlenecks
 * - Generate performance metrics
 *
 * Features:
 * - Automatic metric collection
 * - Rolling window (last 1000 operations)
 * - Per-operation statistics
 * - Percentile calculations (p95, p99)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95: number;
  p99: number;
  successRate: number;
  totalOperations: number;
}

export interface DetailedStats extends PerformanceStats {
  operation: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// METRIC STORAGE
// ============================================================================

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

// ============================================================================
// METRIC RECORDING
// ============================================================================

/**
 * Record a performance metric
 *
 * @param operation - Operation name (e.g., 'embedding_generation', 'vector_search')
 * @param duration - Duration in milliseconds
 * @param success - Whether the operation succeeded
 * @param metadata - Additional context (optional)
 */
export function recordPerformance(
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  metrics.push({
    operation,
    duration,
    timestamp: new Date(),
    success,
    metadata,
  });

  // Keep only last MAX_METRICS entries (rolling window)
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
}

/**
 * Decorator/wrapper for async functions to automatically record performance
 *
 * @param operation - Operation name
 * @param fn - Async function to measure
 * @returns Wrapped function with automatic performance tracking
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      recordPerformance(operation, duration, success);
    }
  }) as T;
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

/**
 * Get performance statistics for all operations or a specific operation
 *
 * @param operation - Optional operation name to filter by
 * @returns Performance statistics or null if no metrics available
 */
export function getPerformanceStats(operation?: string): PerformanceStats | null {
  let filtered = metrics;

  // Filter by operation if specified
  if (operation) {
    filtered = metrics.filter((m) => m.operation === operation);
  }

  if (filtered.length === 0) {
    return null;
  }

  // Extract durations
  const durations = filtered.map((m) => m.duration);
  const sortedDurations = [...durations].sort((a, b) => a - b);

  // Calculate success rate
  const successCount = filtered.filter((m) => m.success).length;
  const successRate = (successCount / filtered.length) * 100;

  // Calculate statistics
  const sum = durations.reduce((a, b) => a + b, 0);
  const avgDuration = sum / durations.length;

  return {
    count: filtered.length,
    avgDuration: parseFloat(avgDuration.toFixed(2)),
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    p95: parseFloat(sortedDurations[Math.floor(durations.length * 0.95)].toFixed(2)),
    p99: parseFloat(sortedDurations[Math.floor(durations.length * 0.99)].toFixed(2)),
    successRate: parseFloat(successRate.toFixed(2)),
    totalOperations: metrics.length,
  };
}

/**
 * Get detailed statistics for a specific operation
 *
 * @param operation - Operation name
 * @returns Detailed performance statistics or null
 */
export function getDetailedStats(operation: string): DetailedStats | null {
  const filtered = metrics.filter((m) => m.operation === operation);

  if (filtered.length === 0) {
    return null;
  }

  const baseStats = getPerformanceStats(operation);
  if (!baseStats) return null;

  const timestamps = filtered.map((m) => m.timestamp);
  const timeRange = {
    start: new Date(Math.min(...timestamps.map((t) => t.getTime()))),
    end: new Date(Math.max(...timestamps.map((t) => t.getTime()))),
  };

  return {
    ...baseStats,
    operation,
    timeRange,
  };
}

/**
 * Get all unique operation names recorded
 *
 * @returns Array of operation names
 */
export function getOperationNames(): string[] {
  const operations = new Set(metrics.map((m) => m.operation));
  return Array.from(operations).sort();
}

/**
 * Get recent metrics for a specific operation
 *
 * @param operation - Operation name
 * @param limit - Maximum number of recent metrics to return
 * @returns Array of recent performance metrics
 */
export function getRecentMetrics(operation: string, limit: number = 10): PerformanceMetric[] {
  return metrics
    .filter((m) => m.operation === operation)
    .slice(-limit)
    .reverse();
}

/**
 * Get performance summary for all operations
 *
 * @returns Object mapping operation names to their statistics
 */
export function getAllPerformanceStats(): Record<string, PerformanceStats> {
  const operations = getOperationNames();
  const stats: Record<string, PerformanceStats> = {};

  for (const operation of operations) {
    const operationStats = getPerformanceStats(operation);
    if (operationStats) {
      stats[operation] = operationStats;
    }
  }

  return stats;
}

/**
 * Clear all performance metrics
 *
 * Useful for testing or resetting measurements
 */
export function clearPerformanceMetrics(): void {
  metrics.length = 0;
}

/**
 * Print performance summary to console
 *
 * Useful for debugging and monitoring
 */
export function printPerformanceSummary(): void {
  const stats = getAllPerformanceStats();
  const operations = Object.keys(stats);

  if (operations.length === 0) {
    console.log('📊 No performance metrics available');
    return;
  }

  console.log('\n📊 Performance Summary:');
  console.log('━'.repeat(80));

  for (const [operation, stat] of Object.entries(stats)) {
    console.log(`\n${operation}:`);
    console.log(`  Count: ${stat.count}`);
    console.log(`  Avg: ${stat.avgDuration}ms`);
    console.log(`  Min: ${stat.minDuration}ms`);
    console.log(`  Max: ${stat.maxDuration}ms`);
    console.log(`  P95: ${stat.p95}ms`);
    console.log(`  P99: ${stat.p99}ms`);
    console.log(`  Success Rate: ${stat.successRate}%`);
  }

  console.log('\n' + '━'.repeat(80) + '\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  recordPerformance,
  measurePerformance,
  getPerformanceStats,
  getDetailedStats,
  getOperationNames,
  getRecentMetrics,
  getAllPerformanceStats,
  clearPerformanceMetrics,
  printPerformanceSummary,
};
