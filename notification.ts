#!/usr/bin/env bun
/**
 * Notification hook — logs notification events, optional TTS.
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureSessionLogDir, getProjectName } from './lib/constants';
import { loadConfig } from './lib/config';
import { resolveTTSProvider } from './lib/tts/resolver';
import { speakWithLock } from './lib/queue/tts-queue';
import { loadTemplates, renderTemplate } from './lib/templates/loader';
import type { NotificationHookInput } from './lib/types';
import { join } from 'path';

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<NotificationHookInput>();

  const sessionId = input.session_id ?? 'unknown';
  const message = input.message ?? '';

  // Log the notification
  const logDir = ensureSessionLogDir(sessionId);
  appendToJsonLog(join(logDir, 'notification.json'), input);

  console.error(`Notification hook called with message: '${message}'`);

  if (flags.notify) {
    // Skip TTS for the generic "waiting for input" message
    if (message === 'Claude is waiting for your input') {
      console.error('Skipping TTS for generic "waiting for input" message');
    } else {
      console.error('Notification hook: --notify flag detected, calling TTS');
      await announceNotification();
    }
  } else {
    console.error('Notification hook: --notify flag NOT set, skipping TTS');
  }
}

async function announceNotification(): Promise<void> {
  try {
    const config = loadConfig();
    if (!config.tts.enabled || !config.tts.hookToggles.notification) {
      console.error('Notification: TTS disabled by config toggle');
      return;
    }

    const provider = resolveTTSProvider();
    if (!provider) {
      console.error('No TTS provider available');
      return;
    }

    const userName = (process.env.USER_NAME ?? '').trim();
    const includeName = userName && Math.random() < config.tts.nameIncludeProbability;

    const templates = loadTemplates();
    const template = includeName
      ? templates.notification.withName
      : templates.notification.withoutName;

    const ttsMessage = renderTemplate(template, {
      projectName: getProjectName(),
      userName,
    });

    console.error(`TTS: Speaking: '${ttsMessage}'`);
    await speakWithLock(provider, ttsMessage);
    console.error('TTS completed successfully');
  } catch (err) {
    console.error(`TTS error: ${err}`);
  }
}

main().catch(() => process.exit(0));
