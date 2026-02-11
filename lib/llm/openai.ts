/**
 * OpenAI LLM provider.
 * Direct port of utils/llm/oai.py — fixes the outdated gpt-4.1-nano model.
 */

import type { LLMProvider } from './types';
import { loadConfig } from '../config';

export class OpenAILLM implements LLMProvider {
  name = 'openai';

  async prompt(text: string): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey });
      const config = loadConfig();

      const response = await client.chat.completions.create({
        model: config.llm.openai.model,
        messages: [{ role: 'user', content: text }],
        max_tokens: config.llm.openai.maxTokens,
        temperature: config.llm.openai.temperature,
      });

      return response.choices[0]?.message?.content?.trim() ?? null;
    } catch {
      return null;
    }
  }

  async generateCompletionMessage(): Promise<string | null> {
    const userName = (process.env.USER_NAME ?? '').trim();

    let nameInstruction = '';
    let examples: string;

    if (userName) {
      nameInstruction = `Sometimes (about 30% of the time) include the user's name '${userName}' in a natural way.`;
      examples = `Examples of the style:
- Standard: "Work complete!", "All done!", "Task finished!", "Ready for your next move!"
- Personalized: "${userName}, all set!", "Ready for you, ${userName}!", "Complete, ${userName}!", "${userName}, we're done!"`;
    } else {
      examples = `Examples of the style: "Work complete!", "All done!", "Task finished!", "Ready for your next move!"`;
    }

    const promptText = `Generate a short, friendly completion message for when an AI coding assistant finishes a task.

Requirements:
- Keep it under 10 words
- Make it positive and future focused
- Use natural, conversational language
- Focus on completion/readiness
- Do NOT include quotes, formatting, or explanations
- Return ONLY the completion message text
${nameInstruction}

${examples}

Generate ONE completion message:`;

    const response = await this.prompt(promptText);
    if (!response) return null;

    return response.replace(/^["']|["']$/g, '').split('\n')[0].trim();
  }

  async generateAgentName(): Promise<string | null> {
    const promptText = `Generate a single creative one-word name for an AI coding agent. The name should be:
- A single word, alphanumeric only
- Creative and memorable
- Return ONLY the name, nothing else`;

    const response = await this.prompt(promptText);
    if (!response) return null;

    const name = response.trim();
    if (name.split(/\s+/).length === 1 && /^[a-zA-Z0-9]+$/.test(name)) {
      return name;
    }
    return null;
  }
}
