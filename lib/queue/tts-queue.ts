/**
 * File-lock FIFO queue for sequential TTS playback.
 * Uses atomic file creation (wx flag) as a cross-process lock.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../config';
import type { TTSProvider } from '../tts/types';
import { normalizeTTSText } from '../tts/normalizer';

const LOCK_DIR = join(homedir(), '.claude', 'tts');
const LOCK_FILE = join(LOCK_DIR, 'queue.lock');

/**
 * Check if a PID is still alive.
 */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire the TTS lock. Returns true if acquired.
 */
function acquireLock(): boolean {
  mkdirSync(LOCK_DIR, { recursive: true });

  try {
    // Atomic file creation — fails if file already exists
    const fd = Bun.file(LOCK_FILE);
    writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
    return true;
  } catch {
    // File already exists — check if the holding process is still alive
    try {
      const content = readFileSync(LOCK_FILE, 'utf-8').trim();
      const holdingPid = parseInt(content, 10);

      if (isNaN(holdingPid) || !isPidAlive(holdingPid)) {
        // Stale lock — remove and try again
        try { unlinkSync(LOCK_FILE); } catch { /* race condition ok */ }
        try {
          writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
          return true;
        } catch {
          return false;
        }
      }
    } catch {
      // Can't read lock file — try to remove it
      try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
    }
    return false;
  }
}

/**
 * Release the TTS lock.
 */
function releaseLock(): void {
  try {
    // Only release if we own the lock
    if (existsSync(LOCK_FILE)) {
      const content = readFileSync(LOCK_FILE, 'utf-8').trim();
      if (parseInt(content, 10) === process.pid) {
        unlinkSync(LOCK_FILE);
      }
    }
  } catch { /* best effort */ }
}

/**
 * Speak with lock — waits for the queue, then speaks.
 */
export async function speakWithLock(provider: TTSProvider, text: string): Promise<void> {
  const normalized = normalizeTTSText(text);
  const config = loadConfig();
  if (!config.tts.queue.enabled) {
    // Queue disabled — speak directly
    await provider.speak(normalized);
    return;
  }

  const maxWaitMs = config.tts.queue.maxWaitMs;
  const startTime = Date.now();
  const pollIntervalMs = 200;

  // Try to acquire lock with polling
  while (!acquireLock()) {
    if (Date.now() - startTime > maxWaitMs) {
      // Safety valve — force acquire
      console.error('[hooks] TTS queue: max wait exceeded, force-acquiring lock');
      try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
      if (!acquireLock()) {
        // Last resort — speak without lock
        await provider.speak(normalized);
        return;
      }
      break;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  try {
    await provider.speak(normalized);
  } finally {
    releaseLock();
  }
}
