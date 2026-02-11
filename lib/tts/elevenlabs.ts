/**
 * ElevenLabs TTS provider.
 * Falls back to native `say` on quota exceeded.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import type { TTSProvider } from './types';
import { loadConfig } from '../config';
import { NativeTTSProvider } from './native';

export class ElevenLabsTTSProvider implements TTSProvider {
  name = 'elevenlabs';

  isAvailable(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
  }

  async speak(text: string): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY!;
    const config = loadConfig();
    const { voiceId, modelId } = config.tts.elevenlabs;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: { stability: 0.5, similarity_boost: 0.5 },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        // Check for quota exceeded
        if (errorText.includes('quota_exceeded') || errorText.toLowerCase().includes('credits remaining')) {
          console.error('[hooks] ElevenLabs quota exceeded, falling back to native TTS');
          const native = new NativeTTSProvider();
          if (native.isAvailable()) {
            await native.speak(text);
          }
          return;
        }
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      // Write MP3 to temp file and play with afplay
      const tmpPath = join(tmpdir(), `hooks-tts-${Date.now()}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      await Bun.write(tmpPath, arrayBuffer);

      try {
        const proc = Bun.spawn(['afplay', tmpPath], { stdout: 'inherit', stderr: 'inherit' });
        await proc.exited;
      } finally {
        try { unlinkSync(tmpPath); } catch { /* cleanup best effort */ }
      }
    } catch (err) {
      // General fallback to native
      console.error(`[hooks] ElevenLabs error: ${err}, falling back to native TTS`);
      const native = new NativeTTSProvider();
      if (native.isAvailable()) {
        await native.speak(text);
      }
    }
  }
}
