/**
 * `npx claude-code-hooks-ui init [dir] [--port N] [--no-prompts]`
 *
 * Interactive install flow:
 * 1. Detect runtime (bun, git), print status
 * 2. Interactive prompts: target dir, port, optional bun install, optional API keys
 * 3. Clone hooks repo (or merge into existing .claude/hooks/)
 * 4. Set port in hooks.config.json if non-default
 * 5. Run schema migrations (sets initial schemaVersion)
 * 6. bun install dependencies
 * 7. Merge settings.template.json into settings.local.json
 * 8. Write API keys to .env if provided
 * 9. Print summary
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { banner, info, ok, err, warn, check, section } from '../lib/logger.js';
import { detectPlatform, resolveProjectPaths } from '../lib/platform.js';
import { detectAll, checkPrerequisites } from '../lib/runtime-detect.js';
import { runInitPrompts, closePrompts } from '../lib/prompts.js';
import { cloneHooks, installDeps, writeEnvFile } from '../lib/installer.js';
import { readConfig, writeConfig, setConfigValue } from '../lib/config-manager.js';
import { mergeSettings } from '../lib/settings-merger.js';
import { runMigrations } from '../lib/migration-runner.js';

interface InitOptions {
  dir?: string;
  port?: number;
  noPrompts?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  banner();

  // ─── Platform ───
  const plat = detectPlatform();
  if (plat === 'windows') {
    info('Detected Windows environment');
  }

  // ─── Runtime detection ───
  const runtimes = detectAll();
  section('Runtime');
  check('bun', runtimes.bun.available, runtimes.bun.available ? `v${runtimes.bun.version}` : 'not found — install at https://bun.sh');
  check('git', runtimes.git.available, runtimes.git.available ? `v${runtimes.git.version}` : 'not found');
  check('jq', runtimes.jq.available, runtimes.jq.available ? `v${runtimes.jq.version}` : 'optional — smart JSON merge');
  check('node', runtimes.node.available, runtimes.node.available ? `v${runtimes.node.version}` : 'not found');
  console.log('');

  const missing = checkPrerequisites();
  if (missing.length > 0) {
    err(`Missing required tools: ${missing.join(', ')}`);
    err('Install them and try again.');
    process.exit(1);
  }
  ok('Prerequisites OK');

  // ─── Prompts or defaults ───
  let targetDir = options.dir || '.';
  let port = options.port || 3455;
  let installBunDeps = true;
  let apiKeys: { anthropic?: string; openai?: string; elevenlabs?: string; unrealSpeech?: string } = {};

  if (!options.noPrompts) {
    try {
      const answers = await runInitPrompts(targetDir, port);
      targetDir = answers.targetDir;
      port = answers.port;
      installBunDeps = answers.installBunDeps;
      apiKeys = answers.apiKeys;
    } finally {
      closePrompts();
    }
  }

  const resolvedDir = resolve(targetDir);
  if (!existsSync(resolvedDir)) {
    err(`Target directory does not exist: ${resolvedDir}`);
    process.exit(1);
  }

  const paths = resolveProjectPaths(resolvedDir);
  info(`Target project: ${paths.projectRoot}`);
  info(`Hooks destination: ${paths.hooksDir}`);

  // ─── Clone ───
  cloneHooks(paths.hooksDir, paths.claudeDir);

  // ─── Configure port ───
  if (port !== 3455) {
    info(`Setting server port to ${port}...`);
    let config = readConfig(paths.configFile);
    config = setConfigValue(config, 'server.port', port);
    writeConfig(paths.configFile, config);
    ok(`Server port configured: ${port}`);
  }

  // ─── Migrations ───
  runMigrations(paths.configFile);

  // ─── Install deps ───
  if (installBunDeps) {
    installDeps(paths.hooksDir);
  } else {
    warn('Skipping bun install — run "bun install" manually in .claude/hooks/');
  }

  // ─── Merge settings ───
  mergeSettings(paths.templateFile, paths.settingsFile);

  // ─── API keys ───
  if (Object.keys(apiKeys).length > 0) {
    writeEnvFile(paths.envFile, apiKeys);
  }

  // ─── Verification ───
  console.log('');
  info('Verifying installation...');
  console.log('');

  section('Core files');
  check('package.json', existsSync(`${paths.hooksDir}/package.json`));
  check('tsconfig.json', existsSync(`${paths.hooksDir}/tsconfig.json`));
  check('settings.template.json', existsSync(paths.templateFile));
  check('hooks.config.json', existsSync(paths.configFile));

  section('Hook scripts');
  for (const script of ['stop.ts', 'subagent_stop.ts', 'notification.ts', 'session_end.ts', 'session_start.ts', 'pre_tool_use.ts', 'post_tool_use.ts', 'user_prompt_submit.ts', 'pre_compact.ts', 'send_event.ts']) {
    check(script, existsSync(`${paths.hooksDir}/${script}`));
  }

  section('Libraries');
  check('lib/config.ts', existsSync(`${paths.hooksDir}/lib/config.ts`));
  check('lib/tts/', existsSync(`${paths.hooksDir}/lib/tts`));
  check('lib/llm/', existsSync(`${paths.hooksDir}/lib/llm`));

  section('TTS Manager App');
  check('tts-app/server.ts', existsSync(`${paths.hooksDir}/tts-app/server.ts`));

  section('Dependencies');
  check('node_modules/', existsSync(`${paths.hooksDir}/node_modules`));

  section('Settings');
  check('settings.local.json', existsSync(paths.settingsFile));

  // ─── Summary ───
  console.log('');
  ok('Installation complete!');
  info('Start a new Claude Code session to activate hooks.');
  info(`Run 'bun run tts-app' from ${paths.hooksDir} to start the Hooks Manager (localhost:${port}).`);

  if (Object.keys(apiKeys).length === 0) {
    console.log('');
    info('Optional API keys (add to .claude/hooks/.env or export in shell):');
    console.log('  ANTHROPIC_API_KEY     — LLM summarization (Anthropic)');
    console.log('  OPENAI_API_KEY        — LLM summarization (OpenAI) / TTS (OpenAI)');
    console.log('  ELEVENLABS_API_KEY    — TTS (ElevenLabs)');
    console.log('  UNREAL_SPEECH_API_KEY — TTS (Unreal Speech)');
  }
  console.log('');
}
