#!/usr/bin/env bun
/**
 * PostToolUse hook — logs tool use events.
 * Simplest hook: just reads stdin and appends to session log.
 */

import { readStdinJson } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureSessionLogDir } from './lib/constants';
import type { ToolUseHookInput } from './lib/types';
import { join } from 'path';

async function main(): Promise<void> {
  const input = await readStdinJson<ToolUseHookInput>();
  const sessionId = input.session_id ?? 'unknown';

  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'post_tool_use.json'), input);
}

main().catch(() => process.exit(0));
