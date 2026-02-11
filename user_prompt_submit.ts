#!/usr/bin/env bun
/**
 * UserPromptSubmit hook — logs prompts, manages sessions, optional agent naming.
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureLocalLogDir } from './lib/constants';
import { AnthropicLLM } from './lib/llm/anthropic';
import type { UserPromptSubmitHookInput } from './lib/types';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<UserPromptSubmitHookInput>();

  const sessionId = input.session_id ?? 'unknown';
  const prompt = input.prompt ?? '';

  // Log the user prompt
  const logDir = ensureLocalLogDir();
  appendToJsonLog(join(logDir, 'user_prompt_submit.json'), input);

  // Manage session data
  if (flags.storeLastPrompt || flags.nameAgent) {
    await manageSessionData(sessionId, prompt, flags.nameAgent ?? false);
  }

  // Validate prompt if requested
  if (flags.validate && !flags.logOnly) {
    const [isValid, reason] = validatePrompt(prompt);
    if (!isValid) {
      console.error(`Prompt blocked: ${reason}`);
      process.exit(2);
    }
  }
}

async function manageSessionData(sessionId: string, prompt: string, nameAgent: boolean): Promise<void> {
  const sessionsDir = join('.claude', 'data', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });

  const sessionFile = join(sessionsDir, `${sessionId}.json`);

  let sessionData: Record<string, unknown>;
  if (existsSync(sessionFile)) {
    try {
      sessionData = JSON.parse(readFileSync(sessionFile, 'utf-8'));
    } catch {
      sessionData = { session_id: sessionId, prompts: [] };
    }
  } else {
    sessionData = { session_id: sessionId, prompts: [] };
  }

  (sessionData.prompts as string[]).push(prompt);

  // Generate agent name if requested and not already present
  if (nameAgent && !sessionData.agent_name) {
    try {
      const llm = new AnthropicLLM();
      const agentName = await llm.generateAgentName();
      if (agentName) {
        sessionData.agent_name = agentName;
      }
    } catch { /* agent naming is non-critical */ }
  }

  try {
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
  } catch { /* write failure is non-critical */ }
}

function validatePrompt(prompt: string): [boolean, string | null] {
  // Extensible validation rules — currently empty (matches Python behavior)
  const blockedPatterns: Array<[string, string]> = [];

  const promptLower = prompt.toLowerCase();
  for (const [pattern, reason] of blockedPatterns) {
    if (promptLower.includes(pattern.toLowerCase())) {
      return [false, reason];
    }
  }

  return [true, null];
}

main().catch(() => process.exit(0));
