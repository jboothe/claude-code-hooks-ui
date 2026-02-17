/**
 * OpenAI TTS provider.
 * Uses the gpt-4o-mini-tts model with streaming.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import type { TTSProvider } from './types';
import { loadConfig } from '../config';
import { playAudioFile } from './playback';

export class OpenAITTSProvider implements TTSProvider {
  name = 'openai';

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async speak(text: string): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const config = loadConfig();
    const { voice, model } = config.tts.openai;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    const tmpPath = join(tmpdir(), `hooks-tts-oai-${Date.now()}.mp3`);
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(tmpPath, arrayBuffer);

    try {
      await playAudioFile(tmpPath);
    } finally {
      try { unlinkSync(tmpPath); } catch { /* cleanup */ }
    }
  }
}
