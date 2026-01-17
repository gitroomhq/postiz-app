/**
 * Factory for creating LangChain chat models based on configuration
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  getLLMConfig,
  getLLMProvider,
  getAzureConfig,
  type LLMProvider,
} from './llm.config';

export interface CreateLLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

/**
 * Create a LangChain chat model based on the configured provider
 */
export async function createLLM(options?: CreateLLMOptions): Promise<BaseChatModel> {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;
  const temperature = options?.temperature ?? config.temperature;

  switch (provider) {
    case 'openai': {
      const { ChatOpenAI } = await import('@langchain/openai');
      return new ChatOpenAI({
        apiKey: config.apiKey || 'sk-proj-',
        model,
        temperature,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      });
    }

    case 'anthropic': {
      const { ChatAnthropic } = await import('@langchain/anthropic');
      return new ChatAnthropic({
        apiKey: config.apiKey,
        model,
        temperature,
        ...(config.baseUrl ? { anthropicApiUrl: config.baseUrl } : {}),
      });
    }

    case 'google': {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      return new ChatGoogleGenerativeAI({
        apiKey: config.apiKey,
        model,
        temperature,
      });
    }

    case 'azure': {
      const { AzureChatOpenAI } = await import('@langchain/openai');
      const azureConfig = getAzureConfig();
      return new AzureChatOpenAI({
        azureOpenAIApiKey: azureConfig.apiKey,
        azureOpenAIApiDeploymentName: azureConfig.deploymentName,
        azureOpenAIEndpoint: azureConfig.endpoint,
        azureOpenAIApiVersion: azureConfig.apiVersion,
        temperature,
      });
    }

    case 'ollama': {
      const { ChatOllama } = await import('@langchain/ollama');
      return new ChatOllama({
        model,
        baseUrl: config.baseUrl || 'http://localhost:11434',
        temperature,
      });
    }

    case 'groq': {
      const { ChatGroq } = await import('@langchain/groq');
      return new ChatGroq({
        apiKey: config.apiKey,
        model,
        temperature,
      });
    }

    default: {
      // Default to OpenAI
      const { ChatOpenAI } = await import('@langchain/openai');
      return new ChatOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY || 'sk-proj-',
        model,
        temperature,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      });
    }
  }
}

/**
 * Create a LangChain chat model synchronously based on configured provider
 * Supports all providers using synchronous require()
 */
export function createLLMSync(options?: CreateLLMOptions) {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;
  const temperature = options?.temperature ?? config.temperature;

  switch (provider) {
    case 'openai': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatOpenAI } = require('@langchain/openai');
      return new ChatOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY || 'sk-proj-',
        model,
        temperature,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      });
    }

    case 'anthropic': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatAnthropic } = require('@langchain/anthropic');
      return new ChatAnthropic({
        apiKey: config.apiKey,
        model,
        temperature,
        ...(config.baseUrl ? { anthropicApiUrl: config.baseUrl } : {}),
      });
    }

    case 'google': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      return new ChatGoogleGenerativeAI({
        apiKey: config.apiKey,
        model,
        temperature,
      });
    }

    case 'azure': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AzureChatOpenAI } = require('@langchain/openai');
      const azureConfig = getAzureConfig();
      return new AzureChatOpenAI({
        azureOpenAIApiKey: azureConfig.apiKey,
        azureOpenAIApiDeploymentName: azureConfig.deploymentName,
        azureOpenAIEndpoint: azureConfig.endpoint,
        azureOpenAIApiVersion: azureConfig.apiVersion,
        temperature,
      });
    }

    case 'ollama': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatOllama } = require('@langchain/ollama');
      return new ChatOllama({
        model,
        baseUrl: config.baseUrl || 'http://localhost:11434',
        temperature,
      });
    }

    case 'groq': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatGroq } = require('@langchain/groq');
      return new ChatGroq({
        apiKey: config.apiKey,
        model,
        temperature,
      });
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatOpenAI } = require('@langchain/openai');
      return new ChatOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY || 'sk-proj-',
        model,
        temperature,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      });
    }
  }
}

/**
 * LLMFactory class for static access
 */
export class LLMFactory {
  /**
   * Create a LangChain chat model based on configuration (async)
   */
  static async createLLM(options?: CreateLLMOptions): Promise<BaseChatModel> {
    return createLLM(options);
  }

  /**
   * Create a LangChain chat model synchronously based on configured provider
   */
  static createLLMSync(options?: CreateLLMOptions) {
    return createLLMSync(options);
  }

  /**
   * Get the currently configured provider
   */
  static getProvider(): LLMProvider {
    return getLLMProvider();
  }
}
