/**
 * TTS Activity Log — append-only log of all TTS communications.
 * Shared across all hooks and the web server test harness.
 */

import { appendToJsonLog } from './log';
import type { TTSActivityEntry } from './types';

const ACTIVITY_LOG_PATH = 'logs/tts_activity.json';

export function logTTSActivity(entry: Omit<TTSActivityEntry, 'id' | 'timestamp'>): void {
  const timestamp = new Date().toISOString();
  const randomHex = Math.random().toString(16).slice(2, 6);
  const id = `${Date.now()}-${entry.hookType}-${randomHex}`;
  const fullEntry: TTSActivityEntry = { id, timestamp, ...entry };
  appendToJsonLog(ACTIVITY_LOG_PATH, fullEntry);
}

export { ACTIVITY_LOG_PATH };
