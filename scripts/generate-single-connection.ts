#!/usr/bin/env tsx

/**
 * Generate Single Connection
 *
 * End-to-end script to generate a single conceptual connection with dual-critic scoring.
 *
 * Steps:
 * 1. Select an unused concept pair
 * 2. Generate connection using Codex
 * 3. Score with both critics (generous + strict)
 * 4. Store in database with all metadata
 * 5. Increment concept usage counts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import * as dotenv from 'dotenv';
import { getUnusedConceptPair, incrementConceptUsage } from './lib/concept-pairs';
import {
  getGeneratorPrompt,
  getCriticPromptRun1,
  getCriticPromptRun2,
} from './lib/prompts';
import { callCLI, retryWithBackoff, extractJSON } from './lib/cli-wrapper';

dotenv.config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Types for internal use
interface ConnectionData {
  connection: string;
  explanation: string;
}

interface CriticScores {
  novelty: number;
  coherence: number;
  usefulness: number;
}

/**
 * Generate connection using Codex CLI.
 */
async function generateConnection(
  conceptA: string,
  conceptB: string
): Promise<ConnectionData> {
  console.log(`   🤖 Generating connection for: "${conceptA}" ↔ "${conceptB}"`);

  const prompt = getGeneratorPrompt(conceptA, conceptB);

  const response = await retryWithBackoff(
    () => callCLI(prompt, 0.8),
    3,
    2000
  );

  if (!response.success || !response.data) {
    throw new Error(`Failed to generate connection: ${response.error}`);
  }

  // Try to extract JSON if it's wrapped in text
  let data = response.data;
  if (typeof data.text === 'string') {
    const extracted = extractJSON(data.text);
    if (extracted) {
      data = extracted;
    }
  }

  const { connection, explanation } = data;

  if (!connection || !explanation) {
    throw new Error(
      `Invalid connection response format. Expected {connection, explanation}, got: ${JSON.stringify(data)}`
    );
  }

  console.log(`   ✅ Connection generated`);
  console.log(`   📝 "${connection.substring(0, 80)}${connection.length > 80 ? '...' : ''}"`);

  return { connection, explanation };
}

/**
 * Score connection with critic (using Codex).
 */
async function scoreWithCritic(
  connection: string,
  explanation: string,
  run: 1 | 2
): Promise<CriticScores> {
  console.log(`   🎯 Scoring with critic run ${run} (${run === 1 ? 'generous' : 'strict'})...`);

  const prompt =
    run === 1
      ? getCriticPromptRun1(connection, explanation)
      : getCriticPromptRun2(connection, explanation);

  // Use slightly different temperatures for variance
  const temperature = run === 1 ? 0.7 : 0.5;

  const response = await retryWithBackoff(
    () => callCLI(prompt, temperature),
    3,
    2000
  );

  if (!response.success || !response.data) {
    console.warn(`   ⚠ Critic run ${run} failed, using default scores`);
    return { novelty: 5, coherence: 5, usefulness: 5 };
  }

  // Try to extract JSON if it's wrapped in text
  let data = response.data;
  if (typeof data.text === 'string') {
    const extracted = extractJSON(data.text);
    if (extracted) {
      data = extracted;
    }
  }

  const { novelty, coherence, usefulness } = data;

  // Validate scores
  if (
    typeof novelty !== 'number' ||
    typeof coherence !== 'number' ||
    typeof usefulness !== 'number' ||
    novelty < 1 ||
    novelty > 10 ||
    coherence < 1 ||
    coherence > 10 ||
    usefulness < 1 ||
    usefulness > 10
  ) {
    console.warn(`   ⚠ Invalid scores from run ${run}, using defaults`);
    console.warn(`   Received: N=${novelty} C=${coherence} U=${usefulness}`);
    return { novelty: 5, coherence: 5, usefulness: 5 };
  }

  console.log(`   ✅ Run ${run} scores: N=${novelty} C=${coherence} U=${usefulness}`);

  return { novelty, coherence, usefulness };
}

/**
 * Store connection in database.
 */
async function storeConnection(
  conceptAId: string,
  conceptBId: string,
  connectionData: ConnectionData
): Promise<string> {
  console.log(`   💾 Storing connection in database...`);

  const { data, error } = await supabase
    .from('connections')
    .insert({
      concept_a_id: conceptAId,
      concept_b_id: conceptBId,
      connection_text: connectionData.connection,
      explanation: connectionData.explanation,
      prompt_version: 'v1.0',
      model_used: 'gpt-4',
      status: 'unrated',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to store connection: ${error?.message}`);
  }

  console.log(`   ✅ Connection stored (ID: ${data.id})`);

  return data.id;
}

/**
 * Store critic evaluations (both runs).
 */
async function storeCriticEvaluations(
  connectionId: string,
  run1Scores: CriticScores,
  run2Scores: CriticScores
): Promise<void> {
  console.log(`   💾 Storing critic evaluations...`);

  const { error } = await supabase.from('critic_evaluations').insert([
    {
      connection_id: connectionId,
      critic_model: 'gpt-4-run-1',
      novelty: run1Scores.novelty,
      coherence: run1Scores.coherence,
      usefulness: run1Scores.usefulness,
    },
    {
      connection_id: connectionId,
      critic_model: 'gpt-4-run-2',
      novelty: run2Scores.novelty,
      coherence: run2Scores.coherence,
      usefulness: run2Scores.usefulness,
    },
  ]);

  if (error) {
    throw new Error(`Failed to store critic evaluations: ${error.message}`);
  }

  console.log(`   ✅ Critic evaluations stored`);
}

/**
 * Main function: Generate a single connection end-to-end.
 */
async function generateSingleConnection() {
  console.log('🚀 Generating single connection...\n');

  const startTime = Date.now();

  try {
    // Step 1: Select unused concept pair
    console.log('📋 Step 1: Select Concept Pair');
    const pair = await getUnusedConceptPair();

    if (!pair) {
      throw new Error('Failed to find unused concept pair');
    }

    console.log(`   ✅ Selected: "${pair.conceptA}" ↔ "${pair.conceptB}"\n`);

    // Step 2: Generate connection
    console.log('📋 Step 2: Generate Connection');
    const connectionData = await generateConnection(pair.conceptA, pair.conceptB);
    console.log();

    // Step 3: Store connection (before scoring, so we have an ID)
    console.log('📋 Step 3: Store Connection');
    const connectionId = await storeConnection(
      pair.conceptAId,
      pair.conceptBId,
      connectionData
    );
    console.log();

    // Step 4: Score with both critics in parallel
    console.log('📋 Step 4: Score with Dual Critics');
    const [run1Scores, run2Scores] = await Promise.all([
      scoreWithCritic(connectionData.connection, connectionData.explanation, 1),
      scoreWithCritic(connectionData.connection, connectionData.explanation, 2),
    ]);
    console.log();

    // Step 5: Store evaluations
    console.log('📋 Step 5: Store Critic Evaluations');
    await storeCriticEvaluations(connectionId, run1Scores, run2Scores);
    console.log();

    // Step 6: Increment concept usage counts
    console.log('📋 Step 6: Update Concept Usage');
    await incrementConceptUsage(pair.conceptA, pair.conceptB);
    console.log(`   ✅ Usage counts incremented\n`);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('='.repeat(60));
    console.log('✅ SUCCESS');
    console.log('='.repeat(60));
    console.log(`Connection ID: ${connectionId}`);
    console.log(`Concepts: "${pair.conceptA}" ↔ "${pair.conceptB}"`);
    console.log(`Connection: "${connectionData.connection}"`);
    console.log(`\nScores:`);
    console.log(`  Run 1 (generous): N=${run1Scores.novelty} C=${run1Scores.coherence} U=${run1Scores.usefulness} (total: ${run1Scores.novelty + run1Scores.coherence + run1Scores.usefulness})`);
    console.log(`  Run 2 (strict):   N=${run2Scores.novelty} C=${run2Scores.coherence} U=${run2Scores.usefulness} (total: ${run2Scores.novelty + run2Scores.coherence + run2Scores.usefulness})`);
    console.log(`\nDuration: ${duration}s`);
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('\n❌ FAILED');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  generateSingleConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { generateSingleConnection, generateConnection, scoreWithCritic };
