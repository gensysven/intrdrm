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
  'recursion',
  'emergence',
  'entropy',
  'symmetry',
  'duality',
  'infinity',
  'paradox',
  'causality',
  'determinism',
  'randomness',

  // Technology
  'blockchain',
  'neural networks',
  'quantum computing',
  'cryptography',
  'virtualization',
  'containers',
  'microservices',
  'edge computing',
  'serverless',
  'distributed systems',

  // Science
  'photosynthesis',
  'black holes',
  'evolution',
  'thermodynamics',
  'quantum entanglement',
  'DNA replication',
  'plate tectonics',
  'immune system',
  'gravitational waves',
  'dark matter',

  // Psychology
  'cognitive dissonance',
  'confirmation bias',
  'flow state',
  'mirror neurons',
  'neuroplasticity',
  'dunning-kruger effect',
  'imposter syndrome',
  'social proof',
  'anchoring',
  'loss aversion',

  // Philosophy
  'solipsism',
  'utilitarianism',
  'existentialism',
  'nihilism',
  'stoicism',
  'dialectics',
  'phenomenology',
  'epistemology',
  'ontology',
  'aesthetics',

  // Mathematics
  'prime numbers',
  'fractals',
  'topology',
  'game theory',
  'chaos theory',
  'set theory',
  'graph theory',
  'number theory',
  'combinatorics',
  'tessellation',

  // Biology
  'symbiosis',
  'homeostasis',
  'mitosis',
  'metamorphosis',
  'bioluminescence',
  'circadian rhythm',
  'epigenetics',
  'microbiome',
  'apoptosis',
  'phototropism',

  // Physics
  'wave-particle duality',
  'relativity',
  'superposition',
  'conservation of energy',
  'nuclear fusion',
  'magnetism',
  'superconductivity',
  'doppler effect',
  'string theory',
  'higgs boson',

  // Economics
  'supply and demand',
  'opportunity cost',
  'marginal utility',
  'compound interest',
  'creative destruction',
  'network effects',
  'tragedy of the commons',
  'moral hazard',
  'price discrimination',
  'deadweight loss',

  // Sociology
  'social capital',
  'cultural diffusion',
  'bureaucracy',
  'groupthink',
  'subculture',
  'social stratification',
  'hegemony',
  'anomie',
  'urbanization',
  'secularization',

  // Art & Music
  'synesthesia',
  'counterpoint',
  'chiaroscuro',
  'golden ratio',
  'dissonance',
  'perspective',
  'minimalism',
  'impressionism',
  'fugue',
  'motif',

  // Language & Communication
  'semiotics',
  'phonetics',
  'syntax',
  'etymology',
  'rhetoric',
  'metaphor',
  'onomatopoeia',
  'idiom',
  'prosody',
  'pragmatics',

  // Systems & Organization
  'feedback loops',
  'hierarchy',
  'modularity',
  'redundancy',
  'bottleneck',
  'critical path',
  'load balancing',
  'single point of failure',
  'separation of concerns',
  'coupling',

  // Nature & Environment
  'erosion',
  'succession',
  'biodiversity',
  'keystone species',
  'watershed',
  'carbon cycle',
  'trophic cascade',
  'mycorrhizal network',
  'albedo',
  'biomagnification',

  // Human Behavior
  'habituation',
  'reinforcement',
  'extinction',
  'generalization',
  'discrimination',
  'shaping',
  'modeling',
  'priming',
  'framing',
  'reciprocity',

  // Miscellaneous
  'resonance',
  'threshold',
  'catalyst',
  'buffer',
  'gradient',
  'equilibrium',
  'saturation',
  'diffusion',
  'osmosis',
  'polarization',
  'crystallization',
  'fermentation',
  'oxidation',
  'viscosity',
  'elasticity',
  'inertia',
  'momentum',
  'torque',
  'leverage',
  'amplitude',
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
    const batch = INITIAL_CONCEPTS.slice(i, i + batchSize).map((name) => ({
      name,
      usage_count: 0,
    }));

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
