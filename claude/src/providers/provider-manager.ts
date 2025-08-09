import { EventEmitter } from 'events';
import { AnthropicProvider } from './anthropic-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { 
  LLMProvider, 
  ILLMProvider, 
  LLMProviderConfig, 
  LLMRequest, 
  LLMResponse, 
  LLMStreamEvent,
  HealthCheckResult,
  ProviderCapabilities,
  ModelInfo,
  CostEstimate,
  UsageStats,
  ProviderMetrics as BaseProviderMetrics
} from './types.js';

export interface ProviderManagerConfig {
  providers: Record<string, LLMProviderConfig>;
  loadBalancing?: {
    strategy: 'round-robin' | 'weighted' | 'cost-optimized';
    weights?: Record<string, number>;
  };
  fallback?: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  monitoring?: {
    enabled: boolean;
    metricsInterval: number;
  };
}

interface ProviderMetrics extends BaseProviderMetrics {
  provider: LLMProvider;
  requestCount: number;
  lastUsed: Date;
}

interface ProviderManagerMetrics {
  totalRequests: number;
  providerStats: Array<{
    provider: LLMProvider;
    requestCount: number;
    lastUsed: Date;
  }>;
}

export class ProviderManager extends EventEmitter {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private requestCount: Map<LLMProvider, number> = new Map();
  private lastUsed: Map<LLMProvider, Date> = new Map();
  private config: ProviderManagerConfig;
  private logger: Console;

  constructor(config: ProviderManagerConfig, logger: Console = console) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the provider manager
   */
  async initialize(): Promise<void> {
    await this.initializeProviders();
    if (this.config.monitoring?.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Initialize all configured providers
   */
  private async initializeProviders(): Promise<void> {
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      try {
        const provider = await this.createProvider(providerName as LLMProvider, providerConfig);
        if (provider) {
          this.providers.set(providerName as LLMProvider, provider);
          this.requestCount.set(providerName as LLMProvider, 0);
          this.logger.info(`Initialized ${providerName} provider`);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize ${providerName} provider`, error);
      }
    }

    if (this.providers.size === 0) {
      throw new Error('No providers could be initialized');
    }
  }

  /**
   * Create a provider instance based on name and config
   */
  private async createProvider(name: LLMProvider, config: LLMProviderConfig): Promise<ILLMProvider | null> {
    switch (name) {
      case 'anthropic':
        const anthropicProvider = new AnthropicProvider(config);
        await anthropicProvider.initialize();
        return anthropicProvider;
      
      case 'openrouter':
        const openRouterProvider = new OpenRouterProvider(config);
        await openRouterProvider.initialize();
        return openRouterProvider;
      
      default:
        this.logger.warn(`Unknown provider: ${name}`);
        return null;
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers
   */
  getAllProviders(): Map<LLMProvider, ILLMProvider> {
    return new Map(this.providers);
  }

  /**
   * Get available models across all providers
   */
  async getAvailableModels(): Promise<Array<{ provider: LLMProvider; model: string }>> {
    const models: Array<{ provider: LLMProvider; model: string }> = [];
    
    for (const [providerName, provider] of this.providers) {
      try {
        const providerModels = await provider.listModels();
        for (const model of providerModels) {
          models.push({ provider: providerName, model });
        }
      } catch (error) {
        this.logger.error(`Failed to get models from ${providerName}`, error);
      }
    }
    
    return models;
  }

  /**
   * Select the best provider based on load balancing strategy
   */
  private selectProvider(request: LLMRequest): ILLMProvider | null {
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => {
        try {
          return provider.validateModel(request.model!);
        } catch {
          return false;
        }
      });

    if (availableProviders.length === 0) {
      return null;
    }

    switch (this.config.loadBalancing?.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableProviders);
      case 'weighted':
        return this.selectWeighted(availableProviders);
      case 'cost-optimized':
        return this.selectCostOptimized(availableProviders);
      default:
        return availableProviders[0][1];
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(availableProviders: Array<[LLMProvider, ILLMProvider]>): ILLMProvider {
    const providerNames = availableProviders.map(([name]) => name);
    const counts = providerNames.map(name => this.requestCount.get(name) || 0);
    const minCount = Math.min(...counts);
    const minIndex = counts.indexOf(minCount);
    return availableProviders[minIndex][1];
  }

  /**
   * Weighted selection
   */
  private selectWeighted(availableProviders: Array<[LLMProvider, ILLMProvider]>): ILLMProvider {
    const weights = this.config.loadBalancing?.weights || {};
    const totalWeight = availableProviders.reduce((sum, [name]) => sum + (weights[name] || 1), 0);
    
    let random = Math.random() * totalWeight;
    for (const [name, provider] of availableProviders) {
      random -= weights[name] || 1;
      if (random <= 0) {
        return provider;
      }
    }
    
    return availableProviders[0][1];
  }

  /**
   * Cost-optimized selection
   */
  private selectCostOptimized(availableProviders: Array<[LLMProvider, ILLMProvider]>): ILLMProvider {
    // Simple cost optimization - prefer providers with lower usage
    return this.selectRoundRobin(availableProviders);
  }

  /**
   * Complete a request with automatic provider selection and fallback
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const errors: Array<{ provider: string; error: Error }> = [];
    const maxRetries = this.config.fallback?.maxRetries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.selectProvider(request);
      if (!provider) {
        throw new Error('No suitable provider found');
      }

      const providerName = this.getProviderName(provider);
      
      try {
        this.incrementRequestCount(providerName);
        const response = await provider.complete(request);
        this.handleProviderResponse(providerName, response);
        return response;
      } catch (error) {
        errors.push({ provider: providerName, error: error as Error });
        this.handleProviderError(providerName, error as Error);
        
        if (!this.shouldRetry(error as Error, attempt, maxRetries)) {
          break;
        }
        
        if (this.config.fallback?.enabled) {
          await this.delay(this.config.fallback.retryDelay || 1000);
        }
      }
    }
    
    throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`);
  }

  /**
   * Stream a request with automatic provider selection and fallback
   */
  async *streamComplete(request: LLMRequest): AsyncGenerator<LLMStreamEvent, void, unknown> {
    const errors: Array<{ provider: string; error: Error }> = [];
    const maxRetries = this.config.fallback?.maxRetries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.selectProvider(request);
      if (!provider) {
        throw new Error('No suitable provider found');
      }

      const providerName = this.getProviderName(provider);
      
      try {
        this.incrementRequestCount(providerName);
        const stream = provider.streamComplete(request);
        
        for await (const chunk of stream) {
          yield chunk;
        }
        
        return;
      } catch (error) {
        errors.push({ provider: providerName, error: error as Error });
        this.handleProviderError(providerName, error as Error);
        
        if (!this.shouldRetry(error as Error, attempt, maxRetries)) {
          break;
        }
        
        if (this.config.fallback?.enabled) {
          await this.delay(this.config.fallback.retryDelay || 1000);
        }
      }
    }
    
    throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`);
  }

  /**
   * Get provider name from instance
   */
  private getProviderName(provider: ILLMProvider): LLMProvider {
    for (const [name, instance] of this.providers) {
      if (instance === provider) {
        return name;
      }
    }
    throw new Error('Provider not found');
  }

  /**
   * Increment request count for provider
   */
  private incrementRequestCount(provider: LLMProvider): void {
    const count = this.requestCount.get(provider) || 0;
    this.requestCount.set(provider, count + 1);
    this.lastUsed.set(provider, new Date());
  }

  /**
   * Determine if we should retry based on error type
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries - 1;
  }

  /**
   * Delay for retry
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider health status
   */
  async getHealthStatus(): Promise<Record<LLMProvider, HealthCheckResult>> {
    const health: Record<LLMProvider, HealthCheckResult> = {} as Record<LLMProvider, HealthCheckResult>;
    
    for (const [providerName, provider] of this.providers) {
      try {
        health[providerName] = await provider.healthCheck();
      } catch (error) {
        health[providerName] = {
          healthy: false,
          timestamp: new Date(),
          error: (error as Error).message
        };
      }
    }
    
    return health;
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderManagerMetrics {
    const totalRequests = Array.from(this.requestCount.values()).reduce((sum, count) => sum + count, 0);
    
    return {
      totalRequests,
      providerStats: Array.from(this.requestCount.entries()).map(([provider, count]) => ({
        provider,
        requestCount: count,
        lastUsed: this.lastUsed.get(provider) || new Date()
      }))
    };
  }

  /**
   * Handle provider response
   */
  private handleProviderResponse(provider: LLMProvider, data: any): void {
    this.emit('provider_response', { provider, ...data });
  }

  /**
   * Handle provider error
   */
  private handleProviderError(provider: LLMProvider, error: Error): void {
    this.emit('provider_error', { provider, error });
  }

  /**
   * Handle health check result
   */
  private handleHealthCheck(provider: LLMProvider, result: HealthCheckResult): void {
    this.emit('health_check', { provider, result });
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.emitMetrics();
    }, this.config.monitoring?.metricsInterval || 60000);
  }

  /**
   * Emit metrics
   */
  private emitMetrics(): void {
    const metrics = this.getMetrics();
    this.emit('metrics', metrics);
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    for (const [providerName, provider] of this.providers) {
      try {
        if (typeof provider.destroy === 'function') {
          await provider.destroy();
        }
        this.logger.info(`Shutdown ${providerName} provider`);
      } catch (error) {
        this.logger.error(`Failed to shutdown ${providerName} provider`, error);
      }
    }
    
    this.removeAllListeners();
  }
}