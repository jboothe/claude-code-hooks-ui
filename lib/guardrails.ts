/**
 * Guardrails — session-scoped state tracking for hook safety checks.
 *
 * State files: ~/.claude/hooks/guardrails/{sessionId}.json
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const GUARDRAILS_DIR = join(homedir(), '.claude', 'hooks', 'guardrails');

interface GuardrailState {
  subagentCounts: Record<string, number>;
}

function stateFilePath(sessionId: string): string {
  return join(GUARDRAILS_DIR, `${sessionId}.json`);
}

function readState(sessionId: string): GuardrailState {
  try {
    const raw = readFileSync(stateFilePath(sessionId), 'utf-8');
    return JSON.parse(raw) as GuardrailState;
  } catch {
    return { subagentCounts: {} };
  }
}

function writeState(sessionId: string, state: GuardrailState): void {
  mkdirSync(GUARDRAILS_DIR, { recursive: true });
  writeFileSync(stateFilePath(sessionId), JSON.stringify(state, null, 2));
}

/** Get the current launch count for a subagent type in this session. */
export function getSubagentCount(sessionId: string, subagentType: string): number {
  const state = readState(sessionId);
  return state.subagentCounts[subagentType] ?? 0;
}

/** Increment and persist the launch count for a subagent type. */
export function incrementSubagentCount(sessionId: string, subagentType: string): number {
  const state = readState(sessionId);
  const newCount = (state.subagentCounts[subagentType] ?? 0) + 1;
  state.subagentCounts[subagentType] = newCount;
  writeState(sessionId, state);
  return newCount;
}

/**
 * Parse `sleep N` from a Bash command string.
 * Handles: `sleep 300`, `sleep 300 && ...`, `sleep 5m`, `sleep 1h`, etc.
 * Returns the duration in seconds, or null if no sleep found.
 */
export function parseSleepSeconds(command: string): number | null {
  const match = command.match(/\bsleep\s+(\d+(?:\.\d+)?)\s*([smhd]?)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() ?? '';

  switch (unit) {
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default:  return value; // seconds (or no unit)
  }
}
