/**
 * UnrealSpeech TTS provider.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import type { TTSProvider } from './types';
import { loadConfig } from '../config';
import { playAudioFile } from './playback';

export class UnrealSpeechTTSProvider implements TTSProvider {
  name = 'unreal-speech';

  isAvailable(): boolean {
    return !!process.env.UNREAL_SPEECH_API_KEY;
  }

  async speak(text: string): Promise<void> {
    const apiKey = process.env.UNREAL_SPEECH_API_KEY!;
    const config = loadConfig();
    const endpoint = config.tts.unrealSpeech.endpoint;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Text: text,
        VoiceId: config.tts.unrealSpeech.voice,
        Bitrate: '192k',
        Speed: '0',
        Pitch: '1',
        Temperature: config.tts.unrealSpeech.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`UnrealSpeech API error: ${response.status}`);
    }

    const tmpPath = join(tmpdir(), `hooks-tts-us-${Date.now()}.mp3`);
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(tmpPath, arrayBuffer);

    try {
      await playAudioFile(tmpPath);
    } finally {
      try { unlinkSync(tmpPath); } catch { /* cleanup */ }
    }
  }
}
