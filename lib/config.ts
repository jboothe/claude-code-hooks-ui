/**
 * Central config loader for hooks.config.json.
 * Reads user-editable config and deep-merges with defaults.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Full hooks config shape */
export interface HooksConfig {
  project: {
    name: string | null;
  };
  tts: {
    enabled: boolean;
    hookToggles: {
      stop: boolean;
      subagentStop: boolean;
      notification: boolean;
      sessionEnd: boolean;
    };
    userName: string;
    nameIncludeProbability: number;
    providerPriority: string[];
    native: { voice: string; rate: number };
    elevenlabs: { voiceId: string; modelId: string };
    openai: { voice: string; model: string };
    unrealSpeech: { endpoint: string; voice: string; temperature: number };
    deepseek: { endpoint: string };
    queue: { enabled: boolean; maxWaitMs: number };
    templateTone: string;
  };
  llm: {
    anthropic: { model: string; maxTokens: number; temperature: number };
    openai: { model: string; maxTokens: number; temperature: number };
  };
  templates: Record<string, unknown>;
  summarization: { maxWords: number; style: string };
  security: {
    dangerousPatterns: string[];
    protectedPaths: string[];
    allowedPaths: string[];
    deniedFilePatterns: string[];
  };
  guardrails: {
    enabled: boolean;
    sleep: {
      enabled: boolean;
      maxSeconds: number;
    };
    subagentRepeat: {
      enabled: boolean;
      maxLaunches: number;
    };
  };
  server: {
    port: number;
  };
}

/** Default config values */
export const DEFAULTS: HooksConfig = {
  project: { name: null },
  tts: {
    enabled: true,
    hookToggles: {
      stop: true,
      subagentStop: true,
      notification: true,
      sessionEnd: true,
    },
    userName: '',
    nameIncludeProbability: 0.3,
    providerPriority: ['native', 'elevenlabs', 'openai', 'unreal-speech', 'deepseek'],
    native: { voice: 'Samantha', rate: 180 },
    elevenlabs: { voiceId: 'XrExE9yKIg1WjnnlVkGX', modelId: 'eleven_turbo_v2_5' },
    openai: { voice: 'nova', model: 'gpt-4o-mini-tts' },
    // Lauren, Melody, Sierra, Scarlet, Luna, Hannah, 
    // Chloe (brittish), 
    unrealSpeech: { endpoint: 'https://api.v8.unrealspeech.com/stream', voice: 'Chloe', temperature: 0.25 },
    deepseek: { endpoint: '' },
    queue: { enabled: true, maxWaitMs: 30000 },
    templateTone: 'default',
  },
  llm: {
    anthropic: { model: 'claude-haiku-4-5-20251001', maxTokens: 100, temperature: 0.7 },
    openai: { model: 'gpt-4o-mini', maxTokens: 100, temperature: 0.7 },
  },
  templates: {},
  summarization: { maxWords: 15, style: 'concise' },
  security: {
    dangerousPatterns: [
      '\\brm\\s+.*-[a-z]*r[a-z]*f',
      '\\brm\\s+.*-[a-z]*f[a-z]*r',
      '\\brm\\s+--recursive\\s+--force',
      '\\brm\\s+--force\\s+--recursive',
      '\\brm\\s+-r\\s+.*-f',
      '\\brm\\s+-f\\s+.*-r',
    ],
    protectedPaths: ['/', '/*', '~', '~/', '$HOME', '..', '*', '.'],
    allowedPaths: ['trees/'],
    deniedFilePatterns: ['.env'],
  },
  guardrails: {
    enabled: true,
    sleep: {
      enabled: true,
      maxSeconds: 120,
    },
    subagentRepeat: {
      enabled: true,
      maxLaunches: 3,
    },
  },
  server: { port: 3455 },
};

let cachedConfig: HooksConfig | null = null;

/**
 * Deep merge source into target, returning a new object.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv && typeof sv === 'object' && !Array.isArray(sv) &&
      tv && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      );
    } else if (sv !== undefined) {
      (result as Record<string, unknown>)[key as string] = sv;
    }
  }
  return result;
}

/**
 * Load hooks config, merging user overrides with defaults.
 * Caches the result for the process lifetime.
 */
export function loadConfig(): HooksConfig {
  if (cachedConfig) return cachedConfig;

  let userConfig: Partial<HooksConfig> = {};

  try {
    const configPath = join(__dirname, '..', 'hooks.config.json');
    if (existsSync(configPath)) {
      userConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // Invalid config — use defaults
    console.error('[hooks] Warning: Failed to parse hooks.config.json, using defaults');
  }

  cachedConfig = deepMerge(DEFAULTS, userConfig);

  // Validate model strings
  const { llm } = cachedConfig;
  if (llm.anthropic.model && llm.anthropic.model.length < 5) {
    console.error(`[hooks] Warning: Anthropic model "${llm.anthropic.model}" looks suspiciously short`);
  }
  if (llm.openai.model && llm.openai.model.length < 3) {
    console.error(`[hooks] Warning: OpenAI model "${llm.openai.model}" looks suspiciously short`);
  }

  return cachedConfig;
}

/**
 * Reset the config cache (for testing).
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
