#!/usr/bin/env bun
/**
 * SendEvent hook — sends hook events to the observability server.
 * Supports: --source-app, --event-type, --server-url, --add-chat, --summarize
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { getModelFromTranscript } from './lib/model-extractor';
import { generateEventSummary } from './lib/summarizer';
import { appendToDebugLog } from './lib/log';
import type { SendEventHookInput, ObservabilityEvent } from './lib/types';
import { existsSync, readFileSync } from 'fs';

async function sendEventToServer(
  eventData: ObservabilityEvent,
  serverUrl = 'http://localhost:4000/events',
): Promise<boolean> {
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Code-Hook/1.0',
      },
      body: JSON.stringify(eventData),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error(`Failed to send event: ${err}`);
    return false;
  }
}

async function main(): Promise<void> {
  const flags = parseCliFlags();

  if (!flags.sourceApp || !flags.eventType) {
    console.error('Required: --source-app and --event-type');
    process.exit(1);
  }

  // Debug logging for SubagentStop events
  if (flags.eventType === 'SubagentStop') {
    appendToDebugLog('logs/send_event_debug.log',
      `send_event.ts called for SubagentStop`);
    console.error(`send_event.ts: Processing ${flags.eventType} event`);
  }

  const input = await readStdinJson<SendEventHookInput>();

  // Extract model name from transcript
  const sessionId = (input.session_id as string) ?? 'unknown';
  const transcriptPath = (input.transcript_path as string) ?? '';
  let modelName = '';
  if (transcriptPath) {
    modelName = getModelFromTranscript(sessionId, transcriptPath);
  }

  // Prepare event data
  const eventData: ObservabilityEvent = {
    source_app: flags.sourceApp,
    session_id: sessionId,
    hook_event_type: flags.eventType,
    payload: input as unknown as Record<string, unknown>,
    timestamp: Date.now(),
    model_name: modelName,
  };

  // Handle --add-chat option
  if (flags.addChat && transcriptPath && existsSync(transcriptPath)) {
    try {
      const content = readFileSync(transcriptPath, 'utf-8');
      const chatData: Record<string, unknown>[] = [];
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          chatData.push(JSON.parse(trimmed));
        } catch { /* skip invalid lines */ }
      }
      eventData.chat = chatData;
    } catch (err) {
      console.error(`Failed to read transcript: ${err}`);
    }
  }

  // Generate summary if requested
  if (flags.summarize) {
    const summary = await generateEventSummary(eventData);
    if (summary) {
      eventData.summary = summary;
    }
  }

  // Send to server
  const serverUrl = flags.serverUrl ?? 'http://localhost:4000/events';
  await sendEventToServer(eventData, serverUrl);
}

main().catch(() => process.exit(0));
