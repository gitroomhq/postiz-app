/**
 * Centralized OpenAI SDK configuration.
 *
 * Returns the API key and optional base URL so all OpenAI-compatible clients
 * (openai, @langchain/openai, @copilotkit/runtime, @ai-sdk/openai) can be
 * redirected to an OpenAI-compatible endpoint such as LiteLLM, Azure OpenAI,
 * OpenRouter, or a self-hosted gateway.
 *
 * Set OPENAI_API_URL to the alternative base URL (e.g. http://localhost:4000/v1).
 * Leave unset for the default https://api.openai.com/v1.
 */

export const openAIApiKey = (): string =>
  process.env.OPENAI_API_KEY || 'sk-proj-';

export const openAIBaseURL = (): string | undefined =>
  process.env.OPENAI_API_URL || undefined;

/**
 * LangChain-style configuration object.
 * Use as: new ChatOpenAI({ apiKey: openAIApiKey(), configuration: openAIConfiguration(), ... })
 */
export const openAIConfiguration = () => {
  const baseURL = openAIBaseURL();
  return baseURL ? { baseURL } : undefined;
};
