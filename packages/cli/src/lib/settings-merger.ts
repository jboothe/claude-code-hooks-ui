/**
 * Merge hook registrations from settings.template.json into settings.local.json.
 * Existing hook entries in settings.local.json take precedence.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { info, ok, warn } from './logger.js';
import { deepMerge, type JsonObject } from './config-manager.js';

function readJsonFile(path: string): JsonObject {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as JsonObject;
  } catch {
    return {};
  }
}

/**
 * Merge settings.template.json hooks into settings.local.json.
 * Template hooks are the base; existing user hooks overlay on top (user wins).
 */
export function mergeSettings(templatePath: string, settingsPath: string): void {
  if (!existsSync(templatePath)) {
    warn(`Template not found at ${templatePath} — skipping settings merge.`);
    return;
  }

  // Ensure .claude directory exists
  mkdirSync(dirname(settingsPath), { recursive: true });

  const template = readJsonFile(templatePath);
  const templateHooks = template.hooks as JsonObject | undefined;

  if (!templateHooks) {
    warn('Template has no "hooks" key — skipping settings merge.');
    return;
  }

  if (!existsSync(settingsPath)) {
    // No existing settings — create from template (hooks section only)
    info(`Creating ${settingsPath} from template...`);
    writeFileSync(settingsPath, JSON.stringify({ hooks: templateHooks }, null, 2) + '\n', 'utf-8');
    ok('Settings created');
    return;
  }

  // Existing settings — merge hooks
  info('Merging hook registrations into existing settings...');
  const existing = readJsonFile(settingsPath);
  const existingHooks = (existing.hooks || {}) as JsonObject;

  // Template hooks as base, existing hooks overlay
  const mergedHooks = deepMerge(templateHooks, existingHooks);
  existing.hooks = mergedHooks;

  writeFileSync(settingsPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  ok('Hook registrations merged (existing settings preserved)');
}
