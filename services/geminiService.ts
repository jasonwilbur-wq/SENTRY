/**
 * Gemini service — thin proxy wrapper.
 *
 * The API key lives in the FastAPI backend (GCP Secret Manager).
 * The frontend NEVER touches the key directly.
 */
import { sendChat, ChatMessage } from './api';

/** @deprecated Use sendChat from services/api.ts directly. */
export const getGeminiResponse = async (
  userMessage: string,
  history: ChatMessage[] = [],
): Promise<string> => {
  const result = await sendChat(history, userMessage);
  return result.response;
};