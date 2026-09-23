import { Message } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** What /api/chat returns. `provider` is always the one that actually answered. */
export interface LLMReply {
  text: string;
  provider: string;
  model: string;
  /** True when a fallback provider answered because the configured one failed. */
  degraded: boolean;
  /** Why the configured provider failed, when degraded. */
  primary_error: string | null;
}

/**
 * Send one turn to the backend.
 *
 * Throws on failure. The previous implementation caught everything and
 * returned strings like "An error occurred while contacting the intelligence
 * engine", which the chat then rendered as a model message — a backend outage
 * was indistinguishable from an answer.
 */
export async function sendMessage(
  agentInstruction: string,
  history: Message[],
  userInput: string
): Promise<LLMReply> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentInstruction, history, userInput }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      const d = body?.detail;
      detail = typeof d === 'string' ? d : d?.message ? `${d.provider}: ${d.message}` : JSON.stringify(d ?? body);
    } catch {
      detail = await response.text().catch(() => '');
    }
    throw new Error(`Chat failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`);
  }

  return response.json();
}
