/**
 * Shared constants and path utilities for Claude Code hooks.
 */

import { mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Ensure the session log directory exists and return its path.
 * Mirrors Python: ~/.claude/logs/{sessionId}/
 */
export function ensureSessionLogDir(sessionId: string): string {
  const logDir = join(homedir(), '.claude', 'logs', sessionId);
  mkdirSync(logDir, { recursive: true });
  return logDir;
}

/**
 * Get the project name for TTS messages.
 * Priority:
 * 1. hooks.config.json → project.name
 * 2. $CLAUDE_PROJECT_DIR/package.json → name
 * 3. $CLAUDE_PROJECT_DIR → directory basename
 * 4. Fallback: "unknown project"
 */
export function getProjectName(): string {
  // 1. Check hooks.config.json
  try {
    const configPath = join(__dirname, '..', 'hooks.config.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config?.project?.name) return config.project.name;
    }
  } catch { /* ignore */ }

  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    // 2. Check package.json in project dir
    try {
      const pkgPath = join(projectDir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg?.name) return pkg.name;
      }
    } catch { /* ignore */ }

    // 3. Directory basename
    const parts = projectDir.replace(/\/+$/, '').split('/');
    const basename = parts[parts.length - 1];
    if (basename) return basename;
  }

  // 4. Fallback
  return 'unknown project';
}

/**
 * Get the hooks directory path (where hook scripts live).
 */
export function getHooksDir(): string {
  return join(__dirname, '..');
}

/**
 * Get the local logs directory (project-local logs/).
 */
export function ensureLocalLogDir(): string {
  const logDir = 'logs';
  mkdirSync(logDir, { recursive: true });
  return logDir;
}
