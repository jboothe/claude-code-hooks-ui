/**
 * DeepSeek TTS provider with configurable endpoint.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import type { TTSProvider } from './types';
import { loadConfig } from '../config';
import { playAudioFile } from './playback';

export class DeepSeekTTSProvider implements TTSProvider {
  name = 'deepseek';

  isAvailable(): boolean {
    const config = loadConfig();
    return !!process.env.DEEPSEEK_API_KEY && !!config.tts.deepseek.endpoint;
  }

  async speak(text: string): Promise<void> {
    const apiKey = process.env.DEEPSEEK_API_KEY!;
    const config = loadConfig();
    const endpoint = config.tts.deepseek.endpoint;

    if (!endpoint) {
      throw new Error('DeepSeek TTS endpoint not configured in hooks.config.json');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek TTS API error: ${response.status}`);
    }

    const tmpPath = join(tmpdir(), `hooks-tts-ds-${Date.now()}.mp3`);
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(tmpPath, arrayBuffer);

    try {
      await playAudioFile(tmpPath);
    } finally {
      try { unlinkSync(tmpPath); } catch { /* cleanup */ }
    }
  }
}
