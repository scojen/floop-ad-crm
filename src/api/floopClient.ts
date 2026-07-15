/**
 * Minimal client for Floop's chat API (the AI assistant in ../Scotty).
 * Loose coupling by design: if Floop is down or unconfigured, the form
 * works fine — only the "Ask Floop" panel degrades.
 */

const FLOOP_BASE_URL: string = import.meta.env.VITE_FLOOP_BASE_URL ?? '';
const FLOOP_TOKEN: string = import.meta.env.VITE_FLOOP_TOKEN ?? '';

export const floopConfigured = FLOOP_BASE_URL.length > 0;

export interface FloopChatReply {
  status: string;
  message: string;
  threadId?: string;
  externalThreadKey?: string;
}

export async function askFloop(
  text: string,
  threadKey: string,
): Promise<FloopChatReply> {
  if (!floopConfigured) {
    throw new Error('Floop is not configured (VITE_FLOOP_BASE_URL).');
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (FLOOP_TOKEN) {
    headers.Authorization = `Bearer ${FLOOP_TOKEN}`;
  }
  const response = await fetch(`${FLOOP_BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, threadKey }),
  });
  if (!response.ok) {
    throw new Error(`Floop replied ${response.status}`);
  }
  return (await response.json()) as FloopChatReply;
}
