/**
 * Interactive prompts using node:readline.
 * Zero dependencies — uses only Node.js built-ins.
 */

import { createInterface, Interface } from 'node:readline';

let rl: Interface | null = null;

function getRL(): Interface {
  if (!rl) {
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

export function closePrompts(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    getRL().question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ask for text input with a default value.
 */
export async function askText(
  prompt: string,
  defaultValue?: string,
): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  const answer = await question(`${prompt}${suffix}: `);
  return answer || defaultValue || '';
}

/**
 * Ask a yes/no question. Returns true for yes.
 */
export async function askYesNo(
  prompt: string,
  defaultYes = true,
): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await question(`${prompt} [${hint}]: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

/**
 * Ask for a port number with validation.
 */
export async function askPort(defaultPort = 3455): Promise<number> {
  const answer = await askText('Server port', String(defaultPort));
  const port = parseInt(answer, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    console.log('  Port must be between 1024 and 65535. Using default.');
    return defaultPort;
  }
  return port;
}

/**
 * Ask for an optional secret (API key). Input is not hidden
 * since node:readline doesn't support that natively without
 * terminal hacks that may break on some systems.
 */
export async function askSecret(
  prompt: string,
): Promise<string> {
  return askText(`${prompt} (leave blank to skip)`);
}

export interface InitPromptResults {
  targetDir: string;
  port: number;
  installBunDeps: boolean;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    elevenlabs?: string;
    unrealSpeech?: string;
  };
}

/**
 * Run the full interactive init prompt flow.
 */
export async function runInitPrompts(
  defaultDir: string,
  defaultPort: number,
): Promise<InitPromptResults> {
  console.log('');

  const targetDir = await askText('Target project directory', defaultDir);
  const port = await askPort(defaultPort);
  const installBunDeps = await askYesNo('Install bun dependencies after clone?');

  const wantKeys = await askYesNo('Configure API keys now?', false);

  const apiKeys: InitPromptResults['apiKeys'] = {};
  if (wantKeys) {
    console.log('  (Keys will be written to .claude/hooks/.env)');
    const anthropic = await askSecret('  ANTHROPIC_API_KEY');
    if (anthropic) apiKeys.anthropic = anthropic;
    const openai = await askSecret('  OPENAI_API_KEY');
    if (openai) apiKeys.openai = openai;
    const elevenlabs = await askSecret('  ELEVENLABS_API_KEY');
    if (elevenlabs) apiKeys.elevenlabs = elevenlabs;
    const unrealSpeech = await askSecret('  UNREAL_SPEECH_API_KEY');
    if (unrealSpeech) apiKeys.unrealSpeech = unrealSpeech;
  }

  console.log('');

  return { targetDir, port, installBunDeps, apiKeys };
}
