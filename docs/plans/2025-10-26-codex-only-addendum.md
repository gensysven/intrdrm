# Codex-Only Implementation Addendum

> **Applies to:** `2025-10-26-mvp-implementation.md`

## Overview

This addendum modifies the implementation plan to use **Codex CLI only** (via ChatGPT subscription) instead of dual Claude Code/Codex setup. This achieves **true zero-cost** generation and scoring.

**Trade-offs:**
- ❌ No dual-critic comparative learning (Haiku vs Sonnet)
- ❌ Single model perspective (GPT-4 only)
- ✅ Zero API costs (uses ChatGPT subscription)
- ✅ Simpler authentication (one CLI, one auth.json)
- ✅ Faster implementation (fewer moving parts)

---

## Modified Architecture

**Original:** Codex generates → Claude Code scores (Haiku + Sonnet dual critics)
**New:** Codex generates → Codex scores (single critic, run twice for comparison)

**Database Schema:** No changes needed - `critic_evaluations.critic_model` will store 'gpt-4-run-1' and 'gpt-4-run-2' instead of 'haiku-4' and 'sonnet-4.5'.

---

## Task Modifications

### Task 1.2: Supabase Schema (Updated)

**Change critic_model enum:**

In `supabase/migrations/20251026000001_initial_schema.sql`, update:

```sql
-- OLD:
critic_model TEXT NOT NULL CHECK (critic_model IN ('haiku-4', 'sonnet-4.5')),

-- NEW:
critic_model TEXT NOT NULL CHECK (critic_model IN ('gpt-4-run-1', 'gpt-4-run-2')),
```

**Rationale:** We'll run the same GPT-4 critic twice with slightly different prompts or temperatures to get variance for comparison.

---

### Task 2.2: Prompt Templates (Updated)

**Critic prompt variants:**

Since we're using the same model twice, add slight variation to prompts:

Create `prompts/critic-run-1.md`:
```markdown
You are a PRIMARY evaluator assessing conceptual connections for quality.

CONNECTION: {{CONNECTION}}
EXPLANATION: {{EXPLANATION}}

As the PRIMARY evaluator, focus on:
1. NOVELTY: Is this surprising and non-obvious? (1-10)
2. COHERENCE: Does it make logical sense? (1-10)
3. USEFULNESS: Does it have practical value? (1-10)

Be slightly more generous with novelty scores.

Output ONLY JSON:
{
  "novelty": <number>,
  "coherence": <number>,
  "usefulness": <number>
}
```

Create `prompts/critic-run-2.md`:
```markdown
You are a SECONDARY evaluator assessing conceptual connections for quality.

CONNECTION: {{CONNECTION}}
EXPLANATION: {{EXPLANATION}}

As the SECONDARY evaluator, apply stricter standards:
1. NOVELTY: Is this truly surprising? (1-10)
2. COHERENCE: Is the logic airtight? (1-10)
3. USEFULNESS: Is there real-world value? (1-10)

Be more conservative with all scores.

Output ONLY JSON:
{
  "novelty": <number>,
  "coherence": <number>,
  "usefulness": <number>
}
```

**Update `scripts/lib/prompts.ts`:**

```typescript
/**
 * Generate critic prompt (run 1 - generous)
 */
export function getCriticPromptRun1(connection: string, explanation: string): string {
  return loadPrompt('critic-run-1', {
    CONNECTION: connection,
    EXPLANATION: explanation,
  });
}

/**
 * Generate critic prompt (run 2 - strict)
 */
export function getCriticPromptRun2(connection: string, explanation: string): string {
  return loadPrompt('critic-run-2', {
    CONNECTION: connection,
    EXPLANATION: explanation,
  });
}
```

---

### Task 2.3: CLI Integration (Simplified)

**Remove Claude Code wrapper, keep only Codex:**

Update `scripts/lib/cli-wrapper.ts`:

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
 * Call Codex CLI with a prompt
 */
export async function callCodexCLI(
  prompt: string,
  temperature: number = 0.7
): Promise<CLIResponse> {
  try {
    // Create temp file for prompt (avoids shell escaping issues)
    const tempFile = `/tmp/codex-prompt-${Date.now()}.txt`;
    await execAsync(`echo "${prompt.replace(/"/g, '\\"')}" > ${tempFile}`);

    const { stdout, stderr } = await execAsync(
      `codex exec --skip-git-repo-check --temperature ${temperature} "$(cat ${tempFile})"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Cleanup
    await execAsync(`rm -f ${tempFile}`);

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Codex CLI stderr:', stderr);
    }

    // Try to parse JSON from output
    try {
      const data = JSON.parse(stdout);
      return { success: true, data };
    } catch (parseError) {
      // If not JSON, return as text
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

---

### Task 2.4: Connection Generation (Updated)

**Update `scripts/generate-single-connection.ts`:**

Replace the critic scoring section with:

```typescript
/**
 * Score connection with critic (using Codex)
 */
async function scoreWithCritic(
  connection: string,
  explanation: string,
  run: 1 | 2
): Promise<CriticScores> {
  const prompt = run === 1
    ? getCriticPromptRun1(connection, explanation)
    : getCriticPromptRun2(connection, explanation);

  // Use slightly different temperatures for variance
  const temperature = run === 1 ? 0.7 : 0.5;

  const response = await retryWithBackoff(() => callCodexCLI(prompt, temperature));

  if (!response.success || !response.data) {
    console.warn(`Critic run ${run} failed, using default scores`);
    return { novelty: 5, coherence: 5, usefulness: 5 };
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
    console.warn(`Invalid scores from run ${run}, using defaults`);
    return { novelty: 5, coherence: 5, usefulness: 5 };
  }

  return { novelty, coherence, usefulness };
}

/**
 * Generate connection using Codex CLI
 */
async function generateConnection(
  conceptA: string,
  conceptB: string
): Promise<ConnectionData> {
  const prompt = getGeneratorPrompt(conceptA, conceptB);

  const response = await retryWithBackoff(() => callCodexCLI(prompt, 0.8));

  if (!response.success || !response.data) {
    throw new Error('Failed to generate connection');
  }

  const { connection, explanation } = response.data;

  if (!connection || !explanation) {
    throw new Error('Invalid connection response format');
  }

  return { connection, explanation };
}

/**
 * Store critic evaluations (updated model names)
 */
async function storeCriticEvaluations(
  connectionId: string,
  run1Scores: CriticScores,
  run2Scores: CriticScores
): Promise<void> {
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
}

// In main function, update critic scoring:
    // Step 4: Score with both critic runs in parallel
    console.log(`[$(date)] Scoring with dual critics...`);
    const [run1Scores, run2Scores] = await Promise.all([
      scoreWithCritic(connectionData.connection, connectionData.explanation, 1),
      scoreWithCritic(connectionData.connection, connectionData.explanation, 2),
    ]);

    console.log(`[$(date)] Run 1 scores: N=${run1Scores.novelty} C=${run1Scores.coherence} U=${run1Scores.usefulness}`);
    console.log(`[$(date)] Run 2 scores: N=${run2Scores.novelty} C=${run2Scores.coherence} U=${run2Scores.usefulness}`);

    // Step 5: Store evaluations
    await storeCriticEvaluations(connectionId, run1Scores, run2Scores);
```

---

### Task 3.3: GitHub Actions (Updated Authentication)

**Update `.github/workflows/daily-generation.yml`:**

Replace the authentication section with:

```yaml
      - name: Set up Codex authentication
        run: |
          mkdir -p ~/.codex
          echo '${{ secrets.CODEX_AUTH_JSON }}' > ~/.codex/auth.json
          chmod 600 ~/.codex/auth.json
        env:
          CODEX_AUTH_JSON: ${{ secrets.CODEX_AUTH_JSON }}

      - name: Verify Codex authentication
        run: codex --version
```

**Remove Claude Code installation and auth steps entirely.**

---

## GitHub Secrets Setup

Add to your repository secrets (Settings → Secrets and variables → Actions):

1. **CODEX_AUTH_JSON**
   ```bash
   # On your local machine:
   cat ~/.codex/auth.json | pbcopy
   # Paste into GitHub secret
   ```

2. **NEXT_PUBLIC_SUPABASE_URL** - Your Supabase project URL

3. **SUPABASE_SERVICE_KEY** - Your Supabase service role key

4. **SLACK_WEBHOOK_URL** (optional) - For failure alerts

---

## Environment Variables (Updated)

Update `.env.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Codex CLI is authenticated via ~/.codex/auth.json
# No API keys needed for zero-cost generation!

# Optional: Monitoring
SLACK_WEBHOOK_URL=your-slack-webhook
```

---

## Testing Authentication Locally

Before implementing, verify Codex works:

```bash
# Test Codex authentication
codex exec --skip-git-repo-check "Generate a JSON object with fields 'test' and 'value'"

# Should output JSON without errors
# If authentication fails, run: codex login
```

---

## Summary of Changes

| Component | Original Plan | Codex-Only Plan |
|-----------|---------------|-----------------|
| **Generator** | Codex CLI | Codex CLI (no change) |
| **Critic 1** | Claude Haiku | Codex (generous prompt, temp=0.7) |
| **Critic 2** | Claude Sonnet | Codex (strict prompt, temp=0.5) |
| **Auth Method** | API keys OR session | `auth.json` file only |
| **GitHub Secrets** | 4-5 secrets | 3 secrets (simpler) |
| **Cost** | ~$24 if API used | **$0** (subscription only) |
| **Complexity** | Two CLIs to manage | One CLI (simpler) |

---

## Execution Notes

When implementing:

1. **Follow main implementation plan** for structure
2. **Apply modifications from this addendum** for Codex-specific changes
3. **Test locally first** before setting up GitHub Actions
4. **Verify auth.json works** in headless mode

The core architecture remains the same - only the AI provider changes from dual-model to single-model with variance.
