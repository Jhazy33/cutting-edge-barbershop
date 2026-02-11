/**
 * Metrics Dashboard
 *
 * Purpose: Real-time performance monitoring and alerting
 * for conversation storage optimization.
 *
 * Features:
 * - Real-time metrics collection
 * - Performance threshold alerts
 * - Trend analysis
 * - Export to Prometheus/Graphite format
 */

import { getAllPerformanceStats, getDetailedStats, getOperationNames } from './performanceMonitor.js';
import { getStorageStats, getCacheStats } from './conversationStorageOptimizer.js';

// ============================================================================
// TYPES
// ============================================================================

interface MetricThreshold {
  operation: string;
  metric: 'p50' | 'p95' | 'p99' | 'avgDuration' | 'successRate';
  warning: number;
  critical: number;
  direction: 'above' | 'below';
}

interface Alert {
  severity: 'warning' | 'critical';
  operation: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

interface DashboardMetrics {
  timestamp: string;
  performance: Record<string, any>;
  storage: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  cache: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  alerts: Alert[];
  health: 'healthy' | 'warning' | 'critical';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const THRESHOLDS: MetricThreshold[] = [
  // Conversation queue (synchronous overhead)
  {
    operation: 'conversation_queue',
    metric: 'p95',
    warning: 10,
    critical: 20,
    direction: 'above',
  },
  // Embedding generation
  {
    operation: 'embedding_generation',
    metric: 'p95',
    warning: 200,
    critical: 500,
    direction: 'above',
  },
  // Batch insert
  {
    operation: 'conversation_batch_insert',
    metric: 'p95',
    warning: 50,
    critical: 100,
    direction: 'above',
  },
  // Success rates
  {
    operation: 'conversation_queue',
    metric: 'successRate',
    warning: 95,
    critical: 90,
    direction: 'below',
  },
  {
    operation: 'embedding_generation',
    metric: 'successRate',
    warning: 95,
    critical: 90,
    direction: 'below',
  },
];

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Check metrics against thresholds and generate alerts
 */
export function checkThresholds(): Alert[] {
  const alerts: Alert[] = [];
  const stats = getAllPerformanceStats();

  for (const threshold of THRESHOLDS) {
    const operationStats = stats[threshold.operation];

    if (!operationStats) continue;

    const value = operationStats[threshold.metric];

    if (value === undefined) continue;

    const isWarning =
      threshold.direction === 'above'
        ? value > threshold.warning
        : value < threshold.warning;

    const isCritical =
      threshold.direction === 'above'
        ? value > threshold.critical
        : value < threshold.critical;

    if (isCritical) {
      alerts.push({
        severity: 'critical',
        operation: threshold.operation,
        metric: threshold.metric,
        value,
        threshold: threshold.critical,
        message: `${threshold.operation} ${threshold.metric} is ${value.toFixed(2)} (critical: ${threshold.critical})`,
        timestamp: new Date(),
      });
    } else if (isWarning) {
      alerts.push({
        severity: 'warning',
        operation: threshold.operation,
        metric: threshold.metric,
        value,
        threshold: threshold.warning,
        message: `${threshold.operation} ${threshold.metric} is ${value.toFixed(2)} (warning: ${threshold.warning})`,
        timestamp: new Date(),
      });
    }
  }

  // Check queue size
  const storageStats = getStorageStats();
  if (storageStats.queued > 500) {
    alerts.push({
      severity: 'critical',
      operation: 'storage_queue',
      metric: 'queued',
      value: storageStats.queued,
      threshold: 500,
      message: `Storage queue size is ${storageStats.queued} (critical: > 500)`,
      timestamp: new Date(),
    });
  } else if (storageStats.queued > 100) {
    alerts.push({
      severity: 'warning',
      operation: 'storage_queue',
      metric: 'queued',
      value: storageStats.queued,
      threshold: 100,
      message: `Storage queue size is ${storageStats.queued} (warning: > 100)`,
      timestamp: new Date(),
    });
  }

  return alerts;
}

/**
 * Get overall health status
 */
export function getHealthStatus(alerts: Alert[]): 'healthy' | 'warning' | 'critical' {
  const hasCritical = alerts.some((a) => a.severity === 'critical');
  const hasWarning = alerts.some((a) => a.severity === 'warning');

  if (hasCritical) return 'critical';
  if (hasWarning) return 'warning';
  return 'healthy';
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================>

/**
 * Collect all dashboard metrics
 */
export function collectMetrics(): DashboardMetrics {
  const performanceStats = getAllPerformanceStats();
  const storageStats = getStorageStats();
  const cacheStats = getCacheStats();
  const alerts = checkThresholds();

  return {
    timestamp: new Date().toISOString(),
    performance: performanceStats,
    storage: storageStats,
    cache: cacheStats,
    alerts,
    health: getHealthStatus(alerts),
  };
}

// ============================================================================
// FORMATTING & EXPORT
// ============================================================================

/**
 * Format metrics for console output
 */
export function formatConsoleMetrics(metrics: DashboardMetrics): string {
  const lines: string[] = [];

  lines.push('═'.repeat(80));
  lines.push(`📊 Performance Dashboard - ${metrics.timestamp}`);
  lines.push('═'.repeat(80));
  lines.push(`Health: ${formatHealth(metrics.health)}`);
  lines.push('');

  // Performance metrics
  lines.push('Performance Metrics:');
  lines.push('━'.repeat(80));

  for (const [operation, stats] of Object.entries(metrics.performance)) {
    lines.push(`\n${operation}:`);
    lines.push(`  Count: ${stats.count}`);
    lines.push(`  Avg: ${stats.avgDuration}ms`);
    lines.push(`  P50: ${stats.p50}ms`);
    lines.push(`  P95: ${stats.p95}ms`);
    lines.push(`  P99: ${stats.p99}ms`);
    lines.push(`  Success Rate: ${stats.successRate}%`);
  }

  // Storage metrics
  lines.push('\nStorage Metrics:');
  lines.push('━'.repeat(80));
  lines.push(`  Queued: ${metrics.storage.queued}`);
  lines.push(`  Processing: ${metrics.storage.processing}`);
  lines.push(`  Completed: ${metrics.storage.completed}`);
  lines.push(`  Failed: ${metrics.storage.failed}`);

  // Cache metrics
  lines.push('\nCache Metrics:');
  lines.push('━'.repeat(80));
  lines.push(`  Size: ${metrics.cache.size}/${metrics.cache.maxSize}`);
  lines.push(`  Hit Rate: ${metrics.cache.hitRate.toFixed(2)}%`);

  // Alerts
  if (metrics.alerts.length > 0) {
    lines.push('\nAlerts:');
    lines.push('━'.repeat(80));

    for (const alert of metrics.alerts) {
      const icon = alert.severity === 'critical' ? '🔴' : '⚠️ ';
      lines.push(`${icon} ${alert.message}`);
    }
  }

  lines.push('═'.repeat(80));

  return lines.join('\n');
}

/**
 * Format health status with emoji
 */
function formatHealth(health: 'healthy' | 'warning' | 'critical'): string {
  switch (health) {
    case 'healthy':
      return '✅ Healthy';
    case 'warning':
      return '⚠️  Warning';
    case 'critical':
      return '🔴 Critical';
  }
}

/**
 * Export metrics in Prometheus format
 */
export function exportPrometheusMetrics(): string {
  const metrics = collectMetrics();
  const lines: string[] = [];

  // Performance metrics
  for (const [operation, stats] of Object.entries(metrics.performance)) {
    const safeOp = operation.replace(/[^a-z0-9_]/gi, '_');

    lines.push(
      `# HELP performance_${safeOp}_avg_duration_ms Average duration in milliseconds`
    );
    lines.push(`# TYPE performance_${safeOp}_avg_duration_ms gauge`);
    lines.push(
      `performance_${safeOp}_avg_duration_ms ${stats.avgDuration}`
    );

    lines.push(
      `# HELP performance_${safeOp}_p95_duration_ms 95th percentile duration in milliseconds`
    );
    lines.push(`# TYPE performance_${safeOp}_p95_duration_ms gauge`);
    lines.push(`performance_${safeOp}_p95_duration_ms ${stats.p95}`);

    lines.push(
      `# HELP performance_${safeOp}_p99_duration_ms 99th percentile duration in milliseconds`
    );
    lines.push(`# TYPE performance_${safeOp}_p99_duration_ms gauge`);
    lines.push(`performance_${safeOp}_p99_duration_ms ${stats.p99}`);

    lines.push(
      `# HELP performance_${safeOp}_success_rate Success rate percentage`
    );
    lines.push(`# TYPE performance_${safeOp}_success_rate gauge`);
    lines.push(`performance_${safeOp}_success_rate ${stats.successRate}`);
  }

  // Storage metrics
  lines.push('# HELP storage_queue_size Number of conversations in queue');
  lines.push('# TYPE storage_queue_size gauge');
  lines.push(`storage_queue_size ${metrics.storage.queued}`);

  lines.push('# HELP storage_completed_total Total completed conversations');
  lines.push('# TYPE storage_completed_total counter');
  lines.push(`storage_completed_total ${metrics.storage.completed}`);

  lines.push('# HELP storage_failed_total Total failed conversations');
  lines.push('# TYPE storage_failed_total counter');
  lines.push(`storage_failed_total ${metrics.storage.failed}`);

  // Cache metrics
  lines.push('# HELP cache_size Current number of cached embeddings');
  lines.push('# TYPE cache_size gauge');
  lines.push(`cache_size ${metrics.cache.size}`);

  lines.push('# HELP cache_hit_rate Cache hit rate percentage');
  lines.push('# TYPE cache_hit_rate gauge');
  lines.push(`cache_hit_rate ${metrics.cache.hitRate}`);

  // Health status
  lines.push('# HELP system_health Overall system health (0=critical, 1=warning, 2=healthy)');
  lines.push('# TYPE system_health gauge');
  const healthValue = metrics.health === 'healthy' ? 2 : metrics.health === 'warning' ? 1 : 0;
  lines.push(`system_health ${healthValue}`);

  return lines.join('\n');
}

/**
 * Print metrics to console
 */
export function printDashboard(): void {
  const metrics = collectMetrics();
  console.log(formatConsoleMetrics(metrics));
}

/**
 * Start metrics stream (print every N seconds)
 */
export function startMetricsStream(intervalSeconds: number = 10): NodeJS.Timeout {
  console.log(`🚀 Starting metrics stream (updates every ${intervalSeconds}s)...`);

  return setInterval(() => {
    printDashboard();
  }, intervalSeconds * 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  collectMetrics,
  checkThresholds,
  getHealthStatus,
  formatConsoleMetrics,
  exportPrometheusMetrics,
  printDashboard,
  startMetricsStream,
};
