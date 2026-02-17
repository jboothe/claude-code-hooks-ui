/**
 * `npx claude-code-hooks-ui status [dir]`
 *
 * Show: install status, git branch/commit, schema version, port, TTS config, runtime info.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { banner, info, err, check, section, dim } from '../lib/logger.js';
import { resolveProjectPaths } from '../lib/platform.js';
import { readConfig, getConfigValue, type JsonObject } from '../lib/config-manager.js';
import { getSchemaVersion, getLatestVersion } from '../lib/migration-runner.js';
import { detectAll } from '../lib/runtime-detect.js';

function gitInfo(hooksDir: string): { branch: string; commit: string; dirty: boolean } | null {
  try {
    const branch = execFileSync('git', ['-C', hooksDir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const commit = execFileSync('git', ['-C', hooksDir, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    let dirty = false;
    try {
      const status = execFileSync('git', ['-C', hooksDir, 'status', '--porcelain'], {
        encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      dirty = status.length > 0;
    } catch { /* ignore */ }
    return { branch, commit, dirty };
  } catch {
    return null;
  }
}

interface StatusOptions {
  dir?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  banner();

  const resolvedDir = resolve(options.dir || '.');
  const paths = resolveProjectPaths(resolvedDir);

  info(`Project: ${paths.projectRoot}`);
  console.log('');

  // ─── Install status ───
  section('Installation');
  const installed = existsSync(paths.hooksDir);
  check('Hooks installed', installed, installed ? paths.hooksDir : 'not found');

  if (!installed) {
    err('Hooks not installed. Run "npx claude-code-hooks-ui init" to set up.');
    return;
  }

  check('package.json', existsSync(`${paths.hooksDir}/package.json`));
  check('node_modules/', existsSync(`${paths.hooksDir}/node_modules`));
  check('hooks.config.json', existsSync(paths.configFile));
  check('settings.local.json', existsSync(paths.settingsFile));

  // ─── Git info ───
  console.log('');
  section('Git');
  const git = gitInfo(paths.hooksDir);
  if (git) {
    const dirtyLabel = git.dirty ? ' (uncommitted changes)' : '';
    dim(`  Branch: ${git.branch}`);
    dim(`  Commit: ${git.commit}${dirtyLabel}`);
  } else {
    dim('  Not a git repository (local copy)');
  }

  // ─── Schema ───
  console.log('');
  section('Schema');
  const currentVersion = getSchemaVersion(paths.configFile);
  const latestVersion = getLatestVersion();
  const upToDate = currentVersion >= latestVersion;
  dim(`  Schema version: ${currentVersion}${upToDate ? ' (latest)' : ` (latest: ${latestVersion}, run update)`}`);

  // ─── Config summary ───
  console.log('');
  section('Configuration');
  const config = readConfig(paths.configFile);

  const port = getConfigValue(config, 'server.port') ?? 3455;
  dim(`  Server port: ${port}`);

  const ttsEnabled = getConfigValue(config, 'tts.enabled');
  dim(`  TTS enabled: ${ttsEnabled ?? 'default (true)'}`);

  const userName = getConfigValue(config, 'tts.userName');
  if (userName) dim(`  TTS user name: ${userName}`);

  const providers = getConfigValue(config, 'tts.providerPriority');
  if (Array.isArray(providers)) {
    dim(`  TTS providers: ${(providers as string[]).join(' → ')}`);
  }

  const guardrailsEnabled = getConfigValue(config, 'guardrails.enabled');
  dim(`  Guardrails: ${guardrailsEnabled ?? 'default (true)'}`);

  // ─── .env keys ───
  console.log('');
  section('API Keys (.env)');
  if (existsSync(paths.envFile)) {
    const { readFileSync } = await import('node:fs');
    const envContent = readFileSync(paths.envFile, 'utf-8');
    for (const keyName of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'UNREAL_SPEECH_API_KEY']) {
      const hasKey = envContent.includes(keyName + '=');
      check(keyName, hasKey, hasKey ? 'configured' : 'not set');
    }
  } else {
    dim('  No .env file found');
  }

  // ─── Runtime ───
  console.log('');
  section('Runtime');
  const runtimes = detectAll();
  check('bun', runtimes.bun.available, runtimes.bun.version || 'not found');
  check('git', runtimes.git.available, runtimes.git.version || 'not found');
  check('jq', runtimes.jq.available, runtimes.jq.version || 'not installed (optional)');
  check('node', runtimes.node.available, runtimes.node.version || 'not found');

  console.log('');
}
