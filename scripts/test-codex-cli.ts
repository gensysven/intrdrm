/**
 * Test Codex CLI Integration
 *
 * Verifies that Codex CLI is installed, authenticated, and working correctly.
 */

import {
  validateCLI,
  callCLI,
  extractJSON,
  retryWithBackoff,
} from './lib/cli-wrapper';

async function testCodexCLI() {
  console.log('🧪 Testing Codex CLI integration...\n');

  // Test 1: Validate CLI installation and authentication
  const cliName = process.env.USE_CLAUDE === 'true' ? 'Claude Code' : 'Codex';
  console.log(`📋 Test 1: Validate ${cliName} CLI`);
  const validation = await validateCLI();

  if (!validation.valid) {
    console.error(`   ❌ Validation failed: ${validation.error}\n`);
    console.log('To fix this:');
    console.log('  1. Install Codex CLI: npm install -g @openai/codex-cli');
    console.log('  2. Authenticate: codex login\n');
    process.exit(1);
  }

  console.log('   ✅ Codex CLI is ready\n');

  // Test 2: Simple JSON generation
  console.log('📋 Test 2: Simple JSON Generation');
  const simplePrompt = 'Output a JSON object with two fields: "test" set to true, and "value" set to 42. Output ONLY the JSON, no other text.';

  try {
    const response = await callCLI(simplePrompt, 0.1);

    if (!response.success) {
      console.error(`   ❌ Simple call failed: ${response.error}\n`);
      process.exit(1);
    }

    console.log(`   ✅ Response received`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    console.log();
  } catch (error) {
    console.error(`   ❌ Exception during simple call:`, error);
    process.exit(1);
  }

  // Test 3: JSON extraction from mixed text
  console.log('📋 Test 3: JSON Extraction');
  const mixedText = `
Here is the JSON you requested:

\`\`\`json
{
  "novelty": 8,
  "coherence": 7,
  "usefulness": 6
}
\`\`\`

Hope this helps!
  `;

  const extracted = extractJSON(mixedText);
  if (extracted && extracted.novelty === 8) {
    console.log('   ✅ Successfully extracted JSON from code block');
    console.log(`   Extracted:`, JSON.stringify(extracted, null, 2));
    console.log();
  } else {
    console.error('   ❌ Failed to extract JSON from mixed text\n');
    process.exit(1);
  }

  // Test 4: Retry with backoff (simulate failure then success)
  console.log('📋 Test 4: Retry with Backoff');
  let attemptCount = 0;

  try {
    const result = await retryWithBackoff(
      async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Simulated transient failure');
        }
        return 'Success!';
      },
      3,
      100
    );

    console.log(`   ✅ Retry succeeded after ${attemptCount} attempts`);
    console.log(`   Result: ${result}\n`);
  } catch (error) {
    console.error('   ❌ Retry failed after max attempts\n');
    process.exit(1);
  }

  // Test 5: Connection generation (realistic prompt)
  console.log('📋 Test 5: Connection Generation (Realistic Prompt)');
  const generationPrompt = `
Generate a conceptual connection between "recursion" and "mirrors".

Output ONLY JSON in this format:
{
  "connection": "A brief statement of the connection (1-2 sentences)",
  "explanation": "A detailed explanation (2-3 sentences)"
}
  `.trim();

  try {
    const response = await callCLI(generationPrompt, 0.8);

    if (!response.success) {
      console.error(`   ❌ Generation failed: ${response.error}\n`);
      process.exit(1);
    }

    if (response.data && response.data.connection && response.data.explanation) {
      console.log('   ✅ Connection generated successfully');
      console.log(`   Connection: ${response.data.connection}`);
      console.log(`   Explanation: ${response.data.explanation.substring(0, 100)}...`);
      console.log();
    } else {
      console.error('   ❌ Response missing required fields\n');
      console.error('   Received:', response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Exception during generation:`, error);
    process.exit(1);
  }

  console.log('✅ All tests passed!');
  console.log('\n🎉 Codex CLI is working correctly and ready for production use.');
}

// Run if executed directly
if (require.main === module) {
  testCodexCLI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { testCodexCLI };
