#!/usr/bin/env bun
/**
 * PreToolUse hook — security checks (dangerous rm, .env protection).
 * Exit code 2 blocks the tool call.
 */

import { readStdinJson } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureSessionLogDir } from './lib/constants';
import { loadConfig } from './lib/config';
import { parseSleepSeconds, getSubagentCount, incrementSubagentCount } from './lib/guardrails';
import type { ToolUseHookInput } from './lib/types';
import { join } from 'path';

/** Allowed directories where rm -rf is permitted */
function getAllowedPaths(): string[] {
  return loadConfig().security.allowedPaths;
}

/**
 * Check if the rm command targets paths exclusively within allowed directories.
 */
function isPathInAllowedDirectory(command: string, allowedDirs: string[]): boolean {
  const pathPattern = /rm\s+(?:-[\w]+\s+|--[\w-]+\s+)*(.+)$/i;
  const match = command.match(pathPattern);
  if (!match) return false;

  const pathStr = match[1].trim();
  const paths = pathStr.split(/\s+/).filter(Boolean);
  if (!paths.length) return false;

  return paths.every(p => {
    const cleaned = p.replace(/^['"]|['"]$/g, '');
    if (!cleaned) return true;
    return allowedDirs.some(dir =>
      cleaned.startsWith(dir) || cleaned.startsWith(`./${dir}`)
    );
  });
}

/**
 * Comprehensive detection of dangerous rm commands.
 */
function isDangerousRmCommand(command: string, allowedDirs: string[]): boolean {
  const normalized = command.toLowerCase().replace(/\s+/g, ' ').trim();

  // Pattern 1: Standard rm -rf variations
  const patterns = [
    /\brm\s+.*-[a-z]*r[a-z]*f/,
    /\brm\s+.*-[a-z]*f[a-z]*r/,
    /\brm\s+--recursive\s+--force/,
    /\brm\s+--force\s+--recursive/,
    /\brm\s+-r\s+.*-f/,
    /\brm\s+-f\s+.*-r/,
  ];

  let isPotentiallyDangerous = patterns.some(p => p.test(normalized));

  // Pattern 2: rm with recursive flag targeting dangerous paths
  if (!isPotentiallyDangerous && /\brm\s+.*-[a-z]*r/.test(normalized)) {
    const dangerousPaths = [
      /\//,
      /\/\*/,
      /~/,
      /~\//,
      /\$HOME/,
      /\.\./,
      /\*/,
      /\./,
      /\.\s*$/,
    ];
    isPotentiallyDangerous = dangerousPaths.some(p => p.test(normalized));
  }

  if (!isPotentiallyDangerous) return false;

  // Check if targeting only allowed directories
  if (allowedDirs.length && isPathInAllowedDirectory(command, allowedDirs)) {
    return false;
  }

  return true;
}

/**
 * Check if any tool is trying to access .env files.
 * Currently commented out (matches Python behavior) but kept as utility.
 */
function _isEnvFileAccess(toolName: string, toolInput: Record<string, unknown>): boolean {
  if (['Read', 'Edit', 'MultiEdit', 'Write'].includes(toolName)) {
    const filePath = (toolInput.file_path as string) ?? '';
    if (filePath.includes('.env') && !filePath.endsWith('.env.sample')) {
      return true;
    }
  }

  if (toolName === 'Bash') {
    const command = (toolInput.command as string) ?? '';
    const envPatterns = [
      /\b\.env\b(?!\.sample)/,
      /cat\s+.*\.env\b(?!\.sample)/,
      /echo\s+.*>\s*\.env\b(?!\.sample)/,
      /touch\s+.*\.env\b(?!\.sample)/,
      /cp\s+.*\.env\b(?!\.sample)/,
      /mv\s+.*\.env\b(?!\.sample)/,
    ];
    return envPatterns.some(p => p.test(command));
  }

  return false;
}

async function main(): Promise<void> {
  const input = await readStdinJson<ToolUseHookInput>();

  const toolName = input.tool_name ?? '';
  const toolInput = input.tool_input ?? {};

  // Check for dangerous rm -rf commands
  if (toolName === 'Bash') {
    const command = (toolInput.command as string) ?? '';
    if (isDangerousRmCommand(command, getAllowedPaths())) {
      console.error('BLOCKED: Dangerous rm command detected and prevented');
      console.error(`Tip: rm -rf is only allowed in these directories: ${getAllowedPaths().join(', ')}`);
      process.exit(2);
    }
  }

  // --- Guardrails ---
  const config = loadConfig();
  const { guardrails } = config;

  if (guardrails.enabled) {
    const sessionId = input.session_id ?? 'unknown';

    // Sleep guard (Bash tool only)
    if (guardrails.sleep.enabled && toolName === 'Bash') {
      const command = (toolInput.command as string) ?? '';
      const sleepSecs = parseSleepSeconds(command);
      if (sleepSecs !== null && sleepSecs > guardrails.sleep.maxSeconds) {
        console.error(
          `BLOCKED: sleep ${sleepSecs}s exceeds limit of ${guardrails.sleep.maxSeconds}s. Use shorter intervals or a different approach.`
        );
        process.exit(2);
      }
    }

    // Subagent repeat guard (Task tool only)
    if (guardrails.subagentRepeat.enabled && toolName === 'Task') {
      const subagentType = (toolInput.subagent_type as string) ?? '';
      if (subagentType) {
        const count = getSubagentCount(sessionId, subagentType);
        if (count >= guardrails.subagentRepeat.maxLaunches) {
          console.error(
            `BLOCKED: ${subagentType} launched ${count} times this session (limit: ${guardrails.subagentRepeat.maxLaunches}). Try a different approach.`
          );
          process.exit(2);
        }
        incrementSubagentCount(sessionId, subagentType);
      }
    }
  }

  // Log the event
  const sessionId = input.session_id ?? 'unknown';
  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'pre_tool_use.json'), input);
}

main().catch(() => process.exit(0));
