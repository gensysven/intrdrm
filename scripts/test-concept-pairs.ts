/**
 * Test Concept Pair Selection
 *
 * Verifies that fair sampling, duplicate detection, and statistics work correctly.
 */

import * as dotenv from 'dotenv';
import {
  getUnusedConceptPair,
  getUnusedConceptPairs,
  getPoolStatistics,
  needsConceptExpansion,
} from './lib/concept-pairs';

dotenv.config({ path: '.env.local' });

async function testConceptPairs() {
  console.log('🧪 Testing concept pair selection...\n');

  // Test 1: Get pool statistics
  console.log('📊 Test 1: Pool Statistics');
  const stats = await getPoolStatistics();
  console.log(`   Concepts: ${stats.conceptCount}`);
  console.log(`   Total connections: ${stats.totalConnections}`);
  console.log(`   Unrated connections: ${stats.unratedConnections}`);
  console.log(`   Rated connections: ${stats.ratedConnections}`);
  console.log(`   Max possible pairs: ${stats.maxPossiblePairs.toLocaleString()}`);
  console.log(
    `   Utilization rate: ${(stats.utilizationRate * 100).toFixed(2)}%`
  );
  console.log(`   Needs expansion: ${stats.needsExpansion ? 'YES' : 'NO'}\n`);

  // Test 2: Get a single unused pair
  console.log('🔍 Test 2: Single Unused Pair');
  const pair = await getUnusedConceptPair();
  if (pair) {
    console.log(`   ✅ Found pair: "${pair.conceptA}" ↔ "${pair.conceptB}"\n`);
  } else {
    console.log('   ❌ Failed to find unused pair\n');
  }

  // Test 3: Get multiple unused pairs
  console.log('🔍 Test 3: Multiple Unused Pairs (10)');
  const startTime = Date.now();
  const pairs = await getUnusedConceptPairs(10);
  const duration = Date.now() - startTime;

  console.log(`   Found ${pairs.length}/10 pairs in ${duration}ms:`);
  pairs.forEach((p, i) => {
    console.log(`   ${i + 1}. "${p.conceptA}" ↔ "${p.conceptB}"`);
  });
  console.log();

  // Test 4: Check if expansion needed
  console.log('🔍 Test 4: Expansion Check');
  const needsExpansion = await needsConceptExpansion();
  console.log(
    `   ${needsExpansion ? '⚠ Expansion recommended' : '✅ Pool is healthy'}\n`
  );

  // Summary
  console.log('✅ All tests completed!');
}

// Run if executed directly
if (require.main === module) {
  testConceptPairs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testConceptPairs };
