# Intrdrm MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a zero-cost, automated AI concept connection generator with dual-critic scoring and flexible rating system for a 30-day engagement experiment.

**Architecture:** Next.js frontend + Supabase PostgreSQL backend + GitHub Actions automation using Claude Code/Codex CLI subscriptions. Dual-critic comparative learning (Haiku + Sonnet) filters connections before user rating (Bad/Good/Wow). Replenishing pool model maintains constant supply.

**Tech Stack:** Next.js 14, React, TypeScript, Supabase (PostgreSQL), Claude Code CLI, Codex CLI, GitHub Actions, Tailwind CSS

---

## Phase 1: Core Infrastructure

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Initialize Next.js with TypeScript**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: Creates Next.js 14 project with App Router, TypeScript, Tailwind CSS

**Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr dotenv
npm install -D @types/node
```

**Step 3: Create environment template**

Create `.env.example`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# CLI Authentication (for local generation)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Optional: Monitoring
SLACK_WEBHOOK_URL=your-slack-webhook
```

**Step 4: Update .gitignore**

Add to `.gitignore`:
```
# Environment
.env
.env.local
.env.*.local

# Logs
/tmp/*.log

# Scripts
/scripts/node_modules
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind

- Set up Next.js 14 with App Router
- Add Supabase client dependencies
- Create environment variable template
- Configure gitignore for secrets

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 1.2: Supabase Schema Setup

**Files:**
- Create: `supabase/migrations/20251026000001_initial_schema.sql`
- Create: `supabase/migrations/20251026000002_indexes.sql`
- Create: `scripts/setup-database.ts`

**Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

**Step 2: Write initial schema migration**

Create `supabase/migrations/20251026000001_initial_schema.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Concepts table
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_a_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  concept_b_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  connection_text TEXT NOT NULL,
  explanation TEXT NOT NULL,

  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt_version TEXT DEFAULT 'v1.0',
  model_used TEXT DEFAULT 'sonnet-4.5',

  -- Status
  status TEXT NOT NULL DEFAULT 'unrated' CHECK (status IN ('unrated', 'rated')),
  rated_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT unique_concept_pair UNIQUE (concept_a_id, concept_b_id),
  CONSTRAINT different_concepts CHECK (concept_a_id != concept_b_id)
);

-- Critic Evaluations table
CREATE TABLE critic_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  critic_model TEXT NOT NULL CHECK (critic_model IN ('haiku-4', 'sonnet-4.5')),

  -- Scores
  novelty INTEGER NOT NULL CHECK (novelty >= 1 AND novelty <= 10),
  coherence INTEGER NOT NULL CHECK (coherence >= 1 AND coherence <= 10),
  usefulness INTEGER NOT NULL CHECK (usefulness >= 1 AND usefulness <= 10),
  total INTEGER GENERATED ALWAYS AS (novelty + coherence + usefulness) STORED,

  -- Metadata
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Correlation tracking (populated by analytics)
  correlation_with_ratings FLOAT,

  -- Constraints
  CONSTRAINT unique_critic_per_connection UNIQUE (connection_id, critic_model)
);

-- Ratings table
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('bad', 'good', 'wow')),
  notes TEXT,
  rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: only one rating per connection
  CONSTRAINT unique_rating_per_connection UNIQUE (connection_id)
);

-- Prompt Templates table
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT false
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for concepts table
CREATE TRIGGER update_concepts_updated_at
    BEFORE UPDATE ON concepts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Step 3: Write indexes migration**

Create `supabase/migrations/20251026000002_indexes.sql`:
```sql
-- Indexes for connections
CREATE INDEX idx_connections_status ON connections(status) WHERE status = 'unrated';
CREATE INDEX idx_connections_rated_at ON connections(rated_at) WHERE rated_at IS NOT NULL;
CREATE INDEX idx_connections_concept_a ON connections(concept_a_id);
CREATE INDEX idx_connections_concept_b ON connections(concept_b_id);

-- Indexes for critic_evaluations
CREATE INDEX idx_critic_eval_connection ON critic_evaluations(connection_id);
CREATE INDEX idx_critic_eval_model ON critic_evaluations(critic_model);
CREATE INDEX idx_critic_eval_total ON critic_evaluations(total DESC);

-- Indexes for ratings
CREATE INDEX idx_ratings_connection ON ratings(connection_id);
CREATE INDEX idx_ratings_rating ON ratings(rating);
CREATE INDEX idx_ratings_rated_at ON ratings(rated_at DESC);

-- Indexes for concepts
CREATE INDEX idx_concepts_category ON concepts(category);
CREATE INDEX idx_concepts_usage_count ON concepts(usage_count ASC);
```

**Step 4: Create database setup script**

Create `scripts/setup-database.ts`:
```typescript
#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename: string) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`\n📝 Running migration: ${filename}`);

  const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
  }

  console.log(`✅ Migration complete: ${filename}`);
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database schema...\n');

  try {
    // Run migrations in order
    await runMigration('20251026000001_initial_schema.sql');
    await runMigration('20251026000002_indexes.sql');

    console.log('\n✅ Database setup complete!');
    console.log('\nTables created:');
    console.log('  - concepts');
    console.log('  - connections');
    console.log('  - critic_evaluations');
    console.log('  - ratings');
    console.log('  - prompt_templates');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
```

**Step 5: Add scripts to package.json**

Add to `package.json` scripts section:
```json
{
  "scripts": {
    "setup:database": "tsx scripts/setup-database.ts"
  }
}
```

Install tsx:
```bash
npm install -D tsx
```

**Step 6: Test database setup (manual)**

```bash
# First, create .env.local with your Supabase credentials
npm run setup:database
```

Expected:
```
🚀 Setting up Supabase database schema...
📝 Running migration: 20251026000001_initial_schema.sql
✅ Migration complete: 20251026000001_initial_schema.sql
📝 Running migration: 20251026000002_indexes.sql
✅ Migration complete: 20251026000002_indexes.sql
✅ Database setup complete!
```

**Step 7: Commit**

```bash
git add supabase/ scripts/setup-database.ts package.json package-lock.json
git commit -m "feat: add Supabase schema and migration scripts

- Create initial schema with 5 tables
- Add indexes for query performance
- Implement constraints for data integrity
- Add setup script for automated migration

Tables:
- concepts: Stores concept database
- connections: Generated concept connections
- critic_evaluations: Dual-critic scores (normalized)
- ratings: User ratings (Bad/Good/Wow)
- prompt_templates: Version control for prompts

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 1.3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/types.ts`

**Step 1: Create Supabase browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create Supabase server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Component: ignore set errors
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server Component: ignore remove errors
          }
        },
      },
    }
  );
}
```

**Step 3: Create TypeScript types**

Create `lib/supabase/types.ts`:
```typescript
export type Database = {
  public: {
    Tables: {
      concepts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      connections: {
        Row: {
          id: string;
          concept_a_id: string;
          concept_b_id: string;
          connection_text: string;
          explanation: string;
          generated_at: string;
          prompt_version: string;
          model_used: string;
          status: 'unrated' | 'rated';
          rated_at: string | null;
        };
        Insert: {
          id?: string;
          concept_a_id: string;
          concept_b_id: string;
          connection_text: string;
          explanation: string;
          generated_at?: string;
          prompt_version?: string;
          model_used?: string;
          status?: 'unrated' | 'rated';
          rated_at?: string | null;
        };
        Update: {
          id?: string;
          concept_a_id?: string;
          concept_b_id?: string;
          connection_text?: string;
          explanation?: string;
          generated_at?: string;
          prompt_version?: string;
          model_used?: string;
          status?: 'unrated' | 'rated';
          rated_at?: string | null;
        };
      };
      critic_evaluations: {
        Row: {
          id: string;
          connection_id: string;
          critic_model: 'haiku-4' | 'sonnet-4.5';
          novelty: number;
          coherence: number;
          usefulness: number;
          total: number;
          evaluated_at: string;
          correlation_with_ratings: number | null;
        };
        Insert: {
          id?: string;
          connection_id: string;
          critic_model: 'haiku-4' | 'sonnet-4.5';
          novelty: number;
          coherence: number;
          usefulness: number;
          evaluated_at?: string;
          correlation_with_ratings?: number | null;
        };
        Update: {
          id?: string;
          connection_id?: string;
          critic_model?: 'haiku-4' | 'sonnet-4.5';
          novelty?: number;
          coherence?: number;
          usefulness?: number;
          evaluated_at?: string;
          correlation_with_ratings?: number | null;
        };
      };
      ratings: {
        Row: {
          id: string;
          connection_id: string;
          rating: 'bad' | 'good' | 'wow';
          notes: string | null;
          rated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          rating: 'bad' | 'good' | 'wow';
          notes?: string | null;
          rated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          rating?: 'bad' | 'good' | 'wow';
          notes?: string | null;
          rated_at?: string;
        };
      };
      prompt_templates: {
        Row: {
          id: string;
          version: string;
          template_text: string;
          created_at: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          version: string;
          template_text: string;
          created_at?: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          version?: string;
          template_text?: string;
          created_at?: string;
          active?: boolean;
        };
      };
    };
  };
};
```

**Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client utilities and types

- Create browser client for client components
- Create server client with cookie handling
- Define TypeScript types for all tables
- Support SSR with Next.js App Router

🤖 Generated with Claude Code"
git push origin main
```

---

## Phase 2: Generation Pipeline

### Task 2.1: Concept Pair Selection

**Files:**
- Create: `scripts/lib/concept-selection.ts`
- Create: `scripts/lib/types.ts`

**Step 1: Create shared types**

Create `scripts/lib/types.ts`:
```typescript
export interface Concept {
  id: string;
  name: string;
  description: string | null;
  category: string;
  usage_count: number;
}

export interface ConceptPair {
  a: Concept;
  b: Concept;
}

export class ConceptDepletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConceptDepletionError';
  }
}
```

**Step 2: Write concept selection logic**

Create `scripts/lib/concept-selection.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/types';
import type { Concept, ConceptPair } from './types';
import { ConceptDepletionError } from './types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MAX_RETRIES = 10;

/**
 * Select least-used concept pair for diversity
 */
async function selectLeastUsedPair(): Promise<ConceptPair> {
  // Get two concepts with lowest usage_count
  const { data: concepts, error } = await supabase
    .from('concepts')
    .select('*')
    .order('usage_count', { ascending: true })
    .limit(20); // Get top 20 to add some randomness

  if (error || !concepts || concepts.length < 2) {
    throw new Error('Not enough concepts in database');
  }

  // Randomly pick 2 from the top 20 least-used
  const shuffled = concepts.sort(() => Math.random() - 0.5);

  return {
    a: shuffled[0] as Concept,
    b: shuffled[1] as Concept,
  };
}

/**
 * Check if concept pair already exists (bidirectional)
 */
async function checkDuplicatePair(
  conceptAId: string,
  conceptBId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('connections')
    .select('id')
    .or(
      `and(concept_a_id.eq.${conceptAId},concept_b_id.eq.${conceptBId}),` +
      `and(concept_a_id.eq.${conceptBId},concept_b_id.eq.${conceptAId})`
    )
    .limit(1);

  if (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Increment usage count for both concepts (transactional)
 */
async function incrementUsageCounts(
  conceptAId: string,
  conceptBId: string
): Promise<void> {
  const { error: errorA } = await supabase.rpc('increment_usage_count', {
    concept_id: conceptAId,
  });

  const { error: errorB } = await supabase.rpc('increment_usage_count', {
    concept_id: conceptBId,
  });

  if (errorA || errorB) {
    throw new Error('Failed to increment usage counts');
  }
}

/**
 * Select a unique concept pair with retry logic
 */
export async function selectConceptPair(): Promise<ConceptPair> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    const pair = await selectLeastUsedPair();

    // Check for duplicate
    const exists = await checkDuplicatePair(pair.a.id, pair.b.id);

    if (!exists) {
      await incrementUsageCounts(pair.a.id, pair.b.id);
      console.log(`✓ Selected pair: ${pair.a.name} ↔ ${pair.b.name}`);
      return pair;
    }

    retries++;
    console.log(`⚠ Duplicate pair found, retry ${retries}/${MAX_RETRIES}`);
  }

  // Trigger concept expansion
  throw new ConceptDepletionError(
    `Exceeded ${MAX_RETRIES} retries. Concept pool may be depleted.`
  );
}
```

**Step 3: Add database function for atomic increment**

Create `supabase/migrations/20251026000003_increment_function.sql`:
```sql
-- Function to atomically increment usage_count
CREATE OR REPLACE FUNCTION increment_usage_count(concept_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE concepts
    SET usage_count = usage_count + 1
    WHERE id = concept_id;
END;
$$ LANGUAGE plpgsql;
```

**Step 4: Run migration**

Update `scripts/setup-database.ts` to include the new migration, then run:
```bash
npm run setup:database
```

**Step 5: Install script dependencies**

```bash
cd scripts
npm init -y
npm install @supabase/supabase-js dotenv
npm install -D @types/node typescript tsx
cd ..
```

**Step 6: Commit**

```bash
git add scripts/ supabase/migrations/20251026000003_increment_function.sql
git commit -m "feat: add concept pair selection with fair sampling

- Implement least-used pair selection algorithm
- Add bidirectional duplicate detection
- Atomic usage_count increment via DB function
- Retry logic with concept depletion error

Prevents duplicate connections and ensures fair concept distribution.

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 2.2: Prompt Templates

**Files:**
- Create: `prompts/generator-v1.md`
- Create: `prompts/critic-v1.md`
- Create: `scripts/lib/prompts.ts`

**Step 1: Create generator prompt template**

Create `prompts/generator-v1.md`:
```markdown
You are generating non-obvious conceptual connections between two concepts.

Concept A: {{CONCEPT_A}}
Concept B: {{CONCEPT_B}}

Generate a deep, surprising connection between these concepts.

Requirements:
- NOT the obvious surface similarity everyone would think of
- Must be specific and concrete, not vague platitudes
- Should make someone go "whoa, I never thought of it that way"
- Ground the connection in actual properties/behaviors of both concepts
- Avoid generic business-speak or self-help language

Format your response as JSON:
{
  "connection": "One clear sentence stating the surprising connection",
  "explanation": "2-3 sentences explaining why this connection is meaningful and non-obvious"
}

Example quality bar:
Good: "Git branches are like mycelial networks - both use distributed nodes that can fork, merge, and share resources without a central authority, enabling resilient collaboration"
Bad: "Git and mushrooms both grow over time" (too obvious/shallow)

Output ONLY the JSON, no other text.
```

**Step 2: Create critic prompt template**

Create `prompts/critic-v1.md`:
```markdown
You are evaluating a conceptual connection for quality.

CONNECTION: {{CONNECTION}}
EXPLANATION: {{EXPLANATION}}

Rate this connection on these criteria (1-10 scale):

1. NOVELTY: Is this surprising and non-obvious?
   - 1 = cliché, everyone knows this
   - 10 = mind-blowing, never thought of before

2. COHERENCE: Does the connection actually make sense?
   - 1 = nonsensical, forced
   - 10 = perfectly logical and well-grounded

3. USEFULNESS: Does this insight have practical or intellectual value?
   - 1 = trivia, useless
   - 10 = actionable wisdom or profound understanding

Output ONLY a JSON object with your scores:
{
  "novelty": <number>,
  "coherence": <number>,
  "usefulness": <number>
}

No explanations, just the JSON.
```

**Step 3: Create prompt utility functions**

Create `scripts/lib/prompts.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface PromptVariables {
  [key: string]: string;
}

/**
 * Load and interpolate a prompt template
 */
export function loadPrompt(
  templateName: string,
  variables: PromptVariables
): string {
  const templatePath = path.join(__dirname, '../../prompts', `${templateName}.md`);
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace all {{VARIABLE}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    template = template.replace(new RegExp(placeholder, 'g'), value);
  }

  return template;
}

/**
 * Generate connection prompt
 */
export function getGeneratorPrompt(conceptA: string, conceptB: string): string {
  return loadPrompt('generator-v1', {
    CONCEPT_A: conceptA,
    CONCEPT_B: conceptB,
  });
}

/**
 * Generate critic prompt
 */
export function getCriticPrompt(connection: string, explanation: string): string {
  return loadPrompt('critic-v1', {
    CONNECTION: connection,
    EXPLANATION: explanation,
  });
}
```

**Step 4: Seed initial prompt template in database**

Create `scripts/seed-prompts.ts`:
```typescript
#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seedPrompts() {
  console.log('📝 Seeding prompt templates...\n');

  const generatorPrompt = fs.readFileSync(
    path.join(__dirname, '../prompts/generator-v1.md'),
    'utf-8'
  );

  const { error } = await supabase.from('prompt_templates').insert({
    version: 'v1.0',
    template_text: generatorPrompt,
    active: true,
  });

  if (error) {
    console.error('❌ Failed to seed prompts:', error);
    process.exit(1);
  }

  console.log('✅ Prompt templates seeded successfully!');
}

seedPrompts();
```

**Step 5: Add to package.json scripts**

```json
{
  "scripts": {
    "setup:prompts": "tsx scripts/seed-prompts.ts"
  }
}
```

**Step 6: Commit**

```bash
git add prompts/ scripts/
git commit -m "feat: add prompt templates for generation and critic

- Create generator prompt (Gwern-inspired quality bar)
- Create critic prompt (novelty/coherence/usefulness rubric)
- Add prompt interpolation utilities
- Seed initial prompt template in database

Generator focuses on non-obvious, specific connections.
Critic evaluates on 3 dimensions with 1-10 scale.

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 2.3: CLI Integration Wrapper

**Files:**
- Create: `scripts/lib/cli-wrapper.ts`

**Step 1: Write CLI wrapper for Claude Code and Codex**

Create `scripts/lib/cli-wrapper.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CLIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Call Claude Code CLI with a prompt
 */
export async function callClaudeCLI(
  prompt: string,
  model: 'haiku-4' | 'sonnet-4.5' = 'sonnet-4.5'
): Promise<CLIResponse> {
  try {
    const { stdout, stderr } = await execAsync(
      `claude -p "${prompt.replace(/"/g, '\\"')}" --output-format json --model ${model}`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer for large responses
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Claude CLI stderr:', stderr);
    }

    try {
      const data = JSON.parse(stdout);
      return { success: true, data };
    } catch (parseError) {
      // If JSON parse fails, return raw text
      return { success: true, data: { text: stdout } };
    }
  } catch (error: any) {
    console.error('Claude CLI error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Call Codex CLI with a prompt
 */
export async function callCodexCLI(
  prompt: string,
  model: string = 'gpt-4'
): Promise<CLIResponse> {
  try {
    const { stdout, stderr } = await execAsync(
      `codex exec --skip-git-repo-check "${prompt.replace(/"/g, '\\"')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Codex CLI stderr:', stderr);
    }

    try {
      const data = JSON.parse(stdout);
      return { success: true, data };
    } catch (parseError) {
      return { success: true, data: { text: stdout } };
    }
  } catch (error: any) {
    console.error('Codex CLI error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⚠ Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

**Step 2: Commit**

```bash
git add scripts/lib/cli-wrapper.ts
git commit -m "feat: add CLI wrapper utilities for Claude Code and Codex

- Create wrapper functions for both CLIs
- Support JSON output parsing
- Add retry logic with exponential backoff
- Handle stderr and error cases gracefully

Enables programmatic access to AI generation and scoring.

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 2.4: Connection Generation Script

**Files:**
- Create: `scripts/generate-single-connection.ts`

**Step 1: Write connection generation script**

Create `scripts/generate-single-connection.ts`:
```typescript
#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import { selectConceptPair } from './lib/concept-selection';
import { ConceptDepletionError } from './lib/types';
import { getGeneratorPrompt, getCriticPrompt } from './lib/prompts';
import { callClaudeCLI, retryWithBackoff } from './lib/cli-wrapper';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
 * Generate connection using Claude Code CLI
 */
async function generateConnection(
  conceptA: string,
  conceptB: string
): Promise<ConnectionData> {
  const prompt = getGeneratorPrompt(conceptA, conceptB);

  const response = await retryWithBackoff(() => callClaudeCLI(prompt, 'sonnet-4.5'));

  if (!response.success || !response.data) {
    throw new Error('Failed to generate connection');
  }

  // Parse JSON response
  const { connection, explanation } = response.data;

  if (!connection || !explanation) {
    throw new Error('Invalid connection response format');
  }

  return { connection, explanation };
}

/**
 * Score connection with critic
 */
async function scoreWithCritic(
  connection: string,
  explanation: string,
  model: 'haiku-4' | 'sonnet-4.5'
): Promise<CriticScores> {
  const prompt = getCriticPrompt(connection, explanation);

  const response = await retryWithBackoff(() => callClaudeCLI(prompt, model));

  if (!response.success || !response.data) {
    console.warn(`Critic ${model} failed, using default scores`);
    return { novelty: 5, coherence: 5, usefulness: 5 }; // Default middle scores
  }

  const { novelty, coherence, usefulness } = response.data;

  // Validate scores
  if (
    typeof novelty !== 'number' ||
    typeof coherence !== 'number' ||
    typeof usefulness !== 'number' ||
    novelty < 1 || novelty > 10 ||
    coherence < 1 || coherence > 10 ||
    usefulness < 1 || usefulness > 10
  ) {
    console.warn(`Invalid scores from ${model}, using defaults`);
    return { novelty: 5, coherence: 5, usefulness: 5 };
  }

  return { novelty, coherence, usefulness };
}

/**
 * Store connection in database
 */
async function storeConnection(
  conceptAId: string,
  conceptBId: string,
  connectionData: ConnectionData
): Promise<string> {
  const { data, error } = await supabase
    .from('connections')
    .insert({
      concept_a_id: conceptAId,
      concept_b_id: conceptBId,
      connection_text: connectionData.connection,
      explanation: connectionData.explanation,
      prompt_version: 'v1.0',
      model_used: 'sonnet-4.5',
      status: 'unrated',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to store connection: ${error?.message}`);
  }

  return data.id;
}

/**
 * Store critic evaluations
 */
async function storeCriticEvaluations(
  connectionId: string,
  haikuScores: CriticScores,
  sonnetScores: CriticScores
): Promise<void> {
  const { error } = await supabase.from('critic_evaluations').insert([
    {
      connection_id: connectionId,
      critic_model: 'haiku-4',
      novelty: haikuScores.novelty,
      coherence: haikuScores.coherence,
      usefulness: haikuScores.usefulness,
    },
    {
      connection_id: connectionId,
      critic_model: 'sonnet-4.5',
      novelty: sonnetScores.novelty,
      coherence: sonnetScores.coherence,
      usefulness: sonnetScores.usefulness,
    },
  ]);

  if (error) {
    throw new Error(`Failed to store critic evaluations: ${error.message}`);
  }
}

/**
 * Send alert for critical errors
 */
async function sendAlert(error: Error): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return;
  }

  const payload = {
    text: `[ERROR] Connection Generation Failed`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error*: ${error.message}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Type*: ${error.name}`,
        },
      },
    ],
  };

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (alertError) {
    console.error('Failed to send alert:', alertError);
  }
}

/**
 * Main: Generate single connection
 */
async function generateSingleConnection(): Promise<boolean> {
  try {
    console.log('[$(date)] Starting connection generation...');

    // Step 1: Select concept pair
    const pair = await selectConceptPair();
    console.log(`[$(date)] Selected: ${pair.a.name} ↔ ${pair.b.name}`);

    // Step 2: Generate connection
    const connectionData = await generateConnection(pair.a.name, pair.b.name);
    console.log(`[$(date)] Generated connection`);

    // Step 3: Store connection
    const connectionId = await storeConnection(
      pair.a.id,
      pair.b.id,
      connectionData
    );
    console.log(`[$(date)] Stored connection: ${connectionId}`);

    // Step 4: Score with both critics in parallel
    console.log(`[$(date)] Scoring with dual critics...`);
    const [haikuScores, sonnetScores] = await Promise.all([
      scoreWithCritic(connectionData.connection, connectionData.explanation, 'haiku-4'),
      scoreWithCritic(connectionData.connection, connectionData.explanation, 'sonnet-4.5'),
    ]);

    console.log(`[$(date)] Haiku scores: N=${haikuScores.novelty} C=${haikuScores.coherence} U=${haikuScores.usefulness}`);
    console.log(`[$(date)] Sonnet scores: N=${sonnetScores.novelty} C=${sonnetScores.coherence} U=${sonnetScores.usefulness}`);

    // Step 5: Store evaluations
    await storeCriticEvaluations(connectionId, haikuScores, sonnetScores);
    console.log(`[$(date)] Stored critic evaluations`);

    console.log(`✓ Generated connection: ${pair.a.name} ↔ ${pair.b.name}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error(`✗ Failed: ${err.message}`);

    // Send alert for critical errors
    if (err instanceof ConceptDepletionError || err.name === 'AuthError') {
      await sendAlert(err);
    }

    return false;
  }
}

// Execute
generateSingleConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
```

**Step 2: Add script to package.json**

```json
{
  "scripts": {
    "generate:single": "tsx scripts/generate-single-connection.ts"
  }
}
```

**Step 3: Test generation (manual)**

```bash
# Ensure CLIs are authenticated and .env.local is configured
npm run generate:single
```

Expected output:
```
[2025-10-26 10:00:00] Starting connection generation...
✓ Selected pair: recursion ↔ mycelium
[2025-10-26 10:00:01] Selected: recursion ↔ mycelium
[2025-10-26 10:00:05] Generated connection
[2025-10-26 10:00:06] Stored connection: abc123...
[2025-10-26 10:00:07] Scoring with dual critics...
[2025-10-26 10:00:10] Haiku scores: N=7 C=8 U=6
[2025-10-26 10:00:10] Sonnet scores: N=8 C=9 U=7
[2025-10-26 10:00:11] Stored critic evaluations
✓ Generated connection: recursion ↔ mycelium
```

**Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add single connection generation script

- Integrate concept selection + generation + dual-critic scoring
- Parallel critic evaluation (Haiku + Sonnet)
- Store connection and evaluations in Supabase
- Retry logic and error handling
- Slack alerting for critical errors

Complete end-to-end pipeline for one connection.

🤖 Generated with Claude Code"
git push origin main
```

---

## Phase 3: Automation & Monitoring

### Task 3.1: Daily Generation Batch Script

**Files:**
- Create: `scripts/generate-daily.sh`

**Step 1: Create bash script for daily batch**

Create `scripts/generate-daily.sh`:
```bash
#!/bin/bash
set -euo pipefail

# Concurrency control
LOCKFILE="/tmp/intrdrm-generate.lock"
exec 200>"$LOCKFILE"
flock -n 200 || { echo "[$(date)] Another generation is running. Exiting."; exit 0; }

# Logging
LOGFILE="/tmp/intrdrm-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOGFILE") 2>&1

echo "[$(date)] Starting daily generation of 20 connections..."

# Parse count from argument (default 20)
COUNT=${1:-20}

GENERATED=0
FAILED=0

for i in $(seq 1 "$COUNT"); do
  echo "[$(date)] Generating connection $i/$COUNT..."

  if npm run generate:single --silent; then
    ((GENERATED++))
  else
    ((FAILED++))
    echo "[$(date)] WARNING: Failed to generate connection $i"
  fi

  # Rate limiting: 1.5s between generations
  sleep 1.5
done

echo "[$(date)] Generation complete: $GENERATED succeeded, $FAILED failed"

# Health check
npm run health:check --silent

# Cleanup
rm -f "$LOCKFILE"

exit 0
```

**Step 2: Make script executable**

```bash
chmod +x scripts/generate-daily.sh
```

**Step 3: Test batch generation**

```bash
./scripts/generate-daily.sh 5  # Generate 5 connections for testing
```

**Step 4: Commit**

```bash
git add scripts/generate-daily.sh
git commit -m "feat: add daily batch generation script

- Generate 20 connections (configurable)
- Concurrency control with lockfile
- Logging to timestamped files
- Rate limiting (1.5s between calls)
- Health check after generation

Designed to run in GitHub Actions daily.

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 3.2: Health Check Script

**Files:**
- Create: `scripts/health-check.ts`

**Step 1: Write health check script**

Create `scripts/health-check.ts`:
```typescript
#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Alert {
  level: 'WARNING' | 'ERROR';
  message: string;
  action: string;
}

async function sendAlert(alert: Alert): Promise<void> {
  const payload = {
    text: `[${alert.level}] Intrdrm Health Check`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${alert.level}*: ${alert.message}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Action*: ${alert.action}` },
      },
    ],
  };

  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Always log to console for GitHub Actions
  console.error(JSON.stringify(alert, null, 2));
}

async function healthCheck(): Promise<void> {
  console.log('[$(date)] Running health checks...\n');

  let hasIssues = false;

  // Check 1: Pool size
  const { count: unratedCount, error: countError } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unrated');

  if (countError) {
    console.error('❌ Error checking pool size:', countError);
    hasIssues = true;
  } else {
    console.log(`📊 Pool size: ${unratedCount} unrated connections`);

    if ((unratedCount ?? 0) < 50) {
      await sendAlert({
        level: 'WARNING',
        message: `Pool size below threshold: ${unratedCount} unrated connections`,
        action: 'Consider running emergency generation workflow',
      });
      hasIssues = true;
    }
  }

  // Check 2: Last successful generation
  const { data: lastGeneration, error: genError } = await supabase
    .from('connections')
    .select('generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (genError || !lastGeneration) {
    console.error('❌ Error checking last generation:', genError);
    hasIssues = true;
  } else {
    const hoursSinceLastGen =
      (Date.now() - new Date(lastGeneration.generated_at).getTime()) /
      (1000 * 60 * 60);

    console.log(
      `🕒 Last generation: ${Math.round(hoursSinceLastGen)} hours ago`
    );

    if (hoursSinceLastGen > 30) {
      await sendAlert({
        level: 'ERROR',
        message: `No connections generated in ${Math.round(hoursSinceLastGen)} hours`,
        action: 'Check GitHub Actions workflow status and CLI authentication',
      });
      hasIssues = true;
    }
  }

  // Check 3: Critic evaluation coverage
  const { data: missingCritics, error: criticError } = await supabase
    .from('connections')
    .select(
      `
      id,
      critic_evaluations!left(id)
    `
    )
    .eq('status', 'unrated')
    .limit(100);

  if (criticError) {
    console.error('❌ Error checking critic evaluations:', criticError);
    hasIssues = true;
  } else {
    const connectionsWithoutCritics = missingCritics?.filter(
      (c: any) => !c.critic_evaluations || c.critic_evaluations.length < 2
    );

    if (connectionsWithoutCritics && connectionsWithoutCritics.length > 0) {
      console.log(
        `⚠️  ${connectionsWithoutCritics.length} connections missing full critic evaluations`
      );
      await sendAlert({
        level: 'WARNING',
        message: `${connectionsWithoutCritics.length} connections missing critic evaluations`,
        action: 'Check critic scoring pipeline for failures',
      });
      hasIssues = true;
    } else {
      console.log('✓ All connections have critic evaluations');
    }
  }

  if (!hasIssues) {
    console.log('\n✅ All health checks passed');
  } else {
    console.log('\n⚠️  Some health checks failed (see above)');
    process.exit(1);
  }
}

healthCheck().catch((error) => {
  console.error('Health check failed:', error);
  process.exit(1);
});
```

**Step 2: Add script to package.json**

```json
{
  "scripts": {
    "health:check": "tsx scripts/health-check.ts"
  }
}
```

**Step 3: Test health check**

```bash
npm run health:check
```

**Step 4: Commit**

```bash
git add scripts/health-check.ts package.json
git commit -m "feat: add health check monitoring script

- Check pool size (alert if < 50 unrated)
- Check last generation timestamp (alert if > 30 hours)
- Check critic evaluation coverage
- Slack webhook integration for alerts
- Exit with error code if checks fail

Runs after daily generation to detect issues early.

🤖 Generated with Claude Code"
git push origin main
```

---

### Task 3.3: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/daily-generation.yml`
- Create: `.github/workflows/emergency-generation.yml`

**Step 1: Create daily generation workflow**

Create `.github/workflows/daily-generation.yml`:
```yaml
name: Daily Connection Generation

on:
  schedule:
    - cron: '0 6 * * *'  # 6am UTC daily
  workflow_dispatch:      # Manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Claude Code CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Install Codex CLI
        run: npm install -g openai-codex-cli

      - name: Authenticate CLIs
        run: |
          # Try API key first, fallback to session token
          echo "${{ secrets.ANTHROPIC_API_KEY }}" | claude login --api-key || \
          echo "${{ secrets.CLAUDE_SESSION_TOKEN }}" | claude login --session

          echo "${{ secrets.OPENAI_API_KEY }}" | codex login --api-key || \
          echo "${{ secrets.CODEX_SESSION_TOKEN }}" | codex login --session
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Generate daily batch
        run: ./scripts/generate-daily.sh
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: generation-logs-${{ github.run_number }}
          path: /tmp/intrdrm-*.log
          retention-days: 30

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"⚠️ Daily generation failed! Check logs: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}"
```

**Step 2: Create emergency generation workflow**

Create `.github/workflows/emergency-generation.yml`:
```yaml
name: Emergency Pool Replenishment

on:
  workflow_dispatch:
    inputs:
      count:
        description: 'Number of connections to generate'
        required: true
        default: '50'
        type: number

jobs:
  emergency-generate:
    runs-on: ubuntu-latest
    timeout-minutes: 90

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install CLIs
        run: |
          npm install -g @anthropic-ai/claude-code
          npm install -g openai-codex-cli

      - name: Authenticate CLIs
        run: |
          echo "${{ secrets.ANTHROPIC_API_KEY }}" | claude login --api-key || \
          echo "${{ secrets.CLAUDE_SESSION_TOKEN }}" | claude login --session

          echo "${{ secrets.OPENAI_API_KEY }}" | codex login --api-key || \
          echo "${{ secrets.CODEX_SESSION_TOKEN }}" | codex login --session
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Generate emergency batch
        run: ./scripts/generate-daily.sh ${{ inputs.count }}
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: emergency-logs-${{ github.run_number }}
          path: /tmp/intrdrm-*.log
          retention-days: 30
```

**Step 3: Commit workflows**

```bash
git add .github/
git commit -m "feat: add GitHub Actions automation workflows

- Daily generation: Runs at 6am UTC, generates 20 connections
- Emergency generation: Manual trigger with configurable count
- CLI authentication with API keys or session tokens
- Log upload for debugging
- Slack notifications on failure

Enables zero-cost automated generation using CLI subscriptions.

🤖 Generated with Claude Code"
git push origin main
```

---

## Phase 4: Rating Experience

### Task 4.1: Basic UI Layout

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Step 1: Create root layout**

Create `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Intrdrm - AI Conceptual Daydreaming',
  description: 'Generate and rate surprising connections between concepts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Create homepage dashboard**

Create `app/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();

  // Fetch stats
  const { count: unratedCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unrated');

  const { count: totalRated } = await supabase
    .from('ratings')
    .select('*', { count: 'exact', head: true });

  const { data: recentRatings } = await supabase
    .from('ratings')
    .select('rating')
    .order('rated_at', { ascending: false })
    .limit(100);

  // Calculate hit rate
  const goodOrWow = recentRatings?.filter(
    (r) => r.rating === 'good' || r.rating === 'wow'
  ).length ?? 0;
  const hitRate = recentRatings?.length
    ? Math.round((goodOrWow / recentRatings.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-2">
            INTRDRM
          </h1>
          <p className="text-slate-600 text-lg">
            AI-powered conceptual daydreaming
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-500 mb-1">Unrated Pool</div>
            <div className="text-3xl font-bold text-slate-900">
              {unratedCount ?? 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-500 mb-1">Total Rated</div>
            <div className="text-3xl font-bold text-slate-900">
              {totalRated ?? 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-slate-500 mb-1">Hit Rate</div>
            <div className="text-3xl font-bold text-slate-900">{hitRate}%</div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            href="/rate"
            className="inline-block bg-slate-900 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            Start Rating →
          </Link>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Update globals.css**

Update `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased;
  }
}
```

**Step 4: Test locally**

```bash
npm run dev
```

Visit http://localhost:3000 - should see dashboard with stats

**Step 5: Commit**

```bash
git add app/
git commit -m "feat: add dashboard UI with stats

- Display pool size, total rated, hit rate
- Clean minimal design with Tailwind
- Server-side data fetching from Supabase
- CTA button to rating interface

🤖 Generated with Claude Code"
git push origin main
```

---

**Due to length constraints, I'll now save the plan and present the execution options.**

