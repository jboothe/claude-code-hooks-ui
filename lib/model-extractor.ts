/**
 * Model name extraction from Claude Code transcripts with optional caching.
 * Direct port of utils/model_extractor.py
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const ENABLE_CACHING = false;

/**
 * Extract model name from transcript with file-based caching.
 */
export function getModelFromTranscript(sessionId: string, transcriptPath: string, ttl = 60): string {
  const cacheDir = join(homedir(), '.claude', 'data', 'claude-model-cache');
  mkdirSync(cacheDir, { recursive: true });

  const cacheFile = join(cacheDir, `${sessionId}.json`);
  const currentTime = Date.now() / 1000;

  // Try cache
  if (ENABLE_CACHING && existsSync(cacheFile)) {
    try {
      const cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      const cacheAge = currentTime - (cacheData.timestamp ?? 0);
      if (cacheAge < ttl) {
        return cacheData.model ?? '';
      }
    } catch { /* cache corrupt, regenerate */ }
  }

  // Extract from transcript
  const modelName = extractModelFromTranscript(transcriptPath);

  // Save to cache
  if (ENABLE_CACHING) {
    try {
      writeFileSync(cacheFile, JSON.stringify({
        model: modelName,
        timestamp: currentTime,
        ttl,
      }));
    } catch { /* cache write failed, not critical */ }
  }

  return modelName;
}

/**
 * Extract model name by finding the most recent assistant message.
 */
function extractModelFromTranscript(transcriptPath: string): string {
  if (!existsSync(transcriptPath)) return '';

  try {
    const lines = readFileSync(transcriptPath, 'utf-8').split('\n');

    // Iterate in reverse to find most recent assistant message with model
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const entry = JSON.parse(line);
        if (entry.type === 'assistant' && entry.message?.model) {
          return entry.message.model;
        }
      } catch { /* skip invalid lines */ }
    }
  } catch { /* file read error */ }

  return '';
}
