/**
 * Logging utility for Claude Code hooks.
 * Provides an append-to-JSON-array pattern used by all hooks.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Append an entry to a JSON log file (array of objects).
 * Creates the file and parent directories if they don't exist.
 * Handles corrupt/empty files gracefully.
 */
export function appendToJsonLog(logPath: string, entry: unknown): void {
  // Ensure parent directory exists
  mkdirSync(dirname(logPath), { recursive: true });

  // Read existing data or initialize empty array
  let logData: unknown[] = [];
  if (existsSync(logPath)) {
    try {
      const raw = readFileSync(logPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        logData = parsed;
      }
    } catch {
      // Corrupt file — start fresh
      logData = [];
    }
  }

  logData.push(entry);
  writeFileSync(logPath, JSON.stringify(logData, null, 2));
}

/**
 * Append a line to a plain text debug log.
 */
export function appendToDebugLog(logPath: string, message: string): void {
  mkdirSync(dirname(logPath), { recursive: true });
  const line = `${new Date().toISOString()} - ${message}\n`;
  const { appendFileSync } = require('fs');
  appendFileSync(logPath, line);
}
