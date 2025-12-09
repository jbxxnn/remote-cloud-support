/**
 * Gemini API Client
 * 
 * Wrapper for Google Gemini API interactions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiConfig, isGeminiConfigured } from './config';

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

export interface GeminiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Gemini Client Singleton
 */
class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;

  /**
   * Initialize Gemini client
   */
  private initialize(): void {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    if (!this.client) {
      const config = getGeminiConfig();
      this.client = new GoogleGenerativeAI(config.apiKey);
      this.model = this.client.getGenerativeModel({ 
        model: config.model || 'gemini-1.5-flash',
      });
    }
  }

  /**
   * Generate text from prompt
   */
  async generateText(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<GeminiResponse> {
    try {
      this.initialize();

      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }

      const config = getGeminiConfig();
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? config.temperature,
          maxOutputTokens: options?.maxTokens ?? config.maxTokens,
        },
      });

      const response = result.response;
      const text = response.text();

      // Extract usage information if available
      const usage = response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        candidatesTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined;

      return {
        text,
        usage,
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      const geminiError: GeminiError = {
        message: error.message || 'Failed to generate text with Gemini',
        code: error.code,
        status: error.status,
      };

      throw geminiError;
    }
  }

  /**
   * Generate text from multiple prompts (conversation)
   */
  async generateConversation(messages: Array<{ role: 'user' | 'model'; content: string }>): Promise<GeminiResponse> {
    try {
      this.initialize();

      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }

      const chat = this.model.startChat({
        history: messages
          .slice(0, -1)
          .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          })),
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const text = response.text();

      const usage = response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        candidatesTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined;

      return {
        text,
        usage,
      };
    } catch (error: any) {
      console.error('Gemini conversation error:', error);
      
      const geminiError: GeminiError = {
        message: error.message || 'Failed to generate conversation with Gemini',
        code: error.code,
        status: error.status,
      };

      throw geminiError;
    }
  }

  /**
   * Health check - test API connection
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      if (!isGeminiConfigured()) {
        return {
          status: 'error',
          message: 'Gemini API key not configured',
        };
      }

      // Simple test prompt
      const response = await this.generateText('Say "OK" if you can read this.');
      
      if (response.text.toLowerCase().includes('ok')) {
        return {
          status: 'ok',
          message: 'Gemini API is working correctly',
        };
      }

      return {
        status: 'error',
        message: 'Unexpected response from Gemini API',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Failed to connect to Gemini API',
      };
    }
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();

