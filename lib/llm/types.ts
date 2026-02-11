/**
 * LLM provider interface for Claude Code hooks.
 */

export interface LLMProvider {
  /** Provider name (e.g., "anthropic", "openai") */
  name: string;

  /** Send a prompt and get a response */
  prompt(text: string): Promise<string | null>;

  /** Generate a short completion message */
  generateCompletionMessage(): Promise<string | null>;

  /** Generate an agent name (single word, alphanumeric) */
  generateAgentName(): Promise<string | null>;
}
