/**
 * Claude Code CLI Integration Wrapper (Optional - Costs Money)
 *
 * Alternative to Codex CLI using Claude Code with Anthropic API.
 * Use this for higher quality, but it costs ~$0.024 per connection.
 *
 * To use: Set USE_CLAUDE=true environment variable
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
 * Call Claude Code CLI with a prompt.
 *
 * @param prompt The prompt to send to Claude
 * @param temperature Temperature setting (0.0-1.0, default 0.7)
 * @returns Parsed response or raw text
 */
export async function callClaudeCLI(
  prompt: string,
  temperature: number = 0.7
): Promise<CLIResponse> {
  try {
    // Validate temperature
    if (temperature < 0 || temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not set. Claude Code requires an API key.',
      };
    }

    // Create temp file for prompt
    const tempFile = `/tmp/claude-prompt-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;
    await fs.promises.writeFile(tempFile, prompt, 'utf-8');

    // Build command (Claude Code uses --model and --temperature)
    const command = `claude --model claude-sonnet-4-5 --temperature ${temperature} --format json "$(cat ${tempFile})"`;

    console.log(`   🤖 Calling Claude Code CLI (temp=${temperature})...`);

    // Execute command with generous timeout (60 seconds)
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 60000, // 60 seconds
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
    });

    // Cleanup temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch (cleanupError) {
      console.warn(`   ⚠ Failed to cleanup temp file: ${tempFile}`);
    }

    // Log stderr warnings
    if (stderr && !stderr.includes('WARNING')) {
      console.error('   ⚠ Claude CLI stderr:', stderr);
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
      console.warn('   ⚠ Claude response is not valid JSON, returning as text');
      return {
        success: true,
        data: { text: trimmedOutput },
        rawOutput: stdout,
      };
    }
  } catch (error: any) {
    console.error('   ❌ Claude CLI error:', error.message);

    // Check if error is due to missing Claude CLI
    if (error.message.includes('command not found') || error.message.includes('claude')) {
      return {
        success: false,
        error: 'Claude CLI not found. Please install: npm install -g @anthropic/claude-code',
      };
    }

    // Check if error is due to authentication
    if (error.message.includes('authentication') || error.message.includes('api key')) {
      return {
        success: false,
        error: 'Claude authentication failed. Please set ANTHROPIC_API_KEY environment variable.',
      };
    }

    // Check if timeout
    if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      return {
        success: false,
        error: 'Claude CLI timeout (exceeded 60 seconds)',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validate Claude CLI is installed and authenticated.
 */
export async function validateClaudeCLI(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        valid: false,
        error: 'ANTHROPIC_API_KEY not set in environment',
      };
    }

    // Check if claude command exists
    const { stdout } = await execAsync('claude --version', { timeout: 5000 });

    if (!stdout) {
      return {
        valid: false,
        error: 'Claude CLI found but returned no version information',
      };
    }

    console.log(`   ✅ Claude CLI found: ${stdout.trim()}`);

    // Check authentication by making a simple test call
    const testResponse = await callClaudeCLI('Say "OK" in JSON: {"status": "OK"}', 0.1);

    if (!testResponse.success) {
      return {
        valid: false,
        error: testResponse.error || 'Claude CLI test call failed',
      };
    }

    console.log('   ✅ Claude CLI is authenticated and working');
    return { valid: true };
  } catch (error: any) {
    if (error.message.includes('command not found')) {
      return {
        valid: false,
        error: 'Claude CLI is not installed. Install with: npm install -g @anthropic/claude-code',
      };
    }

    return {
      valid: false,
      error: error.message,
    };
  }
}
