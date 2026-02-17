/**
 * Migration 001: Add schemaVersion field and normalize server config.
 *
 * - Adds schemaVersion: 1 if missing
 * - Ensures server.port exists with default 3455
 */

import type { Migration } from './types.js';
import type { JsonObject } from '../lib/config-manager.js';

const migration: Migration = {
  version: 1,
  description: 'Add schemaVersion field and normalize server config',

  up(config: JsonObject): JsonObject {
    const result = { ...config };

    // Set schema version
    result.schemaVersion = 1;

    // Ensure server config exists with port default
    if (!result.server || typeof result.server !== 'object' || Array.isArray(result.server)) {
      result.server = { port: 3455 };
    } else {
      const server = { ...(result.server as JsonObject) };
      if (server.port === undefined || server.port === null) {
        server.port = 3455;
      }
      result.server = server;
    }

    return result;
  },
};

export default migration;
