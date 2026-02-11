#!/usr/bin/env bun
/**
 * SessionStart hook — logs session start, optionally outputs context to stdout.
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureSessionLogDir } from './lib/constants';
import type { SessionStartHookInput } from './lib/types';
import { join } from 'path';

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<SessionStartHookInput>();

  const sessionId = input.session_id ?? 'unknown';

  // Log session start
  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'session_start.json'), input);

  // Optionally add context
  if (flags.addContext) {
    const additionalContext = getAdditionalContext(input.source);
    if (additionalContext) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext,
        },
      };
      console.log(JSON.stringify(output));
    }
  }
}

function getAdditionalContext(_source: string): string | null {
  // Placeholder for project-specific context loading
  return null;
}

main().catch(() => process.exit(0));
