/**
 * Load environment variables from the project-level .env file.
 *
 * Hooks run with CWD = .claude/hooks/, so Bun's auto .env loading
 * picks up the wrong directory. This module explicitly reads
 * $CLAUDE_PROJECT_DIR/.env and merges into process.env (without
 * overwriting vars already set in the environment).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

let loaded = false;

export function loadProjectEnv(): void {
  if (loaded) return;
  loaded = true;

  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (!projectDir) return;

  const envPath = join(projectDir, '.env');
  if (!existsSync(envPath)) return;

  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Don't overwrite existing env vars
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Non-fatal — fall back to whatever env is already set
  }
}
