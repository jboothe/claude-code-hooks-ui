/**
 * Transcript parser utility for extracting context from Claude Code conversations.
 * Used by stop hooks to generate context-aware TTS messages.
 *
 * Direct port of utils/transcript_parser.py
 */

import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';
import type { SubagentContext } from './types';

/** A parsed JSONL message entry */
type TranscriptMessage = Record<string, unknown>;

/**
 * Parse a JSONL transcript file into a list of message objects.
 */
export function parseTranscript(transcriptPath: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        messages.push(JSON.parse(trimmed));
      } catch { /* skip invalid lines */ }
    }
  } catch { /* file not found or read error */ }
  return messages;
}

/**
 * Extract the subagent type and task description from a transcript.
 * Looks for the most recent Task tool call.
 */
export function extractSubagentContext(transcriptPath: string): SubagentContext {
  const result: SubagentContext = {
    subagent_type: null,
    description: null,
    prompt: null,
  };

  const messages = parseTranscript(transcriptPath);

  // Search backwards for the Task tool call
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type !== 'assistant') continue;

    const messageContent = msg.message as Record<string, unknown> | undefined;
    const contentBlocks = messageContent?.content as Array<Record<string, unknown>> | undefined;
    if (!contentBlocks) continue;

    for (const block of contentBlocks) {
      if (block.type === 'tool_use' && block.name === 'Task') {
        const input = block.input as Record<string, unknown> | undefined;
        if (input) {
          result.subagent_type = (input.subagent_type as string) ?? null;
          result.description = (input.description as string) ?? null;
          const prompt = (input.prompt as string) ?? '';
          result.prompt = prompt.slice(0, 200);
        }
        return result;
      }
    }
  }

  return result;
}

/**
 * Extract a summary of recent tool activity from the transcript.
 */
export function extractRecentActivity(transcriptPath: string, maxItems = 5): string[] {
  const activities: string[] = [];
  const messages = parseTranscript(transcriptPath);

  for (let i = messages.length - 1; i >= 0; i--) {
    if (activities.length >= maxItems) break;

    const msg = messages[i];
    if (msg.type !== 'assistant') continue;

    const messageContent = msg.message as Record<string, unknown> | undefined;
    const contentBlocks = messageContent?.content as Array<Record<string, unknown>> | undefined;
    if (!contentBlocks) continue;

    for (const block of contentBlocks) {
      if (block.type === 'tool_use') {
        const toolName = block.name as string;
        const input = block.input as Record<string, unknown>;
        const activity = describeToolUse(toolName, input);
        if (activity) {
          activities.push(activity);
          if (activities.length >= maxItems) break;
        }
      }
    }
  }

  return activities.reverse(); // chronological order
}

/**
 * Generate a brief description of a tool use.
 */
function describeToolUse(toolName: string, input: Record<string, unknown>): string | null {
  switch (toolName) {
    case 'Bash': {
      const cmd = ((input.command as string) ?? '').slice(0, 50);
      return `ran command: ${cmd}`;
    }
    case 'Read': {
      const path = basename((input.file_path as string) ?? '');
      return `read ${path}`;
    }
    case 'Write': {
      const path = basename((input.file_path as string) ?? '');
      return `wrote ${path}`;
    }
    case 'Edit': {
      const path = basename((input.file_path as string) ?? '');
      return `edited ${path}`;
    }
    case 'Glob': {
      const pattern = (input.pattern as string) ?? '';
      return `searched for ${pattern}`;
    }
    case 'Grep': {
      const pattern = ((input.pattern as string) ?? '').slice(0, 30);
      return `searched for '${pattern}'`;
    }
    case 'Task': {
      const subagent = (input.subagent_type as string) ?? 'agent';
      const desc = (input.description as string) ?? '';
      return `launched ${subagent}: ${desc}`;
    }
    case 'TodoWrite':
      return 'updated task list';
    default:
      return null;
  }
}

/** Friendly display names for subagent types */
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

/**
 * Generate a context-aware completion message for a subagent.
 */
export function generateSubagentCompletionMessage(
  subagentType: string | null,
  description: string | null,
  userName = 'there',
  nameProbability = 0.3,
  projectName?: string,
): string {
  const includeName = Math.random() < nameProbability;
  const friendlyName = AGENT_NAMES[subagentType ?? ''] ?? subagentType ?? 'Agent';
  const prefix = projectName ? `${projectName}: ` : '';

  if (description) {
    const desc = description.trim().replace(/\.$/, '');
    const templates = includeName
      ? [
          `${prefix}Hey ${userName}, ${friendlyName} finished ${desc}.`,
          `${prefix}${userName}, ${friendlyName} completed ${desc}.`,
          `${prefix}Done, ${userName}. ${friendlyName} finished ${desc}.`,
        ]
      : [
          `${prefix}${friendlyName} finished ${desc}.`,
          `${prefix}${friendlyName} completed ${desc}.`,
          `${prefix}Done. ${friendlyName} finished ${desc}.`,
          `${prefix}${friendlyName} done with ${desc}.`,
        ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  const templates = includeName
    ? [
        `${prefix}Hey ${userName}, ${friendlyName} is done.`,
        `${prefix}${userName}, ${friendlyName} finished.`,
        `${prefix}Done, ${userName}. ${friendlyName} completed its task.`,
      ]
    : [
        `${prefix}${friendlyName} is done.`,
        `${prefix}${friendlyName} finished.`,
        `${prefix}${friendlyName} completed its task.`,
      ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a context-aware completion message for the main agent.
 */
export function generateMainCompletionMessage(
  activities: string[],
  userName = 'there',
  nameProbability = 0.3,
  projectName?: string,
): string {
  const includeName = Math.random() < nameProbability;
  const prefix = projectName ? `${projectName}: ` : '';

  if (!activities.length) {
    const templates = includeName
      ? [
          `${prefix}Ready when you are, ${userName}.`,
          `${prefix}All done, ${userName}.`,
          `${prefix}${userName}, I'm ready for the next task.`,
        ]
      : [
          `${prefix}Ready for the next task.`,
          `${prefix}All done.`,
          `${prefix}Task complete.`,
        ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  if (activities.length === 1) {
    const activity = activities[0];
    const templates = includeName
      ? [
          `${prefix}Done, ${userName}. I ${activity}.`,
          `${prefix}Finished, ${userName}. Just ${activity}.`,
          `${prefix}${userName}, completed. I ${activity}.`,
        ]
      : [
          `${prefix}Done. I ${activity}.`,
          `${prefix}Finished. Just ${activity}.`,
          `${prefix}Complete. I ${activity}.`,
        ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Multiple activities
  const lastActivity = activities[activities.length - 1];
  const count = activities.length;

  const templates = includeName
    ? [
        `${prefix}Done, ${userName}. Completed ${count} actions, last one: ${lastActivity}.`,
        `${prefix}${userName}, finished with ${count} steps. Finally ${lastActivity}.`,
        `${prefix}All set, ${userName}. Did ${count} things, ending with ${lastActivity}.`,
      ]
    : [
        `${prefix}Done. Completed ${count} actions, last: ${lastActivity}.`,
        `${prefix}Finished ${count} steps. Finally ${lastActivity}.`,
        `${prefix}Complete. Did ${count} things, ending with ${lastActivity}.`,
      ];
  return templates[Math.floor(Math.random() * templates.length)];
}
