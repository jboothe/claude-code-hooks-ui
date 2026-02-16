#!/usr/bin/env bun
/**
 * SubagentStop hook — transcript parsing + context-aware TTS.
 * Supports: --chat, --notify
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog, appendToDebugLog } from './lib/log';
import { ensureSessionLogDir, getProjectName } from './lib/constants';
import { extractSubagentContext } from './lib/transcript-parser';
import { loadConfig } from './lib/config';
import { resolveTTSProvider } from './lib/tts/resolver';
import { speakWithLock } from './lib/queue/tts-queue';
import { loadTemplates, pickAndRender } from './lib/templates/loader';
import { logTTSActivity } from './lib/activity-log';
import type { SubagentStopHookInput } from './lib/types';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

/** Friendly agent type names */
const AGENT_NAMES: Record<string, string> = {
  Explore: 'Explorer',
  Plan: 'Planner',
  Bash: 'Command runner',
  'general-purpose': 'General agent',
  'angular-frontend-expert': 'Angular expert',
  'angular-bootstrap-specialist': 'Bootstrap specialist',
  'angular-primeng-specialist': 'PrimeNG specialist',
  'angular-upgrade-specialist': 'Upgrade specialist',
  'dotnet-core-assistant': '.NET assistant',
  'codebase-documenter': 'Documentation agent',
  'docs-scraper': 'Docs scraper',
  'playwright-validator': 'Browser validator',
  AF_Angular_Designer: 'Angular designer',
  'claude-code-guide': 'Claude Code guide',
};

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<SubagentStopHookInput>();

  const sessionId = input.session_id ?? '';

  // Log the event
  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'subagent_stop.json'), input);

  // Handle --chat switch
  if (flags.chat && input.transcript_path) {
    exportChat(input.transcript_path, logDir);
  }

  // Debug log
  appendToDebugLog('logs/tts_debug.log', `SubagentStop hook called: notify=${flags.notify}`);

  if (flags.notify) {
    console.error('SubagentStop hook: --notify flag detected, calling TTS');
    await announceSubagentCompletion(input.transcript_path, sessionId);
  } else {
    console.error('SubagentStop hook: --notify flag NOT set, skipping TTS');
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
    const chatFile = join(logDir, 'chat.json');
    Bun.write(chatFile, JSON.stringify(chatData, null, 2));
  } catch { /* fail silently */ }
}

async function announceSubagentCompletion(transcriptPath?: string, sessionId?: string): Promise<void> {
  const debugLog = 'logs/tts_debug.log';

  try {
    const config = loadConfig();
    if (!config.tts.enabled || !config.tts.hookToggles.subagentStop) {
      appendToDebugLog(debugLog, 'SubagentStop: TTS disabled by config toggle');
      return;
    }

    const provider = resolveTTSProvider();
    if (!provider) {
      appendToDebugLog(debugLog, 'SubagentStop: No TTS provider available');
      return;
    }

    // Extract context from transcript
    let subagentType: string | null = null;
    let description: string | null = null;

    if (transcriptPath && existsSync(transcriptPath)) {
      const context = extractSubagentContext(transcriptPath);
      subagentType = context.subagent_type;
      description = context.description;
      appendToDebugLog(debugLog, `SubagentStop: Extracted context - type=${subagentType}, desc=${description}`);
    }

    // Generate message using templates
    const templates = loadTemplates();
    const friendlyName = AGENT_NAMES[subagentType ?? ''] ?? subagentType ?? 'Agent';
    const includeName = Math.random() < loadConfig().tts.nameIncludeProbability;
    const userName = (process.env.USER_NAME ?? '').trim() || 'there';
    const projectName = getProjectName();

    let ttsMessage: string;

    if (description) {
      const desc = description.trim().replace(/\.$/, '');
      const templateArray = includeName
        ? templates.subagentStop.withDescription.withName
        : templates.subagentStop.withDescription.withoutName;
      ttsMessage = pickAndRender(templateArray, {
        projectName,
        userName,
        agentName: friendlyName,
        description: desc,
      });
    } else {
      const templateArray = includeName
        ? templates.subagentStop.noDescription.withName
        : templates.subagentStop.noDescription.withoutName;
      ttsMessage = pickAndRender(templateArray, {
        projectName,
        userName,
        agentName: friendlyName,
      });
    }

    appendToDebugLog(debugLog, `SubagentStop TTS: '${ttsMessage}'`);
    const ttsStart = Date.now();
    let ttsSuccess = true;
    let ttsError: string | undefined;
    try {
      await speakWithLock(provider, ttsMessage);
      appendToDebugLog(debugLog, 'SubagentStop TTS completed successfully');
    } catch (speakErr) {
      ttsSuccess = false;
      ttsError = String(speakErr);
      appendToDebugLog(debugLog, `SubagentStop TTS error: ${speakErr}`);
    } finally {
      logTTSActivity({
        hookType: 'subagentStop',
        sessionId: sessionId || 'unknown',
        agentName: friendlyName,
        agentType: subagentType,
        message: ttsMessage,
        provider: provider.name,
        durationMs: Date.now() - ttsStart,
        success: ttsSuccess,
        error: ttsError,
      });
    }
  } catch (err) {
    appendToDebugLog(debugLog, `SubagentStop TTS error: ${err}`);
  }
}

main().catch(() => process.exit(0));
