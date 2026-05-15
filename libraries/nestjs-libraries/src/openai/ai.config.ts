import { createOpenAI } from '@ai-sdk/openai';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import OpenAI from 'openai';

type AiScope =
  | 'default'
  | 'copilot'
  | 'agent'
  | 'classifier'
  | 'autopost'
  | 'image';

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const SCOPE_PREFIX: Record<AiScope, string | undefined> = {
  default: undefined,
  copilot: 'AI_COPILOT',
  agent: 'AI_AGENT',
  classifier: 'AI_CLASSIFIER',
  autopost: 'AI_AUTOPOST',
  image: 'AI_IMAGE',
};

const getScopedValue = (
  scope: AiScope,
  key: 'API_KEY' | 'BASE_URL' | 'MODEL',
  legacyKeys: string[] = []
) => {
  const scopedPrefix = SCOPE_PREFIX[scope];
  const scopedKey = scopedPrefix ? `${scopedPrefix}_${key}` : undefined;

  return readEnv(
    ...(scopedKey ? [scopedKey] : []),
    `AI_${key}`,
    ...legacyKeys
  );
};

const getBaseURL = (scope: AiScope = 'default') =>
  getScopedValue(scope, 'BASE_URL', ['OPENAI_BASE_URL']);

const getLangChainClientOptions = (scope: AiScope = 'default') => {
  const baseURL = getBaseURL(scope);
  return baseURL ? { configuration: { baseURL } } : {};
};

export const hasAiApiKey = (scope: AiScope = 'default') =>
  !!getScopedValue(scope, 'API_KEY', ['OPENAI_API_KEY']);

export const getAiApiKey = (scope: AiScope = 'default') =>
  getScopedValue(scope, 'API_KEY', ['OPENAI_API_KEY']) || 'sk-proj-';

export const getAiBaseUrl = (scope: AiScope = 'default') => getBaseURL(scope);

export const getAiChatModel = () =>
  getScopedValue('default', 'MODEL', ['OPENAI_MODEL']) || 'gpt-4.1';

export const getAiImageModel = () =>
  getScopedValue('image', 'MODEL', ['OPENAI_IMAGE_MODEL']) || 'dall-e-3';

export const getAiCopilotModel = () =>
  getScopedValue('copilot', 'MODEL', ['OPENAI_MODEL']) || 'gpt-4.1';

export const getAiMastraAgentModel = () =>
  getScopedValue('agent', 'MODEL', ['OPENAI_MODEL']) || 'gpt-5.2';

export const getAiGraphModel = () =>
  getScopedValue('agent', 'MODEL', ['OPENAI_MODEL']) || 'gpt-4.1';

export const getAiClassifierModel = () =>
  getScopedValue('classifier', 'MODEL', ['OPENAI_MODEL']) ||
  'gpt-4o-2024-08-06';

export const getAiAutopostModel = () =>
  getScopedValue('autopost', 'MODEL', ['OPENAI_MODEL']) || 'gpt-4.1';

export const getAiAutopostImageModel = () =>
  getScopedValue('image', 'MODEL', ['OPENAI_IMAGE_MODEL']) || 'gpt-image-1';

export const hasAiImageApiKey = () => hasAiApiKey('image');

export const getAiSdkOpenAIProvider = (scope: AiScope = 'default') =>
  createOpenAI({
    apiKey: getAiApiKey(scope),
    ...(getBaseURL(scope) ? { baseURL: getBaseURL(scope) } : {}),
  });

export const getOpenAIClient = (scope: AiScope = 'default') =>
  new OpenAI({
    apiKey: getAiApiKey(scope),
    baseURL: getBaseURL(scope) || undefined,
  });

export const createLangChainChatModel = (
  scope: AiScope,
  model: string,
  temperature = 0
) =>
  new ChatOpenAI({
    apiKey: getAiApiKey(scope),
    model,
    temperature,
    ...getLangChainClientOptions(scope),
  });

export const createLangChainImageModel = (model: string, scope: AiScope = 'image') =>
  new DallEAPIWrapper({
    apiKey: getAiApiKey(scope),
    model,
    ...getLangChainClientOptions(scope),
  } as any);

export const getFalApiKey = () => readEnv('AI_VIDEO_IMAGE_API_KEY', 'FAL_KEY') || '';

export const hasFalApiKey = () => !!getFalApiKey();

export const getFalBaseUrl = () =>
  readEnv('AI_VIDEO_IMAGE_BASE_URL', 'FAL_BASE_URL') || 'https://fal.run/fal-ai';

export const getFalImageModel = () =>
  readEnv('AI_VIDEO_IMAGE_MODEL', 'FAL_IMAGE_MODEL') || 'ideogram/v2';

export const getVoiceApiKey = () =>
  readEnv('AI_VOICE_API_KEY', 'ELEVENSLABS_API_KEY') || '';

export const hasVoiceApiKey = () => !!getVoiceApiKey();

export const getAssemblyAuthKey = () =>
  readEnv('AI_ASSEMBLY_AUTH_KEY', 'TRANSLOADIT_AUTH') || 'just empty text';

export const getAssemblyAuthSecret = () =>
  readEnv('AI_ASSEMBLY_AUTH_SECRET', 'TRANSLOADIT_SECRET') ||
  'just empty text';

export const hasAssemblyAuth = () =>
  !!readEnv('AI_ASSEMBLY_AUTH_KEY', 'TRANSLOADIT_AUTH') &&
  !!readEnv('AI_ASSEMBLY_AUTH_SECRET', 'TRANSLOADIT_SECRET');

export const getAiVideoApiKey = () =>
  readEnv('AI_VIDEO_API_KEY', 'KIEAI_API_KEY') || '';

export const hasAiVideoApiKey = () => !!getAiVideoApiKey();

export const getAiVideoBaseUrl = () =>
  readEnv('AI_VIDEO_BASE_URL') || 'https://api.kie.ai/api/v1';

export const getAiVideoModel = () =>
  readEnv('AI_VIDEO_MODEL') || 'veo3_fast';
