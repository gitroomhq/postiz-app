/**
 * Configuration for LLM providers
 */

export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'ollama'
  | 'groq';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface AzureConfig extends LLMConfig {
  deploymentName: string;
  endpoint: string;
  apiVersion: string;
}

/**
 * Get the configured LLM provider from environment variables
 */
export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
  return provider as LLMProvider;
}

/**
 * Get the configured LLM model from environment variables
 */
export function getLLMModel(): string {
  return process.env.LLM_MODEL || 'gpt-4.1';
}

/**
 * Get the configured temperature from environment variables
 */
export function getLLMTemperature(): number {
  const temp = process.env.LLM_TEMPERATURE;
  return temp ? parseFloat(temp) : 0.7;
}

/**
 * Get the full LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  const provider = getLLMProvider();

  const config: LLMConfig = {
    provider,
    model: getLLMModel(),
    temperature: getLLMTemperature(),
  };

  switch (provider) {
    case 'openai':
      config.apiKey = process.env.OPENAI_API_KEY;
      config.baseUrl = process.env.OPENAI_BASE_URL;
      break;
    case 'anthropic':
      config.apiKey = process.env.ANTHROPIC_API_KEY;
      config.baseUrl = process.env.ANTHROPIC_BASE_URL;
      break;
    case 'google':
      config.apiKey = process.env.GOOGLE_AI_API_KEY;
      break;
    case 'azure':
      config.apiKey = process.env.AZURE_OPENAI_API_KEY;
      break;
    case 'ollama':
      config.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      break;
    case 'groq':
      config.apiKey = process.env.GROQ_API_KEY;
      break;
  }

  return config;
}

/**
 * Get Azure-specific configuration
 */
export function getAzureConfig(): AzureConfig {
  return {
    provider: 'azure',
    model: getLLMModel(),
    temperature: getLLMTemperature(),
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  };
}

/**
 * Check if an LLM is configured and available
 */
export function isLLMConfigured(): boolean {
  const provider = getLLMProvider();

  switch (provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'google':
      return !!process.env.GOOGLE_AI_API_KEY;
    case 'azure':
      return (
        !!process.env.AZURE_OPENAI_API_KEY &&
        !!process.env.AZURE_OPENAI_ENDPOINT &&
        !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME
      );
    case 'ollama':
      return true; // Ollama doesn't require API key
    case 'groq':
      return !!process.env.GROQ_API_KEY;
    default:
      return false;
  }
}
