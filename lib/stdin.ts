/**
 * Stdin reading and CLI flag parsing utilities for Claude Code hooks.
 */

import type { CliFlags } from './types';

/**
 * Read and parse JSON from stdin using Bun's stream API.
 */
export async function readStdinJson<T = Record<string, unknown>>(): Promise<T> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(text) as T;
}

/**
 * Parse CLI flags from process.argv.
 * Supports --flag (boolean) and --key value (string) patterns.
 */
export function parseCliFlags(): CliFlags {
  const args = process.argv.slice(2);
  const flags: CliFlags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--chat':
        flags.chat = true;
        break;
      case '--notify':
        flags.notify = true;
        break;
      case '--add-context':
        flags.addContext = true;
        break;
      case '--announce':
        flags.announce = true;
        break;
      case '--save-stats':
        flags.saveStats = true;
        break;
      case '--backup':
        flags.backup = true;
        break;
      case '--save-handoff':
        flags.saveHandoff = true;
        break;
      case '--verbose':
        flags.verbose = true;
        break;
      case '--validate':
        flags.validate = true;
        break;
      case '--log-only':
        flags.logOnly = true;
        break;
      case '--store-last-prompt':
        flags.storeLastPrompt = true;
        break;
      case '--name-agent':
        flags.nameAgent = true;
        break;
      case '--add-chat':
        flags.addChat = true;
        break;
      case '--summarize':
        flags.summarize = true;
        break;
      case '--source-app':
        flags.sourceApp = args[++i];
        break;
      case '--event-type':
        flags.eventType = args[++i];
        break;
      case '--server-url':
        flags.serverUrl = args[++i];
        break;
    }
  }

  return flags;
}
