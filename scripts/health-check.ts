#!/usr/bin/env tsx

/**
 * Health Check Script
 *
 * Monitors system health and sends alerts if issues are detected.
 *
 * Checks:
 * - Pool size (unrated connections)
 * - Last generation timestamp
 * - Concept pool utilization
 * - Database connectivity
 * - Critic score distribution
 *
 * Exit codes:
 * - 0: All healthy
 * - 1: Critical issues detected
 * - 2: Warnings detected
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import * as dotenv from 'dotenv';
import { getPoolStatistics } from './lib/concept-pairs';

dotenv.config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    value?: any;
  }[];
}

/**
 * Check unrated pool size.
 * Critical if <50, warning if <100.
 */
async function checkPoolSize(): Promise<HealthCheckResult['checks'][0]> {
  const { count } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unrated');

  const unratedCount = count || 0;

  if (unratedCount < 50) {
    return {
      name: 'Pool Size',
      status: 'fail',
      message: `Critical: Only ${unratedCount} unrated connections (minimum: 50)`,
      value: unratedCount,
    };
  } else if (unratedCount < 100) {
    return {
      name: 'Pool Size',
      status: 'warn',
      message: `Warning: Only ${unratedCount} unrated connections (target: 200)`,
      value: unratedCount,
    };
  } else {
    return {
      name: 'Pool Size',
      status: 'pass',
      message: `Pool is healthy with ${unratedCount} unrated connections`,
      value: unratedCount,
    };
  }
}

/**
 * Check last generation timestamp.
 * Critical if >48 hours, warning if >24 hours.
 */
async function checkLastGeneration(): Promise<HealthCheckResult['checks'][0]> {
  const { data } = await supabase
    .from('connections')
    .select('generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return {
      name: 'Last Generation',
      status: 'fail',
      message: 'Critical: No connections found in database',
      value: null,
    };
  }

  const lastGenerated = new Date(data.generated_at);
  const now = new Date();
  const hoursAgo = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48) {
    return {
      name: 'Last Generation',
      status: 'fail',
      message: `Critical: Last generation was ${hoursAgo.toFixed(1)} hours ago`,
      value: lastGenerated.toISOString(),
    };
  } else if (hoursAgo > 24) {
    return {
      name: 'Last Generation',
      status: 'warn',
      message: `Warning: Last generation was ${hoursAgo.toFixed(1)} hours ago`,
      value: lastGenerated.toISOString(),
    };
  } else {
    return {
      name: 'Last Generation',
      status: 'pass',
      message: `Last generation was ${hoursAgo.toFixed(1)} hours ago`,
      value: lastGenerated.toISOString(),
    };
  }
}

/**
 * Check concept pool utilization.
 * Critical if >80%, warning if >60%.
 */
async function checkConceptUtilization(): Promise<HealthCheckResult['checks'][0]> {
  const stats = await getPoolStatistics();
  const utilizationPercent = (stats.utilizationRate * 100).toFixed(1);

  if (stats.utilizationRate > 0.8) {
    return {
      name: 'Concept Utilization',
      status: 'fail',
      message: `Critical: Concept pool ${utilizationPercent}% utilized (need expansion)`,
      value: stats.utilizationRate,
    };
  } else if (stats.utilizationRate > 0.6) {
    return {
      name: 'Concept Utilization',
      status: 'warn',
      message: `Warning: Concept pool ${utilizationPercent}% utilized (consider expansion)`,
      value: stats.utilizationRate,
    };
  } else {
    return {
      name: 'Concept Utilization',
      status: 'pass',
      message: `Concept pool ${utilizationPercent}% utilized`,
      value: stats.utilizationRate,
    };
  }
}

/**
 * Check database connectivity.
 */
async function checkDatabaseConnectivity(): Promise<
  HealthCheckResult['checks'][0]
> {
  try {
    const { count, error } = await supabase
      .from('concepts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        name: 'Database Connectivity',
        status: 'fail',
        message: `Critical: Database error - ${error.message}`,
        value: null,
      };
    }

    return {
      name: 'Database Connectivity',
      status: 'pass',
      message: `Database connected (${count} concepts)`,
      value: count,
    };
  } catch (error: any) {
    return {
      name: 'Database Connectivity',
      status: 'fail',
      message: `Critical: Cannot connect to database - ${error.message}`,
      value: null,
    };
  }
}

/**
 * Check critic score distribution.
 * Warning if average scores are too high (>8) or too low (<4).
 */
async function checkCriticScores(): Promise<HealthCheckResult['checks'][0]> {
  const { data, error } = await supabase
    .from('critic_evaluations')
    .select('novelty, coherence, usefulness');

  if (error || !data || data.length === 0) {
    return {
      name: 'Critic Scores',
      status: 'warn',
      message: 'Warning: No critic evaluations found',
      value: null,
    };
  }

  const avgNovelty =
    data.reduce((sum, e) => sum + e.novelty, 0) / data.length;
  const avgCoherence =
    data.reduce((sum, e) => sum + e.coherence, 0) / data.length;
  const avgUsefulness =
    data.reduce((sum, e) => sum + e.usefulness, 0) / data.length;
  const avgTotal = (avgNovelty + avgCoherence + avgUsefulness) / 3;

  if (avgTotal > 8) {
    return {
      name: 'Critic Scores',
      status: 'warn',
      message: `Warning: Average score too high (${avgTotal.toFixed(1)}/10) - critics may be too generous`,
      value: { avgNovelty: avgNovelty.toFixed(1), avgCoherence: avgCoherence.toFixed(1), avgUsefulness: avgUsefulness.toFixed(1) },
    };
  } else if (avgTotal < 4) {
    return {
      name: 'Critic Scores',
      status: 'warn',
      message: `Warning: Average score too low (${avgTotal.toFixed(1)}/10) - critics may be too strict`,
      value: { avgNovelty: avgNovelty.toFixed(1), avgCoherence: avgCoherence.toFixed(1), avgUsefulness: avgUsefulness.toFixed(1) },
    };
  } else {
    return {
      name: 'Critic Scores',
      status: 'pass',
      message: `Average score: ${avgTotal.toFixed(1)}/10 (N=${avgNovelty.toFixed(1)} C=${avgCoherence.toFixed(1)} U=${avgUsefulness.toFixed(1)})`,
      value: { avgNovelty: avgNovelty.toFixed(1), avgCoherence: avgCoherence.toFixed(1), avgUsefulness: avgUsefulness.toFixed(1) },
    };
  }
}

/**
 * Run all health checks.
 */
async function runHealthChecks(): Promise<HealthCheckResult> {
  console.log('🏥 Running health checks...\n');

  const checks = await Promise.all([
    checkDatabaseConnectivity(),
    checkPoolSize(),
    checkLastGeneration(),
    checkConceptUtilization(),
    checkCriticScores(),
  ]);

  // Determine overall status
  const hasCritical = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warn');

  const status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

  return { status, checks };
}

/**
 * Print health check results.
 */
function printResults(result: HealthCheckResult) {
  console.log('📋 Health Check Results\n');
  console.log('='.repeat(60));

  result.checks.forEach((check) => {
    const icon =
      check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);
    if (check.value !== undefined && check.value !== null) {
      console.log(`   Value: ${typeof check.value === 'object' ? JSON.stringify(check.value) : check.value}`);
    }
    console.log();
  });

  console.log('='.repeat(60));
  if (result.status === 'healthy') {
    console.log('✅ ALL SYSTEMS HEALTHY');
  } else if (result.status === 'warning') {
    console.log('⚠️  WARNINGS DETECTED');
  } else {
    console.log('❌ CRITICAL ISSUES DETECTED');
  }
  console.log('='.repeat(60));
}

/**
 * Send Slack notification (if webhook URL is configured).
 */
async function sendSlackNotification(result: HealthCheckResult) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('\n💡 Tip: Set SLACK_WEBHOOK_URL to receive alerts');
    return;
  }

  // Only send notifications for warnings and critical issues
  if (result.status === 'healthy') {
    return;
  }

  const color = result.status === 'critical' ? 'danger' : 'warning';
  const emoji = result.status === 'critical' ? '🚨' : '⚠️';

  const fields = result.checks
    .filter((c) => c.status !== 'pass')
    .map((c) => ({
      title: c.name,
      value: c.message,
      short: false,
    }));

  const payload = {
    text: `${emoji} Intrdrm Health Check: ${result.status.toUpperCase()}`,
    attachments: [
      {
        color,
        fields,
        footer: 'Intrdrm Health Monitor',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.log('⚠️  Failed to send Slack notification');
    } else {
      console.log('\n📤 Slack notification sent');
    }
  } catch (error) {
    console.log('⚠️  Failed to send Slack notification:', error);
  }
}

/**
 * Main function.
 */
async function main() {
  try {
    const result = await runHealthChecks();
    printResults(result);
    await sendSlackNotification(result);

    // Exit with appropriate code
    if (result.status === 'critical') {
      process.exit(1);
    } else if (result.status === 'warning') {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runHealthChecks, HealthCheckResult };
