/**
 * `npx claude-code-hooks-ui update [dir]`
 *
 * Update flow:
 * 1. Save current hooks.config.json to memory
 * 2. git pull --ff-only
 * 3. Deep-merge: new defaults as base, user's saved config overlaid (user wins)
 * 4. Run pending schema migrations
 * 5. bun install (deps may have changed)
 * 6. Re-merge settings template
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { banner, info, ok, err } from '../lib/logger.js';
import { resolveProjectPaths } from '../lib/platform.js';
import { readConfig, writeConfig, deepMerge } from '../lib/config-manager.js';
import { updateHooks, installDeps } from '../lib/installer.js';
import { mergeSettings } from '../lib/settings-merger.js';
import { runMigrations } from '../lib/migration-runner.js';

interface UpdateOptions {
  dir?: string;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  banner();

  const resolvedDir = resolve(options.dir || '.');
  if (!existsSync(resolvedDir)) {
    err(`Target directory does not exist: ${resolvedDir}`);
    process.exit(1);
  }

  const paths = resolveProjectPaths(resolvedDir);
  info(`Target project: ${paths.projectRoot}`);

  if (!existsSync(paths.hooksDir)) {
    err(`Hooks not installed at ${paths.hooksDir}`);
    err('Run "npx claude-code-hooks-ui init" first.');
    process.exit(1);
  }

  // 1. Save current user config
  info('Saving current config...');
  const savedConfig = readConfig(paths.configFile);

  // 2. Git pull
  updateHooks(paths.hooksDir);

  // 3. Deep merge: new defaults (from freshly pulled repo) as base, user config overlay
  info('Merging configuration (your customizations preserved)...');
  const newDefaults = readConfig(paths.configFile);
  const merged = deepMerge(newDefaults, savedConfig);
  writeConfig(paths.configFile, merged);
  ok('Config merged (user values preserved)');

  // 4. Run pending migrations
  runMigrations(paths.configFile);

  // 5. Install deps (may have changed)
  installDeps(paths.hooksDir);

  // 6. Re-merge settings template
  mergeSettings(paths.templateFile, paths.settingsFile);

  console.log('');
  ok('Update complete!');
  info('Restart your Claude Code session to pick up any changes.');
  console.log('');
}
