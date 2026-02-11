/**
 * Shared type definitions for Claude Code hooks.
 */

/** Base input that all hooks receive via stdin */
export interface HookInputBase {
  session_id: string;
  transcript_path?: string;
}

/** Stop hook input */
export interface StopHookInput extends HookInputBase {
  stop_hook_active: boolean;
}

/** SubagentStop hook input */
export interface SubagentStopHookInput extends HookInputBase {
  stop_hook_active: boolean;
}

/** Tool use hook input (pre and post) */
export interface ToolUseHookInput extends HookInputBase {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/** Session start hook input */
export interface SessionStartHookInput extends HookInputBase {
  source: string;
}

/** Session end hook input */
export interface SessionEndHookInput extends HookInputBase {
  reason: string;
}

/** Notification hook input */
export interface NotificationHookInput extends HookInputBase {
  message: string;
}

/** User prompt submit hook input */
export interface UserPromptSubmitHookInput extends HookInputBase {
  prompt: string;
}

/** Send event hook input (generic — receives any hook's data) */
export interface SendEventHookInput extends HookInputBase {
  [key: string]: unknown;
}

/** Pre-compact hook input */
export interface PreCompactHookInput extends HookInputBase {
  trigger: string;
  custom_instructions?: string;
}

/** Parsed CLI flags common across hooks */
export interface CliFlags {
  chat?: boolean;
  notify?: boolean;
  addContext?: boolean;
  announce?: boolean;
  saveStats?: boolean;
  backup?: boolean;
  saveHandoff?: boolean;
  verbose?: boolean;
  validate?: boolean;
  logOnly?: boolean;
  storeLastPrompt?: boolean;
  nameAgent?: boolean;
  sourceApp?: string;
  eventType?: string;
  serverUrl?: string;
  addChat?: boolean;
  summarize?: boolean;
}

/** Subagent context extracted from a transcript */
export interface SubagentContext {
  subagent_type: string | null;
  description: string | null;
  prompt: string | null;
}

/** Work context for pre-compact handoffs */
export interface WorkContext {
  storyId: string | null;
  storyPath: string | null;
  epicId: string | null;
  branch: string | null;
  worktree: string | null;
}

/** Git state for pre-compact handoffs */
export interface GitState {
  currentBranch: string | null;
  uncommittedChanges: boolean;
  lastCommit: string | null;
  lastCommitMessage: string | null;
  modifiedFiles: string[];
}

/** Event data sent to the observability server */
export interface ObservabilityEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  model_name: string;
  chat?: Record<string, unknown>[];
  summary?: string;
}
