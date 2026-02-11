/**
 * AI-powered event summarizer for Claude Code hooks.
 * Uses Anthropic Haiku to generate concise event summaries.
 * Direct port of utils/summarizer.py
 */

import { loadConfig } from './config';
import { loadProjectEnv } from './env';

// Ensure project .env is loaded for API keys
loadProjectEnv();

/**
 * Generate a concise summary of a hook event using Claude.
 */
export async function generateEventSummary(eventData: Record<string, unknown>): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const config = loadConfig();

    const hookType = eventData.hook_event_type as string ?? 'Unknown';
    const payload = eventData.payload as Record<string, unknown> ?? {};

    let promptText: string;

    if (hookType === 'PreToolUse') {
      const toolName = (payload.tool_name as string) ?? 'Unknown';
      const toolInput = payload.tool_input as Record<string, unknown> ?? {};

      if (toolName === 'Bash') {
        const command = ((toolInput.command as string) ?? '').slice(0, 150);
        promptText = `Summarize what's happening in 1 concise sentence: About to execute bash command: ${command}`;
      } else if (['Read', 'Edit', 'Write'].includes(toolName)) {
        const filePath = (toolInput.file_path as string) ?? '';
        promptText = `Summarize what's happening in 1 concise sentence: About to ${toolName.toLowerCase()} file: ${filePath}`;
      } else if (toolName === 'TodoWrite') {
        const todos = (toolInput.todos as unknown[]) ?? [];
        promptText = `Summarize what's happening in 1 concise sentence: About to update todo list with ${todos.length} items`;
      } else {
        const inputSummary = JSON.stringify(toolInput).slice(0, 100);
        promptText = `Summarize what's happening in 1 concise sentence: About to use ${toolName} tool with input: ${inputSummary}`;
      }
    } else if (hookType === 'PostToolUse') {
      const toolName = (payload.tool_name as string) ?? 'Unknown';
      const toolInput = payload.tool_input as Record<string, unknown> ?? {};

      if (toolName === 'Bash') {
        const command = ((toolInput.command as string) ?? '').slice(0, 150);
        promptText = `Summarize what just happened in 1 concise sentence: Just completed bash command: ${command}`;
      } else if (['Read', 'Edit', 'Write'].includes(toolName)) {
        const filePath = (toolInput.file_path as string) ?? '';
        promptText = `Summarize what just happened in 1 concise sentence: Just completed ${toolName.toLowerCase()} operation on file: ${filePath}`;
      } else if (toolName === 'TodoWrite') {
        const todos = (toolInput.todos as unknown[]) ?? [];
        promptText = `Summarize what just happened in 1 concise sentence: Just updated todo list with ${todos.length} items`;
      } else {
        const inputSummary = JSON.stringify(toolInput).slice(0, 100);
        promptText = `Summarize what just happened in 1 concise sentence: Just completed ${toolName} tool with input: ${inputSummary}`;
      }
    } else if (hookType === 'UserPromptSubmit') {
      const userPrompt = ((payload.prompt as string) ?? '').slice(0, 100);
      promptText = `Summarize in 1 sentence: User submitted prompt: ${userPrompt}`;
    } else {
      promptText = `Summarize in 1 sentence: ${hookType} hook event occurred`;
    }

    const message = await client.messages.create({
      model: config.llm.anthropic.model,
      max_tokens: 50,
      temperature: 0.3,
      messages: [{ role: 'user', content: promptText }],
    });

    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : null;
  } catch {
    return null;
  }
}
