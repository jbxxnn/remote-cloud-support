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

export interface AvailableModel {
  name: string;
  displayName: string;
  description?: string;
  supportedGenerationMethods?: string[];
  version?: string;
}

export interface ListModelsResponse {
  models: AvailableModel[];
}

/**
 * Gemini Client Singleton
 */
class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private detectedModel: string | null = null;
  private fallbackModels: string[] = [
    'gemini-2.0-flash-001',  // Stable fallback
    'gemini-2.0-flash',      // Alternative flash
    'gemini-2.5-pro',        // Pro version as last resort
  ];

  /**
   * Initialize Gemini client (uses primary model)
   */
  private async initialize(): Promise<void> {
    const config = getGeminiConfig();
    const modelName = this.detectedModel || config.model || 'gemini-2.5-flash';
    await this.initializeWithModel(modelName);
  }

  /**
   * Auto-detect and set the best available model
   */
  async autoDetectModel(): Promise<string> {
    try {
      const modelsResponse = await this.listAvailableModels();
      const bestModel = this.selectBestModel(modelsResponse.models);
      
      if (bestModel) {
        this.detectedModel = bestModel;
        // Reinitialize with the detected model
        this.client = null;
        this.model = null;
        await this.initialize();
        return bestModel;
      }
      
      throw new Error('No suitable model found');
    } catch (error: any) {
      console.error('Failed to auto-detect model:', error);
      throw error;
    }
  }

  /**
   * Generate text from prompt with retry logic and model fallback
   */
  async generateText(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    maxRetries?: number;
  }): Promise<GeminiResponse> {
    const maxRetries = options?.maxRetries ?? 3;
    const config = getGeminiConfig();
    const primaryModel = this.detectedModel || config.model || 'gemini-2.5-flash';
    
    // Try primary model first, then fallbacks
    const modelsToTry = [primaryModel, ...this.fallbackModels];
    
    for (const modelName of modelsToTry) {
      let lastError: any;
      
      // Try this model with retries
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Initialize with specific model
          await this.initializeWithModel(modelName);

          if (!this.model) {
            throw new Error('Gemini model not initialized');
          }

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

          if (modelName !== primaryModel) {
            console.log(`[Gemini] Successfully used fallback model: ${modelName}`);
          }

          return {
            text,
            usage,
          };
        } catch (error: any) {
          lastError = error;
          
          // Check if this is a transient error that we should retry
          const isTransientError = 
            error.status === 503 || // Service Unavailable
            error.status === 429 || // Too Many Requests (rate limit)
            error.status === 500 || // Internal Server Error
            error.status === 502 || // Bad Gateway
            error.message?.includes('overloaded') ||
            error.message?.includes('try again later') ||
            error.message?.includes('Service Unavailable');

          // Don't retry on quota exceeded (429) - that's a permanent issue until quota resets
          const isQuotaError = error.status === 429 && 
            (error.message?.includes('quota') || error.message?.includes('Quota exceeded'));

          if (isQuotaError) {
            console.error(`[Gemini] Quota exceeded on model ${modelName}:`, error);
            // Try next model if available
            if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
              console.log(`[Gemini] Trying next fallback model...`);
              break; // Break retry loop, try next model
            }
            const geminiError: GeminiError = {
              message: `Quota exceeded: ${error.message}. Your Gemini API free tier has limited quotas. Please check your plan and billing at https://ai.dev/usage?tab=rate-limit`,
              code: error.code || 'QUOTA_EXCEEDED',
              status: error.status || 429,
            };
            throw geminiError;
          }

          // If it's a transient error and we have retries left, wait and retry
          if (isTransientError && attempt < maxRetries) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
            console.warn(`[Gemini] Transient error on ${modelName} (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }

          // If not transient or out of retries, try next model (if available)
          if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
            console.warn(`[Gemini] Model ${modelName} failed after ${attempt + 1} attempts. Trying next fallback model...`);
            break; // Break retry loop, try next model
          }

          // Last model failed, throw error
          console.error(`[Gemini] All models failed. Last error from ${modelName}:`, error);
          const geminiError: GeminiError = {
            message: error.message || 'Failed to generate text with Gemini',
            code: error.code,
            status: error.status,
          };
          throw geminiError;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Failed to generate text: all models exhausted');
  }

  /**
   * Initialize with a specific model
   */
  private async initializeWithModel(modelName: string): Promise<void> {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    // Reset if model changed
    if (this.detectedModel !== modelName) {
      this.client = null;
      this.model = null;
      this.detectedModel = modelName;
    }

    if (!this.client) {
      const config = getGeminiConfig();
      this.client = new GoogleGenerativeAI(config.apiKey);
      this.model = this.client.getGenerativeModel({ 
        model: modelName,
      });
    }
  }

  /**
   * Generate text from multiple prompts (conversation)
   */
  async generateConversation(messages: Array<{ role: 'user' | 'model'; content: string }>): Promise<GeminiResponse> {
    try {
      await this.initialize();

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
   * Select the best model for text generation from available models
   * Prioritizes flash models that support generateContent, preferring newer stable versions
   */
  selectBestModel(models: AvailableModel[]): string | null {
    if (models.length === 0) {
      return null;
    }

    // Filter models that support generateContent
    const supportedModels = models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );

    if (supportedModels.length === 0) {
      // If no models support generateContent, return the first model
      return models[0].name;
    }

    // Prioritize flash models (faster, lower cost)
    const flashModels = supportedModels.filter(model => 
      model.name.toLowerCase().includes('flash') && 
      !model.name.toLowerCase().includes('lite') && // Exclude lite versions
      !model.name.toLowerCase().includes('preview') && // Prefer stable over preview
      !model.name.toLowerCase().includes('exp') && // Exclude experimental
      !model.name.toLowerCase().includes('image') // Exclude image-specific models
    );

    if (flashModels.length > 0) {
      // Sort by version number (extract numeric version and sort descending)
      const sortedFlash = flashModels.sort((a, b) => {
        // Extract version numbers (e.g., "2.5" from "gemini-2.5-flash")
        const versionA = parseFloat(a.name.match(/(\d+\.\d+)/)?.[1] || '0');
        const versionB = parseFloat(b.name.match(/(\d+\.\d+)/)?.[1] || '0');
        return versionB - versionA; // Descending order (newer first)
      });
      
      // Prefer models with "001" suffix (stable releases) or just the newest
      const stableFlash = sortedFlash.find(m => m.name.includes('001'));
      return stableFlash?.name || sortedFlash[0].name;
    }

    // Fallback to pro models
    const proModels = supportedModels.filter(model => 
      model.name.toLowerCase().includes('pro') &&
      !model.name.toLowerCase().includes('preview') &&
      !model.name.toLowerCase().includes('exp')
    );

    if (proModels.length > 0) {
      // Sort by version number
      const sortedPro = proModels.sort((a, b) => {
        const versionA = parseFloat(a.name.match(/(\d+\.\d+)/)?.[1] || '0');
        const versionB = parseFloat(b.name.match(/(\d+\.\d+)/)?.[1] || '0');
        return versionB - versionA;
      });
      
      const stablePro = sortedPro.find(m => m.name.includes('001') || m.name.includes('latest'));
      return stablePro?.name || sortedPro[0].name;
    }

    // Return first supported model
    return supportedModels[0].name;
  }

  /**
   * List all available models from the Gemini API
   */
  async listAvailableModels(): Promise<ListModelsResponse> {
    try {
      if (!isGeminiConfigured()) {
        throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY environment variable.');
      }

      const config = getGeminiConfig();
      
      // Use the REST API directly to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Transform the response to our interface
      const models: AvailableModel[] = (data.models || []).map((model: any) => ({
        name: model.name?.replace('models/', '') || '',
        displayName: model.displayName || model.name || '',
        description: model.description || '',
        supportedGenerationMethods: model.supportedGenerationMethods || [],
        version: model.version || '',
      }));

      return { models };
    } catch (error: any) {
      console.error('Error listing Gemini models:', error);
      
      const geminiError: GeminiError = {
        message: error.message || 'Failed to list available models',
        code: error.code,
        status: error.status,
      };

      throw geminiError;
    }
  }

  /**
   * Health check - test API connection
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string; detectedModel?: string }> {
    try {
      if (!isGeminiConfigured()) {
        return {
          status: 'error',
          message: 'Gemini API key not configured',
        };
      }

      // Try to generate text with current model
      try {
        const response = await this.generateText('Say "OK" if you can read this.');
        
        if (response.text.toLowerCase().includes('ok')) {
          return {
            status: 'ok',
            message: 'Gemini API is working correctly',
            detectedModel: this.detectedModel || undefined,
          };
        }

        return {
          status: 'error',
          message: 'Unexpected response from Gemini API',
        };
      } catch (modelError: any) {
        // Don't trigger auto-detection for quota errors (429) - these are billing/plan issues
        if (modelError.status === 429 || modelError.message?.includes('quota') || modelError.message?.includes('Quota exceeded')) {
          return {
            status: 'error',
            message: `Quota exceeded: ${modelError.message}. Please check your Gemini API plan and billing. Free tier has very limited quotas. See https://ai.google.dev/gemini-api/docs/rate-limits`,
          };
        }
        
        // Only try auto-detection for model not found errors (404)
        if (modelError.status === 404 || modelError.message?.includes('not found')) {
          try {
            const detectedModel = await this.autoDetectModel();
            const response = await this.generateText('Say "OK" if you can read this.');
            
            if (response.text.toLowerCase().includes('ok')) {
              return {
                status: 'ok',
                message: `Gemini API is working correctly with auto-detected model: ${detectedModel}`,
                detectedModel,
              };
            }
          } catch (detectError: any) {
            // If auto-detection also fails with quota error, return that
            if (detectError.status === 429 || detectError.message?.includes('quota')) {
              return {
                status: 'error',
                message: `Quota exceeded during auto-detection: ${detectError.message}. Please check your Gemini API plan and billing.`,
              };
            }
            return {
              status: 'error',
              message: `Model not found and auto-detection failed: ${detectError.message}`,
            };
          }
        }
        
        throw modelError;
      }
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

