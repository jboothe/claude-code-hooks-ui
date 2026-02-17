#!/usr/bin/env bun
/**
 * Stop hook — most complex: transcript parsing, chat export, LLM completion messages, TTS.
 * Supports: --chat, --notify
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog, appendToDebugLog } from './lib/log';
import { ensureSessionLogDir, getProjectName } from './lib/constants';
import { extractRecentActivity } from './lib/transcript-parser';
import { loadConfig } from './lib/config';
import { resolveTTSProvider } from './lib/tts/resolver';
import { speakWithLock } from './lib/queue/tts-queue';
import { loadTemplates, pickAndRender } from './lib/templates/loader';
import { AnthropicLLM } from './lib/llm/anthropic';
import { OpenAILLM } from './lib/llm/openai';
import { logTTSActivity } from './lib/activity-log';
import type { StopHookInput } from './lib/types';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const DEBUG_LOG = 'logs/tts_debug.log';

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<StopHookInput>();

  const sessionId = input.session_id ?? '';
  const stopHookActive = input.stop_hook_active ?? false;

  // Log the event
  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'stop.json'), input);

  // Handle --chat switch
  if (flags.chat && input.transcript_path) {
    exportChat(input.transcript_path, logDir);
  }

  // Debug log
  appendToDebugLog(DEBUG_LOG, `Stop hook called: notify=${flags.notify}, stop_hook_active=${stopHookActive}`);

  if (flags.notify) {
    console.error(`Stop hook: --notify flag detected (stop_hook_active=${stopHookActive}), calling TTS`);
    await announceCompletion(input.transcript_path, sessionId);
  } else {
    console.error('Stop hook: --notify flag NOT set, skipping TTS');
  }
}

function exportChat(transcriptPath: string, logDir: string): void {
  if (!existsSync(transcriptPath)) return;
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const chatData: unknown[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try { chatData.push(JSON.parse(trimmed)); } catch { /* skip */ }
    }
    Bun.write(join(logDir, 'chat.json'), JSON.stringify(chatData, null, 2));
  } catch { /* fail silently */ }
}

async function announceCompletion(transcriptPath?: string, sessionId?: string): Promise<void> {
  try {
    const config = loadConfig();
    if (!config.tts.enabled || !config.tts.hookToggles.stop) {
      appendToDebugLog(DEBUG_LOG, 'Stop: TTS disabled by config toggle');
      return;
    }

    const provider = resolveTTSProvider();
    if (!provider) {
      appendToDebugLog(DEBUG_LOG, 'No TTS provider available');
      return;
    }

    let completionMessage: string | null = null;

    // Try to generate context-aware message from transcript
    if (transcriptPath && existsSync(transcriptPath)) {
      const activities = extractRecentActivity(transcriptPath, 3);
      if (activities.length) {
        completionMessage = generateTemplatedMessage(activities);
        appendToDebugLog(DEBUG_LOG, `Stop: Generated context-aware message from ${activities.length} activities`);
      }
    }

    // Fall back to LLM-generated or random message
    if (!completionMessage) {
      completionMessage = await getLLMCompletionMessage();
    }

    appendToDebugLog(DEBUG_LOG, `TTS: Speaking: '${completionMessage}'`);
    const ttsStart = Date.now();
    let ttsSuccess = true;
    let ttsError: string | undefined;
    try {
      await speakWithLock(provider, completionMessage);
      appendToDebugLog(DEBUG_LOG, 'TTS completed successfully');
    } catch (speakErr) {
      ttsSuccess = false;
      ttsError = String(speakErr);
      appendToDebugLog(DEBUG_LOG, `TTS error: ${speakErr}`);
    } finally {
      logTTSActivity({
        hookType: 'stop',
        sessionId: sessionId || 'unknown',
        agentName: null,
        agentType: null,
        message: completionMessage,
        provider: provider.name,
        durationMs: Date.now() - ttsStart,
        success: ttsSuccess,
        error: ttsError,
      });
    }
  } catch (err) {
    appendToDebugLog(DEBUG_LOG, `TTS error: ${err}`);
  }
}

function generateTemplatedMessage(activities: string[]): string {
  const templates = loadTemplates();
  const ttsConfig = loadConfig().tts;
  const includeName = Math.random() < ttsConfig.nameIncludeProbability;
  const projectName = getProjectName();
  const userName = ttsConfig.userName || 'there';

  if (!activities.length) {
    const templateArray = includeName
      ? templates.stop.noActivities.withName
      : templates.stop.noActivities.withoutName;
    return pickAndRender(templateArray, { projectName, userName });
  }

  if (activities.length === 1) {
    const templateArray = includeName
      ? templates.stop.withActivities.single.withName
      : templates.stop.withActivities.single.withoutName;
    return pickAndRender(templateArray, { projectName, userName, activity: activities[0] });
  }

  // Multiple activities
  const templateArray = includeName
    ? templates.stop.withActivities.multiple.withName
    : templates.stop.withActivities.multiple.withoutName;
  return pickAndRender(templateArray, {
    projectName,
    userName,
    lastActivity: activities[activities.length - 1],
    count: activities.length,
  });
}

async function getLLMCompletionMessage(): Promise<string> {
  const fallbackMessages = [
    'Work complete!',
    'All done!',
    'Task finished!',
    'Job complete!',
    'Ready for next task!',
  ];

  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const llm = new AnthropicLLM();
      const message = await llm.generateCompletionMessage();
      if (message) return message;
    } catch { /* fall through */ }
  }

  // Try OpenAI second
  if (process.env.OPENAI_API_KEY) {
    try {
      const llm = new OpenAILLM();
      const message = await llm.generateCompletionMessage();
      if (message) return message;
    } catch { /* fall through */ }
  }

  // Random fallback
  return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
}

main().catch(() => process.exit(0));
