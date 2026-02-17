/**
 * Migration interface for hooks.config.json schema evolution.
 */

import type { JsonObject } from '../lib/config-manager.js';

export interface Migration {
  /** Sequential version number (1, 2, 3, ...) */
  version: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** Transform config from previous version to this version. Must be idempotent. */
  up(config: JsonObject): JsonObject;
}
