/**
 * Seed Initial Concepts
 *
 * Populates the database with 150-180 diverse concepts from various domains.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Initial concept pool (150+ concepts across diverse domains)
const INITIAL_CONCEPTS = [
  // Abstract Concepts
  { name: 'recursion', category: 'abstract' },
  { name: 'emergence', category: 'abstract' },
  { name: 'entropy', category: 'abstract' },
  { name: 'symmetry', category: 'abstract' },
  { name: 'duality', category: 'abstract' },
  { name: 'infinity', category: 'abstract' },
  { name: 'paradox', category: 'abstract' },
  { name: 'causality', category: 'abstract' },
  { name: 'determinism', category: 'abstract' },
  { name: 'randomness', category: 'abstract' },

  // Technology
  { name: 'blockchain', category: 'technology' },
  { name: 'neural networks', category: 'technology' },
  { name: 'quantum computing', category: 'technology' },
  { name: 'cryptography', category: 'technology' },
  { name: 'virtualization', category: 'technology' },
  { name: 'containers', category: 'technology' },
  { name: 'microservices', category: 'technology' },
  { name: 'edge computing', category: 'technology' },
  { name: 'serverless', category: 'technology' },
  { name: 'distributed systems', category: 'technology' },

  // Science
  { name: 'photosynthesis', category: 'science' },
  { name: 'black holes', category: 'science' },
  { name: 'evolution', category: 'science' },
  { name: 'thermodynamics', category: 'science' },
  { name: 'quantum entanglement', category: 'science' },
  { name: 'DNA replication', category: 'science' },
  { name: 'plate tectonics', category: 'science' },
  { name: 'immune system', category: 'science' },
  { name: 'gravitational waves', category: 'science' },
  { name: 'dark matter', category: 'science' },

  // Psychology
  { name: 'cognitive dissonance', category: 'psychology' },
  { name: 'confirmation bias', category: 'psychology' },
  { name: 'flow state', category: 'psychology' },
  { name: 'mirror neurons', category: 'psychology' },
  { name: 'neuroplasticity', category: 'psychology' },
  { name: 'dunning-kruger effect', category: 'psychology' },
  { name: 'imposter syndrome', category: 'psychology' },
  { name: 'social proof', category: 'psychology' },
  { name: 'anchoring', category: 'psychology' },
  { name: 'loss aversion', category: 'psychology' },

  // Philosophy
  { name: 'solipsism', category: 'philosophy' },
  { name: 'utilitarianism', category: 'philosophy' },
  { name: 'existentialism', category: 'philosophy' },
  { name: 'nihilism', category: 'philosophy' },
  { name: 'stoicism', category: 'philosophy' },
  { name: 'dialectics', category: 'philosophy' },
  { name: 'phenomenology', category: 'philosophy' },
  { name: 'epistemology', category: 'philosophy' },
  { name: 'ontology', category: 'philosophy' },
  { name: 'aesthetics', category: 'philosophy' },

  // Mathematics
  { name: 'prime numbers', category: 'mathematics' },
  { name: 'fractals', category: 'mathematics' },
  { name: 'topology', category: 'mathematics' },
  { name: 'game theory', category: 'mathematics' },
  { name: 'chaos theory', category: 'mathematics' },
  { name: 'set theory', category: 'mathematics' },
  { name: 'graph theory', category: 'mathematics' },
  { name: 'number theory', category: 'mathematics' },
  { name: 'combinatorics', category: 'mathematics' },
  { name: 'tessellation', category: 'mathematics' },

  // Biology
  { name: 'symbiosis', category: 'biology' },
  { name: 'homeostasis', category: 'biology' },
  { name: 'mitosis', category: 'biology' },
  { name: 'metamorphosis', category: 'biology' },
  { name: 'bioluminescence', category: 'biology' },
  { name: 'circadian rhythm', category: 'biology' },
  { name: 'epigenetics', category: 'biology' },
  { name: 'microbiome', category: 'biology' },
  { name: 'apoptosis', category: 'biology' },
  { name: 'phototropism', category: 'biology' },

  // Physics
  { name: 'wave-particle duality', category: 'physics' },
  { name: 'relativity', category: 'physics' },
  { name: 'superposition', category: 'physics' },
  { name: 'conservation of energy', category: 'physics' },
  { name: 'nuclear fusion', category: 'physics' },
  { name: 'magnetism', category: 'physics' },
  { name: 'superconductivity', category: 'physics' },
  { name: 'doppler effect', category: 'physics' },
  { name: 'string theory', category: 'physics' },
  { name: 'higgs boson', category: 'physics' },

  // Economics
  { name: 'supply and demand', category: 'economics' },
  { name: 'opportunity cost', category: 'economics' },
  { name: 'marginal utility', category: 'economics' },
  { name: 'compound interest', category: 'economics' },
  { name: 'creative destruction', category: 'economics' },
  { name: 'network effects', category: 'economics' },
  { name: 'tragedy of the commons', category: 'economics' },
  { name: 'moral hazard', category: 'economics' },
  { name: 'price discrimination', category: 'economics' },
  { name: 'deadweight loss', category: 'economics' },

  // Sociology
  { name: 'social capital', category: 'sociology' },
  { name: 'cultural diffusion', category: 'sociology' },
  { name: 'bureaucracy', category: 'sociology' },
  { name: 'groupthink', category: 'sociology' },
  { name: 'subculture', category: 'sociology' },
  { name: 'social stratification', category: 'sociology' },
  { name: 'hegemony', category: 'sociology' },
  { name: 'anomie', category: 'sociology' },
  { name: 'urbanization', category: 'sociology' },
  { name: 'secularization', category: 'sociology' },

  // Art & Music
  { name: 'synesthesia', category: 'art' },
  { name: 'counterpoint', category: 'art' },
  { name: 'chiaroscuro', category: 'art' },
  { name: 'golden ratio', category: 'art' },
  { name: 'dissonance', category: 'art' },
  { name: 'perspective', category: 'art' },
  { name: 'minimalism', category: 'art' },
  { name: 'impressionism', category: 'art' },
  { name: 'fugue', category: 'art' },
  { name: 'motif', category: 'art' },

  // Language & Communication
  { name: 'semiotics', category: 'language' },
  { name: 'phonetics', category: 'language' },
  { name: 'syntax', category: 'language' },
  { name: 'etymology', category: 'language' },
  { name: 'rhetoric', category: 'language' },
  { name: 'metaphor', category: 'language' },
  { name: 'onomatopoeia', category: 'language' },
  { name: 'idiom', category: 'language' },
  { name: 'prosody', category: 'language' },
  { name: 'pragmatics', category: 'language' },

  // Systems & Organization
  { name: 'feedback loops', category: 'systems' },
  { name: 'hierarchy', category: 'systems' },
  { name: 'modularity', category: 'systems' },
  { name: 'redundancy', category: 'systems' },
  { name: 'bottleneck', category: 'systems' },
  { name: 'critical path', category: 'systems' },
  { name: 'load balancing', category: 'systems' },
  { name: 'single point of failure', category: 'systems' },
  { name: 'separation of concerns', category: 'systems' },
  { name: 'coupling', category: 'systems' },

  // Nature & Environment
  { name: 'erosion', category: 'nature' },
  { name: 'succession', category: 'nature' },
  { name: 'biodiversity', category: 'nature' },
  { name: 'keystone species', category: 'nature' },
  { name: 'watershed', category: 'nature' },
  { name: 'carbon cycle', category: 'nature' },
  { name: 'trophic cascade', category: 'nature' },
  { name: 'mycorrhizal network', category: 'nature' },
  { name: 'albedo', category: 'nature' },
  { name: 'biomagnification', category: 'nature' },

  // Human Behavior
  { name: 'habituation', category: 'behavior' },
  { name: 'reinforcement', category: 'behavior' },
  { name: 'extinction', category: 'behavior' },
  { name: 'generalization', category: 'behavior' },
  { name: 'discrimination', category: 'behavior' },
  { name: 'shaping', category: 'behavior' },
  { name: 'modeling', category: 'behavior' },
  { name: 'priming', category: 'behavior' },
  { name: 'framing', category: 'behavior' },
  { name: 'reciprocity', category: 'behavior' },

  // Miscellaneous
  { name: 'resonance', category: 'general' },
  { name: 'threshold', category: 'general' },
  { name: 'catalyst', category: 'general' },
  { name: 'buffer', category: 'general' },
  { name: 'gradient', category: 'general' },
  { name: 'equilibrium', category: 'general' },
  { name: 'saturation', category: 'general' },
  { name: 'diffusion', category: 'general' },
  { name: 'osmosis', category: 'general' },
  { name: 'polarization', category: 'general' },
  { name: 'crystallization', category: 'general' },
  { name: 'fermentation', category: 'general' },
  { name: 'oxidation', category: 'general' },
  { name: 'viscosity', category: 'general' },
  { name: 'elasticity', category: 'general' },
  { name: 'inertia', category: 'general' },
  { name: 'momentum', category: 'general' },
  { name: 'torque', category: 'general' },
  { name: 'leverage', category: 'general' },
  { name: 'amplitude', category: 'general' },
];

async function seedConcepts() {
  console.log('🌱 Seeding initial concepts...\n');

  // Check if concepts already exist
  const { count } = await supabase
    .from('concepts')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    console.log(`⚠ Database already has ${count} concepts.`);
    console.log('Do you want to:');
    console.log('  1. Skip seeding (keep existing concepts)');
    console.log('  2. Add new concepts (merge)');
    console.log('  3. Replace all concepts (destructive)');
    console.log('\nRun with --force to skip this prompt and merge.');
    return;
  }

  // Insert concepts in batches
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < INITIAL_CONCEPTS.length; i += batchSize) {
    const batch = INITIAL_CONCEPTS.slice(i, i + batchSize).map(
      ({ name, category }) => ({
        name,
        category,
        usage_count: 0,
      })
    );

    const { error } = await supabase.from('concepts').insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
      continue;
    }

    inserted += batch.length;
    console.log(`✅ Inserted ${inserted}/${INITIAL_CONCEPTS.length} concepts`);
  }

  console.log(`\n🎉 Successfully seeded ${inserted} concepts!`);

  // Show statistics
  const { count: finalCount } = await supabase
    .from('concepts')
    .select('*', { count: 'exact', head: true });

  const maxPairs = finalCount ? (finalCount * (finalCount - 1)) / 2 : 0;

  console.log(`\n📊 Pool Statistics:`);
  console.log(`   Total concepts: ${finalCount}`);
  console.log(`   Max unique pairs: ${maxPairs.toLocaleString()}`);
  console.log(
    `   Days of content (at 20/day): ${Math.floor(maxPairs / 20)} days`
  );
}

// Run if executed directly
if (require.main === module) {
  seedConcepts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedConcepts };
