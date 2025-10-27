/**
 * Concept Pair Selection
 *
 * Handles fair sampling of concept pairs with duplicate detection
 * and adaptive expansion when pairs are running low.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface ConceptPair {
  conceptA: string;
  conceptB: string;
}

/**
 * Get a random concept pair that hasn't been used yet.
 * Uses fair sampling to prefer concepts with lower usage_count.
 */
export async function getUnusedConceptPair(): Promise<ConceptPair | null> {
  // Step 1: Get two distinct concepts, weighted by inverse usage_count
  const { data: concepts, error } = await supabase
    .from('concepts')
    .select('id, name, usage_count')
    .order('usage_count', { ascending: true })
    .limit(50); // Get top 50 least-used concepts

  if (error || !concepts || concepts.length < 2) {
    console.error('Failed to fetch concepts:', error);
    return null;
  }

  // Step 2: Randomly select two distinct concepts from the pool
  const conceptA = concepts[Math.floor(Math.random() * concepts.length)];
  let conceptB = concepts[Math.floor(Math.random() * concepts.length)];

  // Ensure conceptB is different from conceptA
  let attempts = 0;
  while (conceptB.id === conceptA.id && attempts < 10) {
    conceptB = concepts[Math.floor(Math.random() * concepts.length)];
    attempts++;
  }

  if (conceptB.id === conceptA.id) {
    console.error('Could not find two distinct concepts');
    return null;
  }

  // Step 3: Check if this pair already exists (either direction)
  const { data: existingConnection } = await supabase
    .from('connections')
    .select('id')
    .or(`and(concept_a.eq.${conceptA.name},concept_b.eq.${conceptB.name}),and(concept_a.eq.${conceptB.name},concept_b.eq.${conceptA.name})`)
    .single();

  if (existingConnection) {
    // Pair exists, retry with different selection
    return getUnusedConceptPair();
  }

  return {
    conceptA: conceptA.name,
    conceptB: conceptB.name,
  };
}

/**
 * Get multiple unused concept pairs with retry logic.
 * Returns up to `count` pairs, may return fewer if duplicates are frequent.
 */
export async function getUnusedConceptPairs(
  count: number,
  maxRetries: number = 100
): Promise<ConceptPair[]> {
  const pairs: ConceptPair[] = [];
  let retries = 0;

  while (pairs.length < count && retries < maxRetries) {
    const pair = await getUnusedConceptPair();

    if (pair) {
      pairs.push(pair);
    } else {
      retries++;
    }

    // Adaptive expansion trigger
    if (retries > maxRetries * 0.7) {
      console.warn(
        `⚠ High duplicate rate (${retries} retries), consider expanding concept pool`
      );
    }
  }

  if (pairs.length < count) {
    console.warn(
      `⚠ Only found ${pairs.length}/${count} unused pairs after ${retries} retries`
    );
  }

  return pairs;
}

/**
 * Increment usage_count for two concepts (after creating a connection).
 */
export async function incrementConceptUsage(
  conceptA: string,
  conceptB: string
): Promise<void> {
  // Increment conceptA
  await supabase.rpc('increment_concept_usage', { concept_name: conceptA });

  // Increment conceptB
  await supabase.rpc('increment_concept_usage', { concept_name: conceptB });
}

/**
 * Check if concept pool needs expansion.
 * Returns true if duplicate rate is high (>70% retries).
 */
export async function needsConceptExpansion(): Promise<boolean> {
  // Get total concepts and total connections
  const { count: conceptCount } = await supabase
    .from('concepts')
    .select('*', { count: 'exact', head: true });

  const { count: connectionCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true });

  if (!conceptCount || !connectionCount) {
    return false;
  }

  // Calculate max possible unique pairs: n * (n - 1) / 2
  const maxPairs = (conceptCount * (conceptCount - 1)) / 2;

  // If we've used >60% of possible pairs, expansion recommended
  const utilizationRate = connectionCount / maxPairs;

  if (utilizationRate > 0.6) {
    console.log(
      `📊 Concept pool utilization: ${(utilizationRate * 100).toFixed(1)}% (${connectionCount}/${maxPairs} pairs used)`
    );
    return true;
  }

  return false;
}

/**
 * Get pool statistics for monitoring.
 */
export async function getPoolStatistics() {
  const { count: conceptCount } = await supabase
    .from('concepts')
    .select('*', { count: 'exact', head: true });

  const { count: totalConnections } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true });

  const { count: unratedConnections } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unrated');

  const { count: ratedConnections } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rated');

  const maxPairs = conceptCount ? (conceptCount * (conceptCount - 1)) / 2 : 0;
  const utilizationRate = totalConnections && maxPairs ? totalConnections / maxPairs : 0;

  return {
    conceptCount: conceptCount || 0,
    totalConnections: totalConnections || 0,
    unratedConnections: unratedConnections || 0,
    ratedConnections: ratedConnections || 0,
    maxPossiblePairs: maxPairs,
    utilizationRate: utilizationRate,
    needsExpansion: utilizationRate > 0.6,
  };
}
