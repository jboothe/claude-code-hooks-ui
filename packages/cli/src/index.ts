#!/usr/bin/env node

/**
 * claude-code-hooks-ui CLI
 *
 * Usage:
 *   npx claude-code-hooks-ui init [dir] [--port N] [--no-prompts]
 *   npx claude-code-hooks-ui update [dir]
 *   npx claude-code-hooks-ui status [dir]
 *   npx claude-code-hooks-ui --help
 */

import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { err } from './lib/logger.js';

const HELP = `
claude-code-hooks-ui — CLI installer for Claude Code hooks manager

Usage:
  npx claude-code-hooks-ui <command> [options]

Commands:
  init [dir]      Install hooks into a project
  update [dir]    Pull latest hooks and merge config
  status [dir]    Show installation status and config summary

Options:
  --port <N>      Set server port (init only, default: 3455)
  --no-prompts    Skip interactive prompts, use defaults (init only)
  --help, -h      Show this help message

Examples:
  npx claude-code-hooks-ui init
  npx claude-code-hooks-ui init /path/to/project --port 4000
  npx claude-code-hooks-ui init . --no-prompts
  npx claude-code-hooks-ui update
  npx claude-code-hooks-ui status
`;

function parseArgs(argv: string[]): { command: string; dir?: string; port?: number; noPrompts: boolean; help: boolean } {
  const args = argv.slice(2); // skip node + script
  let command = '';
  let dir: string | undefined;
  let port: number | undefined;
  let noPrompts = false;
  let help = false;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
      i++;
    } else if (arg === '--no-prompts') {
      noPrompts = true;
      i++;
    } else if (arg === '--port') {
      const next = args[i + 1];
      if (!next || isNaN(parseInt(next, 10))) {
        err('--port requires a numeric argument');
        process.exit(1);
      }
      port = parseInt(next, 10);
      if (port < 1024 || port > 65535) {
        err('Port must be between 1024 and 65535');
        process.exit(1);
      }
      i += 2;
    } else if (!command) {
      command = arg;
      i++;
    } else if (!dir) {
      dir = arg;
      i++;
    } else {
      i++;
    }
  }

  return { command, dir, port, noPrompts, help };
}

async function main(): Promise<void> {
  const { command, dir, port, noPrompts, help } = parseArgs(process.argv);

  if (help || !command) {
    console.log(HELP);
    process.exit(help ? 0 : 1);
  }

  switch (command) {
    case 'init':
      await initCommand({ dir, port, noPrompts });
      break;

    case 'update':
      await updateCommand({ dir });
      break;

    case 'status':
      await statusCommand({ dir });
      break;

    default:
      err(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((error: Error) => {
  err(error.message);
  process.exit(1);
});
