/**
 * LLM Service for SupportSense Assistant
 * 
 * TODO: Wire to AI backend
 * 
 * This service will handle:
 * - LLM API calls (OpenAI, Anthropic, or custom)
 * - Query translation and formatting
 * - Response streaming
 * - Error handling and retries
 * - Token management
 * 
 * Implementation deferred until AI backend is ready.
 */

import { AssistantContextPayload } from './types';

export interface LLMRequest {
  query: string;
  context: AssistantContextPayload;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
  model?: string;
}

/**
 * Send query to LLM backend
 * 
 * TODO: Implement actual LLM integration
 */
export async function sendQueryToLLM(request: LLMRequest): Promise<LLMResponse> {
  // Placeholder implementation
  console.log('LLM Query (not implemented):', request);
  
  return {
    content: "I'm SupportSense. Training mode only. LLM backend not yet connected.",
    tokensUsed: 0,
    model: 'training-mode',
  };
}

/**
 * Stream query response from LLM
 * 
 * TODO: Implement streaming response
 */
export async function* streamQueryToLLM(
  request: LLMRequest
): AsyncGenerator<string, void, unknown> {
  // Placeholder implementation
  yield "I'm SupportSense. Training mode only. Streaming not yet implemented.";
}











