/**
 * Read, write, and deep-merge hooks.config.json.
 * Mirrors the deepMerge logic from .claude/hooks/lib/config.ts.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/**
 * Deep merge source into target, returning a new object.
 * Arrays are replaced (not concatenated). Source values win for primitives.
 */
export function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  const result: JsonObject = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv && typeof sv === 'object' && !Array.isArray(sv) &&
      tv && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as JsonObject, sv as JsonObject);
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}

/**
 * Read hooks.config.json from disk. Returns empty object if missing or invalid.
 */
export function readConfig(configPath: string): JsonObject {
  try {
    if (!existsSync(configPath)) return {};
    return JSON.parse(readFileSync(configPath, 'utf-8')) as JsonObject;
  } catch {
    return {};
  }
}

/**
 * Write hooks.config.json to disk (pretty-printed).
 */
export function writeConfig(configPath: string, config: JsonObject): void {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Set a nested key in a config object.
 * e.g., setConfigValue(cfg, 'server.port', 4000)
 */
export function setConfigValue(config: JsonObject, dotPath: string, value: JsonValue): JsonObject {
  const keys = dotPath.split('.');
  const result: JsonObject = { ...config };
  let current: JsonObject = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as JsonObject) };
    }
    current = current[key] as JsonObject;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Get a nested value from config by dot path.
 */
export function getConfigValue(config: JsonObject, dotPath: string): JsonValue | undefined {
  const keys = dotPath.split('.');
  let current: JsonValue = config;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as JsonObject)[key];
  }
  return current;
}
