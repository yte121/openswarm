import { BaseProvider, BaseProviderOptions } from './base-provider.js';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamEvent,
  ModelInfo,
  ProviderCapabilities,
  HealthCheckResult,
  LLMProviderError,
  RateLimitError,
  ModelNotFoundError,
  LLMProviderConfig
} from './types.js';

// Add DOM types for fetch and Response
declare global {
  interface Window {
    fetch: typeof fetch;
  }
}

export class OpenRouterProvider extends BaseProvider {
  readonly name: LLMProvider = 'openrouter';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [],
    maxOutputTokens: {},
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    pricing: {}
  };
  
  private apiKeyList: string[];
  private currentKeyIndex: number = 0;
  private modelsCache: LLMModel[] | null = null;
  private modelsCacheTimestamp: number = 0;
  private readonly MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(options: BaseProviderOptions) {
    super(options);
    this.apiKeyList = this.parseApiKeyList(options.config.apiKey);
    if (this.apiKeyList.length === 0) {
      throw new Error('At least one OpenRouter API key is required');
    }
  }

  private parseApiKeyList(apiKey?: string): string[] {
    if (!apiKey) {
      return [];
    }
    return apiKey.split(',').map(k => k.trim()).filter(k => k);
  }

  private getCurrentApiKey(): string {
    if (this.currentKeyIndex >= this.apiKeyList.length) {
      throw new Error('All OpenRouter API keys are rate-limited. Please supply more keys.');
    }
    return this.apiKeyList[this.currentKeyIndex];
  }

  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeyList.length;
  }

  protected async doInitialize(): Promise<void> {
    // Fetch models on initialization to populate cache
    await this.fetchModels();
  }

  private async fetchModels(): Promise<LLMModel[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.getCurrentApiKey()}`,
        'HTTP-Referer': this.config.apiUrl || 'https://claude-flow.example.com',
        'X-Title': 'Claude Flow'
      }
    });

    if (response.status === 429) {
      this.rotateApiKey();
      return this.fetchModels(); // Retry with next key
    }

    if (!response.ok) {
      throw new LLMProviderError(
        `Failed to fetch models: ${response.statusText}`,
        'MODEL_FETCH_FAILED',
        'openrouter',
        response.status
      );
    }

    const data = await response.json();
    this.modelsCache = data.data.map((model: any) => `openrouter/${model.id}` as LLMModel);
    this.modelsCacheTimestamp = Date.now();
    return this.modelsCache;
  }

  async listModels(): Promise<LLMModel[]> {
    const now = Date.now();
    if (this.modelsCache && now - this.modelsCacheTimestamp < this.MODELS_CACHE_TTL) {
      return this.modelsCache;
    }
    return this.fetchModels();
  }

  async getModelInfo(model: LLMModel): Promise<ModelInfo> {
    if (!this.validateModel(model)) {
      throw new ModelNotFoundError(model, 'openrouter');
    }

    const models = await this.listModels();
    const modelId = model.split('/')[1];
    
    // In a real implementation, we'd fetch detailed model info
    // For now, return a stub with reasonable defaults
    return {
      model,
      name: modelId,
      description: `OpenRouter model ${modelId}`,
      contextLength: 32768,
      maxOutputTokens: 4096,
      supportedFeatures: ['chat', 'completion'],
      pricing: {
        promptCostPer1k: 0.001,
        completionCostPer1k: 0.002,
        currency: 'USD'
      }
    };
  }

  validateModel(model: LLMModel): boolean {
    return model.startsWith('openrouter/') && 
           this.modelsCache?.includes(model) === true;
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model;
    if (!this.validateModel(model)) {
      throw new ModelNotFoundError(model, 'openrouter');
    }

    const payload = {
      model: model.split('/')[1],
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      top_k: request.topK,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stopSequences
    };

    const response = await this.makeRequest(payload);
    return this.convertResponse(response, model);
  }

  protected async doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const model = request.model || this.config.model;
    if (!this.validateModel(model)) {
      throw new ModelNotFoundError(model, 'openrouter');
    }

    const payload = {
      model: model.split('/')[1],
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      top_k: request.topK,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stopSequences,
      stream: true
    };

    const response = await this.makeStreamingRequest(payload);
    return this.convertStreamResponse(response, model);
  }

  private async makeRequest(payload: any): Promise<any> {
    const startKeyIndex = this.currentKeyIndex;
    let attempts = 0;

    while (attempts < this.apiKeyList.length) {
      const apiKey = this.apiKeyList[this.currentKeyIndex];
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.config.apiUrl || 'https://claude-flow.example.com',
            'X-Title': 'Claude Flow'
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          this.rotateApiKey();
          attempts++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new LLMProviderError(
            `OpenRouter API error: ${response.statusText}`,
            'API_ERROR',
            'openrouter',
            response.status,
            false,
            errorData
          );
        }

        return response.json();
      } catch (error) {
        this.rotateApiKey();
        attempts++;
      }
    }

    throw new Error('All OpenRouter API keys are rate-limited. Please supply more keys.');
  }

  private async makeStreamingRequest(payload: any): Promise<any> {
    const startKeyIndex = this.currentKeyIndex;
    let attempts = 0;

    while (attempts < this.apiKeyList.length) {
      const apiKey = this.apiKeyList[this.currentKeyIndex];
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.config.apiUrl || 'https://claude-flow.example.com',
            'X-Title': 'Claude Flow'
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          this.rotateApiKey();
          attempts++;
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new LLMProviderError(
            `OpenRouter API error: ${response.statusText}`,
            'API_ERROR',
            'openrouter',
            response.status,
            false,
            errorData
          );
        }

        return response;
      } catch (error) {
        this.rotateApiKey();
        attempts++;
      }
    }

    throw new Error('All OpenRouter API keys are rate-limited. Please supply more keys.');
  }

  private convertResponse(response: any, model: LLMModel): LLMResponse {
    return {
      id: response.id,
      model: `openrouter/${response.model}`,
      provider: 'openrouter',
      content: response.choices[0].message.content,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      cost: {
        promptCost: (response.usage.prompt_tokens / 1000) * 0.001,
        completionCost: (response.usage.completion_tokens / 1000) * 0.002,
        totalCost: (response.usage.total_tokens / 1000) * 0.0015,
        currency: 'USD'
      },
      finishReason: response.choices[0].finish_reason
    };
  }

  private async* convertStreamResponse(response: any, model: LLMModel): AsyncIterable<LLMStreamEvent> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield {
                type: 'content',
                content: parsed.choices[0]?.delta?.content || '',
                model: `openrouter/${parsed.model}`,
                provider: 'openrouter'
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      await this.fetchModels();
      return {
        healthy: true,
        provider: 'openrouter',
        message: 'OpenRouter API is accessible'
      };
    } catch (error) {
      return {
        healthy: false,
        provider: 'openrouter',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  override destroy(): void {
    super.destroy();
    // Cleanup if needed
  }
}