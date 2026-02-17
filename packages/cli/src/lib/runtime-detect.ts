/**
 * Detect whether required runtimes and tools are available.
 * Uses child_process.execFileSync to check tool availability.
 */

import { execFileSync } from 'node:child_process';

interface RuntimeInfo {
  name: string;
  available: boolean;
  version?: string;
}

function checkTool(name: string, versionArgs: string[] = ['--version']): RuntimeInfo {
  try {
    const output = execFileSync(name, versionArgs, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    // Extract version — take first line, strip common prefixes
    const version = output.split('\n')[0]
      .replace(/^.*?(\d+\.\d+\.\d+).*$/, '$1');
    return { name, available: true, version };
  } catch {
    return { name, available: false };
  }
}

export function detectBun(): RuntimeInfo {
  return checkTool('bun');
}

export function detectGit(): RuntimeInfo {
  return checkTool('git');
}

export function detectJq(): RuntimeInfo {
  return checkTool('jq');
}

export function detectNode(): RuntimeInfo {
  return checkTool('node');
}

export interface RuntimeReport {
  bun: RuntimeInfo;
  git: RuntimeInfo;
  jq: RuntimeInfo;
  node: RuntimeInfo;
}

export function detectAll(): RuntimeReport {
  return {
    bun: detectBun(),
    git: detectGit(),
    jq: detectJq(),
    node: detectNode(),
  };
}

/**
 * Check that hard prerequisites (bun, git) are met.
 * Returns list of missing tool names.
 */
export function checkPrerequisites(): string[] {
  const missing: string[] = [];
  if (!detectBun().available) missing.push('bun');
  if (!detectGit().available) missing.push('git');
  return missing;
}
