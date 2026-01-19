/**
 * Factory for creating CopilotKit service adapters
 */

import { getLLMConfig, getLLMProvider, type LLMProvider } from '../llm/llm.config';

export interface CreateAdapterOptions {
  provider?: LLMProvider;
  model?: string;
}

/**
 * Create a CopilotKit service adapter based on the configured provider
 */
export async function createCopilotAdapter(options?: CreateAdapterOptions) {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;

  // CopilotKit supports OpenAI, Anthropic, Google, and Groq adapters
  switch (provider) {
    case 'openai':
    case 'azure':
    case 'together':
    case 'mistral':
    case 'ollama': {
      // These providers use OpenAI-compatible APIs
      const { OpenAIAdapter } = await import('@copilotkit/runtime');
      return new OpenAIAdapter({ model });
    }

    case 'anthropic': {
      const { AnthropicAdapter } = await import('@copilotkit/runtime');
      return new AnthropicAdapter({ model });
    }

    case 'google': {
      const { GoogleGenerativeAIAdapter } = await import('@copilotkit/runtime');
      return new GoogleGenerativeAIAdapter({ model });
    }

    case 'groq': {
      const { GroqAdapter } = await import('@copilotkit/runtime');
      return new GroqAdapter({ model });
    }

    default: {
      const { OpenAIAdapter } = await import('@copilotkit/runtime');
      return new OpenAIAdapter({ model });
    }
  }
}

/**
 * Create a CopilotKit adapter synchronously based on configured provider
 */
export function createCopilotAdapterSync(options?: CreateAdapterOptions) {
  const config = getLLMConfig();
  const provider = options?.provider || config.provider;
  const model = options?.model || config.model;

  switch (provider) {
    case 'openai':
    case 'azure':
    case 'together':
    case 'mistral':
    case 'ollama': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OpenAIAdapter } = require('@copilotkit/runtime');
      return new OpenAIAdapter({ model });
    }

    case 'anthropic': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AnthropicAdapter } = require('@copilotkit/runtime');
      return new AnthropicAdapter({ model });
    }

    case 'google': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GoogleGenerativeAIAdapter } = require('@copilotkit/runtime');
      return new GoogleGenerativeAIAdapter({ model });
    }

    case 'groq': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GroqAdapter } = require('@copilotkit/runtime');
      return new GroqAdapter({ model });
    }

    default: {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OpenAIAdapter } = require('@copilotkit/runtime');
      return new OpenAIAdapter({ model });
    }
  }
}

/**
 * CopilotAdapterFactory class for static access
 */
export class CopilotAdapterFactory {
  /**
   * Create a CopilotKit adapter based on configuration (async)
   */
  static async createAdapter(options?: CreateAdapterOptions) {
    return createCopilotAdapter(options);
  }

  /**
   * Create a CopilotKit adapter synchronously based on configured provider
   */
  static createAdapterSync(options?: CreateAdapterOptions) {
    return createCopilotAdapterSync(options);
  }

  /**
   * Get the currently configured provider
   */
  static getProvider(): LLMProvider {
    return getLLMProvider();
  }
}
