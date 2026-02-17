/**
 * Run pending schema migrations on hooks.config.json.
 *
 * - Reads current schemaVersion (default 0 if missing)
 * - Runs migrations whose version > current, in ascending order
 * - Each migration is idempotent
 * - Updates schemaVersion after each migration
 */

import { info, ok, dim } from './logger.js';
import { readConfig, writeConfig, type JsonObject } from './config-manager.js';
import { migrations } from '../migrations/index.js';

/**
 * Run all pending migrations on the config file at the given path.
 * Returns the number of migrations applied.
 */
export function runMigrations(configPath: string): number {
  let config = readConfig(configPath);
  const currentVersion = (typeof config.schemaVersion === 'number')
    ? config.schemaVersion
    : 0;

  const pending = migrations.filter(m => m.version > currentVersion);

  if (pending.length === 0) {
    dim('  Schema is up to date (v' + currentVersion + ')');
    return 0;
  }

  info(`Running ${pending.length} schema migration(s)...`);

  let applied = 0;
  for (const migration of pending) {
    dim(`  → v${migration.version}: ${migration.description}`);
    config = migration.up(config);
    config.schemaVersion = migration.version;
    applied++;
  }

  writeConfig(configPath, config);
  ok(`Schema migrated to v${config.schemaVersion}`);

  return applied;
}

/**
 * Get the current schema version from a config file.
 */
export function getSchemaVersion(configPath: string): number {
  const config = readConfig(configPath);
  return typeof config.schemaVersion === 'number' ? config.schemaVersion : 0;
}

/**
 * Get the latest schema version defined by migrations.
 */
export function getLatestVersion(): number {
  return migrations.length > 0 ? migrations[migrations.length - 1].version : 0;
}
