/**
 * Human-in-the-loop via WebSocket.
 * Direct port of utils/hitl.py
 */

interface HITLData {
  question: string;
  responseWebSocketUrl: string;
  type: 'question' | 'permission' | 'choice';
  choices?: string[];
  timeout: number;
  requiresResponse: boolean;
}

interface HITLResponse {
  response?: string;
  permission?: boolean;
  choice?: string;
}

interface SessionData {
  session_id?: string;
  source_app?: string;
  [key: string]: unknown;
}

/**
 * Send a HITL request to the observability server and wait for response.
 */
async function sendAndWait(
  question: string,
  type: 'question' | 'permission' | 'choice',
  sessionData: SessionData,
  options?: { choices?: string[]; timeout?: number; observabilityUrl?: string },
): Promise<HITLResponse | null> {
  const timeout = options?.timeout ?? 300;
  const observabilityUrl = options?.observabilityUrl ?? 'http://localhost:4000';

  // Find a free port for the response server
  const server = Bun.serve({
    port: 0, // OS assigns a free port
    fetch() {
      return new Response('Not found', { status: 404 });
    },
    websocket: {
      message(_ws, message) {
        try {
          responseData = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
        } catch { /* ignore */ }
      },
    },
  });

  let responseData: HITLResponse | null = null;
  const responsePort = server.port;

  const hitlData: HITLData = {
    question,
    responseWebSocketUrl: `ws://localhost:${responsePort}`,
    type,
    choices: options?.choices,
    timeout,
    requiresResponse: true,
  };

  const eventPayload = {
    ...sessionData,
    hook_event_type: 'HumanInTheLoop',
    payload: {},
    humanInTheLoop: hitlData,
    timestamp: Date.now(),
  };

  // Send to observability server
  try {
    await fetch(`${observabilityUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(`Failed to send HITL request: ${err}`);
    server.stop();
    return null;
  }

  // Wait for response with timeout
  const startTime = Date.now();
  while (!responseData && (Date.now() - startTime) < timeout * 1000) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  server.stop();
  return responseData;
}

/**
 * Ask a question and wait for text response.
 */
export async function askQuestion(
  question: string,
  sessionData: SessionData,
  timeout = 300,
): Promise<string | null> {
  const response = await sendAndWait(question, 'question', sessionData, { timeout });
  return response?.response ?? null;
}

/**
 * Ask for permission and wait for yes/no response.
 */
export async function askPermission(
  question: string,
  sessionData: SessionData,
  timeout = 300,
): Promise<boolean> {
  const response = await sendAndWait(question, 'permission', sessionData, { timeout });
  return response?.permission ?? false;
}

/**
 * Ask user to choose from options.
 */
export async function askChoice(
  question: string,
  choices: string[],
  sessionData: SessionData,
  timeout = 300,
): Promise<string | null> {
  const response = await sendAndWait(question, 'choice', sessionData, { choices, timeout });
  return response?.choice ?? null;
}
