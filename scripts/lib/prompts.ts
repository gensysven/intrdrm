/**
 * Prompt Template Management
 *
 * Loads and interpolates prompt templates with variable substitution.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

/**
 * Load a prompt template and replace variables.
 *
 * @param templateName Name of the template file (without .md extension)
 * @param variables Object containing variable substitutions
 * @returns Interpolated prompt text
 */
export function loadPrompt(
  templateName: string,
  variables: Record<string, string>
): string {
  const templatePath = path.join(PROMPTS_DIR, `${templateName}.md`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templatePath}`);
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace all {{VARIABLE}} placeholders with values
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    template = template.replace(new RegExp(placeholder, 'g'), value);
  }

  return template;
}

/**
 * Generate connection generator prompt.
 */
export function getGeneratorPrompt(
  conceptA: string,
  conceptB: string
): string {
  return loadPrompt('generator-v1', {
    CONCEPT_A: conceptA,
    CONCEPT_B: conceptB,
  });
}

/**
 * Generate critic prompt (run 1 - generous).
 */
export function getCriticPromptRun1(
  connection: string,
  explanation: string
): string {
  return loadPrompt('critic-run-1', {
    CONNECTION: connection,
    EXPLANATION: explanation,
  });
}

/**
 * Generate critic prompt (run 2 - strict).
 */
export function getCriticPromptRun2(
  connection: string,
  explanation: string
): string {
  return loadPrompt('critic-run-2', {
    CONNECTION: connection,
    EXPLANATION: explanation,
  });
}

/**
 * Get list of available prompt templates.
 */
export function listPromptTemplates(): string[] {
  if (!fs.existsSync(PROMPTS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PROMPTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace('.md', ''));
}

/**
 * Validate that all required prompt templates exist.
 */
export function validatePrompts(): { valid: boolean; missing: string[] } {
  const required = ['generator-v1', 'critic-run-1', 'critic-run-2'];
  const missing: string[] = [];

  for (const template of required) {
    const templatePath = path.join(PROMPTS_DIR, `${template}.md`);
    if (!fs.existsSync(templatePath)) {
      missing.push(template);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
