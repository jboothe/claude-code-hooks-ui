/**
 * TTS provider interface for Claude Code hooks.
 */

export interface TTSProvider {
  /** Provider name (e.g., "native", "elevenlabs") */
  name: string;

  /** Check if this provider is available (API key set, binary exists, etc.) */
  isAvailable(): boolean;

  /** Speak the given text. Resolves when playback is complete. */
  speak(text: string): Promise<void>;
}
