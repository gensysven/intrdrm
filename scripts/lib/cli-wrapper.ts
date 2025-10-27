/**
 * Codex CLI Integration Wrapper
 *
 * Provides a TypeScript interface to the Codex CLI for zero-cost generation.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface CLIResponse {
  success: boolean;
  data?: any;
  error?: string;
  rawOutput?: string;
}

/**
 * Call Codex CLI with a prompt.
 *
 * @param prompt The prompt to send to Codex
 * @param temperature Temperature setting (0.0-1.0, default 0.7)
 * @param skipGitCheck Skip git repository check (default true)
 * @returns Parsed response or raw text
 */
export async function callCodexCLI(
  prompt: string,
  temperature: number = 0.7,
  skipGitCheck: boolean = true
): Promise<CLIResponse> {
  try {
    // Validate temperature
    if (temperature < 0 || temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }

    // Create temp file for prompt (avoids shell escaping issues)
    const tempFile = `/tmp/codex-prompt-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;
    await fs.promises.writeFile(tempFile, prompt, 'utf-8');

    // Build command
    const gitCheckFlag = skipGitCheck ? '--skip-git-repo-check' : '';
    const command = `codex exec ${gitCheckFlag} --temperature ${temperature} "$(cat ${tempFile})"`;

    console.log(`   🤖 Calling Codex CLI (temp=${temperature})...`);

    // Execute command with generous timeout (60 seconds)
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 60000, // 60 seconds
      cwd: '/tmp', // Run in temp directory to avoid git repo issues
    });

    // Cleanup temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch (cleanupError) {
      console.warn(`   ⚠ Failed to cleanup temp file: ${tempFile}`);
    }

    // Log stderr warnings (not necessarily errors)
    if (stderr && !stderr.includes('WARNING')) {
      console.error('   ⚠ Codex CLI stderr:', stderr);
    }

    // Try to parse JSON from output
    const trimmedOutput = stdout.trim();

    // Look for JSON in code blocks first
    const jsonBlockMatch = trimmedOutput.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        const data = JSON.parse(jsonBlockMatch[1]);
        return { success: true, data, rawOutput: stdout };
      } catch (parseError) {
        console.warn('   ⚠ Found JSON block but failed to parse');
      }
    }

    // Try to parse raw output as JSON
    try {
      const data = JSON.parse(trimmedOutput);
      return { success: true, data, rawOutput: stdout };
    } catch (parseError) {
      // Not JSON, return as text
      console.warn('   ⚠ Codex response is not valid JSON, returning as text');
      return {
        success: true,
        data: { text: trimmedOutput },
        rawOutput: stdout,
      };
    }
  } catch (error: any) {
    console.error('   ❌ Codex CLI error:', error.message);

    // Check if error is due to missing Codex CLI
    if (error.message.includes('command not found') || error.message.includes('codex')) {
      return {
        success: false,
        error: 'Codex CLI not found. Please ensure Codex is installed and in your PATH.',
      };
    }

    // Check if error is due to authentication
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      return {
        success: false,
        error: 'Codex authentication failed. Please run: codex login',
      };
    }

    // Check if timeout
    if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      return {
        success: false,
        error: 'Codex CLI timeout (exceeded 60 seconds)',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retry wrapper with exponential backoff.
 *
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries (default 3)
 * @param initialDelay Initial delay in milliseconds (default 1000)
 * @returns Result of the function
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

      // Don't retry on certain errors
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('auth')
      ) {
        throw lastError; // Fail fast on configuration errors
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(
          `   ⚠ Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Validate Codex CLI is installed and authenticated.
 *
 * @returns Object with validation status and error message if any
 */
export async function validateCodexCLI(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check if codex command exists
    const { stdout } = await execAsync('codex --version', { timeout: 5000 });

    if (!stdout) {
      return {
        valid: false,
        error: 'Codex CLI found but returned no version information',
      };
    }

    console.log(`   ✅ Codex CLI found: ${stdout.trim()}`);

    // Check authentication by making a simple test call
    const testResponse = await callCodexCLI('Say "OK" in JSON: {"status": "OK"}', 0.1);

    if (!testResponse.success) {
      return {
        valid: false,
        error: testResponse.error || 'Codex CLI test call failed',
      };
    }

    console.log('   ✅ Codex CLI is authenticated and working');
    return { valid: true };
  } catch (error: any) {
    if (error.message.includes('command not found')) {
      return {
        valid: false,
        error: 'Codex CLI is not installed. Please install it first.',
      };
    }

    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Extract JSON from various response formats.
 * Handles code blocks, mixed text+JSON, and raw JSON.
 *
 * @param text Raw text response
 * @returns Parsed JSON object or null
 */
export function extractJSON(text: string): any | null {
  // Try 1: Look for JSON in code blocks
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Try 2: Look for any JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Try 3: Parse entire text as JSON
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    return null;
  }
}
