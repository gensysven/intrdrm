/**
 * Test Prompt Templates
 *
 * Verifies that all prompt templates exist and can be loaded correctly.
 */

import {
  validatePrompts,
  listPromptTemplates,
  getGeneratorPrompt,
  getCriticPromptRun1,
  getCriticPromptRun2,
} from './lib/prompts';

function testPrompts() {
  console.log('🧪 Testing prompt templates...\n');

  // Test 1: Validate all required prompts exist
  console.log('📋 Test 1: Validate Required Prompts');
  const validation = validatePrompts();

  if (validation.valid) {
    console.log('   ✅ All required prompts found\n');
  } else {
    console.log(`   ❌ Missing prompts: ${validation.missing.join(', ')}\n`);
    process.exit(1);
  }

  // Test 2: List available templates
  console.log('📋 Test 2: List Available Templates');
  const templates = listPromptTemplates();
  console.log(`   Found ${templates.length} templates:`);
  templates.forEach((t) => console.log(`   - ${t}`));
  console.log();

  // Test 3: Load generator prompt
  console.log('🔍 Test 3: Generator Prompt');
  try {
    const generatorPrompt = getGeneratorPrompt('recursion', 'blockchain');
    console.log(`   ✅ Generator prompt loaded (${generatorPrompt.length} chars)`);
    console.log(`   Preview: ${generatorPrompt.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`   ❌ Failed to load generator prompt: ${error}\n`);
    process.exit(1);
  }

  // Test 4: Load critic run 1 prompt
  console.log('🔍 Test 4: Critic Run 1 Prompt (Generous)');
  try {
    const criticPrompt1 = getCriticPromptRun1(
      'Both are decentralized systems',
      'Both use distributed networks to process information'
    );
    console.log(`   ✅ Critic run 1 prompt loaded (${criticPrompt1.length} chars)`);
    console.log(`   Preview: ${criticPrompt1.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`   ❌ Failed to load critic run 1 prompt: ${error}\n`);
    process.exit(1);
  }

  // Test 5: Load critic run 2 prompt
  console.log('🔍 Test 5: Critic Run 2 Prompt (Strict)');
  try {
    const criticPrompt2 = getCriticPromptRun2(
      'Both are decentralized systems',
      'Both use distributed networks to process information'
    );
    console.log(`   ✅ Critic run 2 prompt loaded (${criticPrompt2.length} chars)`);
    console.log(`   Preview: ${criticPrompt2.substring(0, 100)}...\n`);
  } catch (error) {
    console.log(`   ❌ Failed to load critic run 2 prompt: ${error}\n`);
    process.exit(1);
  }

  // Test 6: Verify variable substitution
  console.log('🔍 Test 6: Variable Substitution');
  const testPrompt = getGeneratorPrompt('TestConceptA', 'TestConceptB');

  if (testPrompt.includes('TestConceptA') && testPrompt.includes('TestConceptB')) {
    console.log('   ✅ Variables correctly substituted\n');
  } else {
    console.log('   ❌ Variable substitution failed\n');
    process.exit(1);
  }

  // Test 7: Verify no leftover placeholders
  console.log('🔍 Test 7: Check for Leftover Placeholders');
  const hasPlaceholders =
    testPrompt.includes('{{') || testPrompt.includes('}}');

  if (hasPlaceholders) {
    console.log('   ❌ Found leftover {{placeholders}} in prompt\n');
    process.exit(1);
  } else {
    console.log('   ✅ No leftover placeholders\n');
  }

  console.log('✅ All tests passed!');
}

// Run if executed directly
if (require.main === module) {
  try {
    testPrompts();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

export { testPrompts };
