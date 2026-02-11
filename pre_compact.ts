#!/usr/bin/env bun
/**
 * PreCompact hook — transcript backup, handoff saving, git state.
 * Supports: --backup, --save-handoff, --verbose
 */

import { readStdinJson, parseCliFlags } from './lib/stdin';
import { appendToJsonLog } from './lib/log';
import { ensureLocalLogDir } from './lib/constants';
import type { PreCompactHookInput, WorkContext, GitState } from './lib/types';
import { existsSync, copyFileSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';

async function main(): Promise<void> {
  const flags = parseCliFlags();
  const input = await readStdinJson<PreCompactHookInput>();

  const sessionId = input.session_id ?? 'unknown';
  const transcriptPath = input.transcript_path ?? '';
  const trigger = input.trigger ?? 'unknown';
  const customInstructions = input.custom_instructions ?? '';

  // Log pre-compact event
  const logDir = ensureLocalLogDir();
  appendToJsonLog(join(logDir, 'pre_compact.json'), input);

  // Create backup if requested
  let backupPath: string | null = null;
  if (flags.backup && transcriptPath) {
    backupPath = backupTranscript(transcriptPath, trigger);
  }

  // Save handoff context if requested (or always for auto compaction)
  let handoffPath: string | null = null;
  if (flags.saveHandoff || trigger === 'auto') {
    handoffPath = await saveHandoffContext(sessionId, backupPath, trigger);
  }

  // Verbose output
  if (flags.verbose) {
    let message: string;
    if (trigger === 'manual') {
      message = `Preparing for manual compaction (session: ${sessionId.slice(0, 8)}...)`;
      if (customInstructions) {
        message += `\nCustom instructions: ${customInstructions.slice(0, 100)}...`;
      }
    } else {
      message = `Auto-compaction triggered due to full context window (session: ${sessionId.slice(0, 8)}...)`;
    }

    if (backupPath) message += `\nTranscript backed up to: ${backupPath}`;
    if (handoffPath) message += `\nHandoff context saved to: ${handoffPath}`;

    console.log(message);
  }
}

function backupTranscript(transcriptPath: string, trigger: string): string | null {
  try {
    if (!existsSync(transcriptPath)) return null;

    const backupDir = join('logs', 'transcript_backups');
    mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const sessionName = basename(transcriptPath, '.jsonl');
    const backupName = `${sessionName}_pre_compact_${trigger}_${timestamp}.jsonl`;
    const backupPath = join(backupDir, backupName);

    copyFileSync(transcriptPath, backupPath);
    return backupPath;
  } catch {
    return null;
  }
}

function detectWorkContext(): WorkContext {
  const context: WorkContext = {
    storyId: null,
    storyPath: null,
    epicId: null,
    branch: null,
    worktree: null,
  };

  try {
    // Get current branch
    const branchResult = Bun.spawnSync(['git', 'branch', '--show-current'], {
      stdout: 'pipe', stderr: 'pipe',
    });
    if (branchResult.exitCode === 0) {
      context.branch = branchResult.stdout.toString().trim();

      if (context.branch) {
        const match = context.branch.match(/us-(\d+)/i);
        if (match) {
          context.storyId = `us-${match[1]}`;

          // Try to find story path
          const userStoriesDir = '.codemill/user-stories';
          if (existsSync(userStoriesDir)) {
            try {
              for (const epicDir of readdirSync(userStoriesDir, { withFileTypes: true })) {
                if (!epicDir.isDirectory()) continue;
                const epicPath = join(userStoriesDir, epicDir.name);
                for (const storyDir of readdirSync(epicPath, { withFileTypes: true })) {
                  if (!storyDir.isDirectory()) continue;
                  if (storyDir.name.includes(context.storyId!)) {
                    const storyFile = join(epicPath, storyDir.name, `${storyDir.name}.md`);
                    if (existsSync(storyFile)) {
                      context.storyPath = storyFile;
                      context.epicId = epicDir.name;
                      break;
                    }
                  }
                }
                if (context.storyPath) break;
              }
            } catch { /* ignore story search errors */ }
          }
        }
      }
    }

    // Check if in worktree
    const gitDirResult = Bun.spawnSync(['git', 'rev-parse', '--git-dir'], {
      stdout: 'pipe', stderr: 'pipe',
    });
    if (gitDirResult.exitCode === 0) {
      const gitDir = gitDirResult.stdout.toString().trim();
      if (gitDir.includes('worktrees')) {
        context.worktree = process.cwd();
      }
    }
  } catch { /* ignore */ }

  return context;
}

function getGitState(): GitState {
  const state: GitState = {
    currentBranch: null,
    uncommittedChanges: false,
    lastCommit: null,
    lastCommitMessage: null,
    modifiedFiles: [],
  };

  try {
    const branchResult = Bun.spawnSync(['git', 'branch', '--show-current'], { stdout: 'pipe', stderr: 'pipe' });
    if (branchResult.exitCode === 0) state.currentBranch = branchResult.stdout.toString().trim();

    const statusResult = Bun.spawnSync(['git', 'status', '--porcelain'], { stdout: 'pipe', stderr: 'pipe' });
    if (statusResult.exitCode === 0) {
      const lines = statusResult.stdout.toString().trim().split('\n').filter(Boolean);
      state.uncommittedChanges = lines.length > 0;
      state.modifiedFiles = lines.map(l => l.slice(3).trim()).slice(0, 10);
    }

    const logResult = Bun.spawnSync(['git', 'log', '-1', '--format=%h'], { stdout: 'pipe', stderr: 'pipe' });
    if (logResult.exitCode === 0) state.lastCommit = logResult.stdout.toString().trim();

    const msgResult = Bun.spawnSync(['git', 'log', '-1', '--format=%s'], { stdout: 'pipe', stderr: 'pipe' });
    if (msgResult.exitCode === 0) state.lastCommitMessage = msgResult.stdout.toString().trim();
  } catch { /* ignore */ }

  return state;
}

async function saveHandoffContext(
  sessionId: string,
  backupPath: string | null,
  trigger: string,
): Promise<string | null> {
  try {
    const handoffDir = '.codemill/handoffs/auto-saved';
    mkdirSync(handoffDir, { recursive: true });

    const workContext = detectWorkContext();
    const gitState = getGitState();

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const handoff = {
      handoffId: `auto-${sessionId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      handoffType: 'pre-compact',
      trigger,
      sessionId,
      transcriptBackupPath: backupPath,
      workContext,
      gitState,
      autoGenerated: true,
      needsReview: true,
      note: 'Auto-saved before compaction. Use /resume_handoff to convert to full handoff.',
    };

    const filename = `auto_${timestamp}_${sessionId.slice(0, 8)}.json`;
    const handoffPath = join(handoffDir, filename);
    writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
    return handoffPath;
  } catch (err) {
    // Log error but don't fail compaction
    try {
      appendToJsonLog(join(ensureLocalLogDir(), 'handoff_errors.json'), {
        timestamp: new Date().toISOString(),
        error: String(err),
        context: 'save_handoff_context',
      });
    } catch { /* ignore */ }
    return null;
  }
}

function ensureLocalLogDir(): string {
  const logDir = 'logs';
  mkdirSync(logDir, { recursive: true });
  return logDir;
}

main().catch(() => process.exit(0));
