/**
 * TTS provider resolver.
 * Selects the best available provider based on config priority.
 */

import { loadProjectEnv } from '../env';
import type { TTSProvider } from './types';
import { NativeTTSProvider } from './native';
import { ElevenLabsTTSProvider } from './elevenlabs';
import { OpenAITTSProvider } from './openai';
import { UnrealSpeechTTSProvider } from './unreal-speech';
import { DeepSeekTTSProvider } from './deepseek';
import { loadConfig } from '../config';

// Ensure project .env is loaded before checking provider availability
loadProjectEnv();

/** Map of provider name to constructor */
const PROVIDERS: Record<string, () => TTSProvider> = {
  native: () => new NativeTTSProvider(),
  elevenlabs: () => new ElevenLabsTTSProvider(),
  openai: () => new OpenAITTSProvider(),
  'unreal-speech': () => new UnrealSpeechTTSProvider(),
  deepseek: () => new DeepSeekTTSProvider(),
};

/**
 * Resolve the best available TTS provider based on config priority.
 * Returns null if no provider is available.
 */
export function resolveTTSProvider(): TTSProvider | null {
  const config = loadConfig();
  const priority = config.tts.providerPriority;

  for (const name of priority) {
    const factory = PROVIDERS[name];
    if (!factory) continue;

    const provider = factory();
    if (provider.isAvailable()) {
      return provider;
    }
  }

  return null;
}

/**
 * Get all providers with their availability status.
 */
export function getAllProviders(): Array<{ name: string; available: boolean }> {
  return Object.entries(PROVIDERS).map(([name, factory]) => {
    const provider = factory();
    return { name, available: provider.isAvailable() };
  });
}
