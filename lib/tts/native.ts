/**
 * Native TTS provider using the platform's built-in speech engine.
 * - macOS: `say` command
 * - Windows: PowerShell System.Speech.Synthesis
 * - Linux: espeak
 * No API key required.
 */

import type { TTSProvider } from './types';
import { loadConfig } from '../config';
import { speakNative } from './playback';

export class NativeTTSProvider implements TTSProvider {
  name = 'native';

  isAvailable(): boolean {
    // Available on macOS, Windows, and Linux (if espeak is present)
    return process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux';
  }

  async speak(text: string): Promise<void> {
    const config = loadConfig();
    const voice = config.tts.native.voice;
    const rate = config.tts.native.rate;

    await speakNative(text, voice, rate);
  }
}
