import { ChatOpenAI } from '@langchain/openai';
import OpenAI from 'openai';

export const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-4.1';
export const DEFAULT_OPENAI_INSERT_MODEL = 'gpt-4o-2024-08-06';
export const DEFAULT_OPENAI_IMAGE_MODEL = 'chatgpt-image-latest';
export const DEFAULT_ATLASCLOUD_BASE_URL = 'https://api.atlascloud.ai/v1';
export const DEFAULT_ATLASCLOUD_TEXT_MODEL = 'deepseek-ai/deepseek-v4-pro';

const firstNonEmpty = (...values: Array<string | undefined>) =>
  values.find((value) => value?.trim())?.trim();

const getConfiguredTextAiBaseURL = () =>
  firstNonEmpty(
    process.env.POSTIZ_AI_BASE_URL,
    process.env.ATLASCLOUD_BASE_URL,
    process.env.ATLAS_CLOUD_BASE_URL
  );

const hasAtlasCloudConfig = () => {
  const baseURL = getConfiguredTextAiBaseURL();

  return !!(
    process.env.ATLASCLOUD_API_KEY ||
    process.env.ATLAS_CLOUD_API_KEY ||
    process.env.ATLASCLOUD_MODEL ||
    process.env.ATLAS_CLOUD_MODEL ||
    process.env.ATLASCLOUD_BASE_URL ||
    process.env.ATLAS_CLOUD_BASE_URL ||
    baseURL?.toLowerCase().includes('atlascloud.ai')
  );
};

export const getTextAiBaseURL = () =>
  getConfiguredTextAiBaseURL() ||
  (hasAtlasCloudConfig() ? DEFAULT_ATLASCLOUD_BASE_URL : undefined);

export const hasTextAiApiKey = () =>
  !!firstNonEmpty(
    process.env.POSTIZ_AI_API_KEY,
    process.env.ATLASCLOUD_API_KEY,
    process.env.ATLAS_CLOUD_API_KEY,
    process.env.OPENAI_API_KEY
  );

export const getTextAiApiKey = () =>
  firstNonEmpty(
    process.env.POSTIZ_AI_API_KEY,
    process.env.ATLASCLOUD_API_KEY,
    process.env.ATLAS_CLOUD_API_KEY,
    process.env.OPENAI_API_KEY
  ) || 'sk-proj-';

export const getTextAiModel = (defaultModel = DEFAULT_OPENAI_TEXT_MODEL) =>
  firstNonEmpty(
    process.env.POSTIZ_AI_MODEL,
    process.env.ATLASCLOUD_MODEL,
    process.env.ATLAS_CLOUD_MODEL
  ) || (hasAtlasCloudConfig() ? DEFAULT_ATLASCLOUD_TEXT_MODEL : defaultModel);

export const getImageAiApiKey = () => process.env.OPENAI_API_KEY || 'sk-proj-';

export const createTextOpenAIClient = () => {
  const baseURL = getTextAiBaseURL();

  return new OpenAI({
    apiKey: getTextAiApiKey(),
    ...(baseURL ? { baseURL } : {}),
  });
};

export const createImageOpenAIClient = () =>
  new OpenAI({
    apiKey: getImageAiApiKey(),
  });

export const createTextChatOpenAI = (
  defaultModel = DEFAULT_OPENAI_TEXT_MODEL,
  temperature?: number
) => {
  const baseURL = getTextAiBaseURL();

  return new ChatOpenAI({
    apiKey: getTextAiApiKey(),
    model: getTextAiModel(defaultModel),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(baseURL ? { configuration: { baseURL } } : {}),
  });
};
