/**
 * Native macOS TTS provider using the `say` command.
 * Default provider — no API key required.
 */

import type { TTSProvider } from './types';
import { loadConfig } from '../config';

export class NativeTTSProvider implements TTSProvider {
  name = 'native';

  isAvailable(): boolean {
    // Available on macOS only
    return process.platform === 'darwin';
  }

  async speak(text: string): Promise<void> {
    const config = loadConfig();
    const voice = config.tts.native.voice;
    const rate = String(config.tts.native.rate);

    const proc = Bun.spawn(['say', '-v', voice, '-r', rate, text], {
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`say command exited with code ${exitCode}`);
    }
  }
}
