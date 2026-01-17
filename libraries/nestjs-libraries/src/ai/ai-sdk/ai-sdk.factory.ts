/**
 * Factory for creating Vercel AI SDK models (used by Mastra)
 */

import { getLLMConfig, getLLMProvider, type LLMProvider } from '../llm/llm.config';

export interface CreateAISdkModelOptions {
  provider?: LLMProvider;
  model?: string;
}

/**
 * Create a Vercel AI SDK model based on the configured provider
 * Returns a model compatible with Mastra Agent
 */
export async function createAISdkModel(options?: CreateAISdkModelOptions) {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;

  switch (provider) {
    case 'openai': {
      const { openai } = await import('@ai-sdk/openai');
      return openai(model);
    }

    case 'anthropic': {
      const { anthropic } = await import('@ai-sdk/anthropic');
      return anthropic(model);
    }

    case 'google': {
      const { google } = await import('@ai-sdk/google');
      return google(model);
    }

    case 'azure': {
      const { azure } = await import('@ai-sdk/azure');
      return azure(model);
    }

    case 'groq': {
      // Groq uses OpenAI-compatible API
      const { createOpenAI } = await import('@ai-sdk/openai');
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
      return groq(model);
    }

    case 'ollama': {
      // Ollama uses OpenAI-compatible API
      const { createOpenAI } = await import('@ai-sdk/openai');
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama doesn't require a real key
      });
      return ollama(model);
    }

    default: {
      // Default to OpenAI
      const { openai } = await import('@ai-sdk/openai');
      return openai(model);
    }
  }
}

/**
 * Create a Vercel AI SDK model synchronously based on configured provider
 */
export function createAISdkModelSync(options?: CreateAISdkModelOptions) {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;

  switch (provider) {
    case 'openai': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { openai } = require('@ai-sdk/openai');
      return openai(model);
    }

    case 'anthropic': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { anthropic } = require('@ai-sdk/anthropic');
      return anthropic(model);
    }

    case 'google': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { google } = require('@ai-sdk/google');
      return google(model);
    }

    case 'azure': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { azure } = require('@ai-sdk/azure');
      return azure(model);
    }

    case 'groq': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createOpenAI } = require('@ai-sdk/openai');
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
      return groq(model);
    }

    case 'ollama': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createOpenAI } = require('@ai-sdk/openai');
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
      });
      return ollama(model);
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { openai } = require('@ai-sdk/openai');
      return openai(model);
    }
  }
}

/**
 * AISdkFactory class for static access
 */
export class AISdkFactory {
  /**
   * Create a Vercel AI SDK model based on configuration (async)
   */
  static async createModel(options?: CreateAISdkModelOptions) {
    return createAISdkModel(options);
  }

  /**
   * Create a Vercel AI SDK model synchronously based on configured provider
   */
  static createModelSync(options?: CreateAISdkModelOptions) {
    return createAISdkModelSync(options);
  }

  /**
   * Get the currently configured provider
   */
  static getProvider(): LLMProvider {
    return getLLMProvider();
  }
}
