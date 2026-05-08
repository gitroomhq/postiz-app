import { AiKind } from '@prisma/client';
import { CatalogModel } from './ai-catalog.types';

const OPENAI_TEXT: CatalogModel[] = [
  {
    id: 'gpt-5.5',
    displayName: 'GPT-5.5',
    provider: 'openai',
    kind: 'TEXT',
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [
      'temperature',
      'top_p',
      'max_tokens',
      'reasoning_effort',
      'verbosity',
      'tools',
      'response_format',
    ],
  },
  {
    id: 'gpt-5.4',
    displayName: 'GPT-5.4',
    provider: 'openai',
    kind: 'TEXT',
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [
      'temperature',
      'top_p',
      'max_tokens',
      'tools',
      'response_format',
    ],
  },
  {
    id: 'gpt-4.1',
    displayName: 'GPT-4.1 (legacy fallback)',
    provider: 'openai',
    kind: 'TEXT',
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [
      'temperature',
      'top_p',
      'max_tokens',
      'tools',
      'response_format',
    ],
  },
];

const OPENAI_IMAGE: CatalogModel[] = [
  {
    id: 'gpt-image-2',
    displayName: 'GPT Image 2',
    provider: 'openai',
    kind: 'IMAGE',
    outputModalities: ['image'],
    imageConfig: {
      aspectRatios: ['1:1', '9:16', '16:9'],
      sizes: ['low', 'medium', 'high'],
    },
  },
  {
    id: 'gpt-image-1-mini',
    displayName: 'GPT Image 1 mini',
    provider: 'openai',
    kind: 'IMAGE',
    outputModalities: ['image'],
    imageConfig: {
      aspectRatios: ['1:1', '9:16', '16:9'],
      sizes: ['low', 'medium', 'high'],
    },
  },
];

const TAVILY_WEB_SEARCH: CatalogModel[] = [
  {
    id: 'tavily-default',
    displayName: 'Tavily Search',
    provider: 'tavily',
    kind: 'WEB_SEARCH',
    supportedParameters: ['max_results', 'depth', 'include_raw_content'],
  },
];

const KIEAI_VIDEO: CatalogModel[] = [
  {
    id: 'bytedance/seedance-2',
    displayName: 'Seedance 2.0 (qualidade)',
    provider: 'kieai',
    kind: 'VIDEO',
    outputModalities: ['video'],
  },
  {
    id: 'bytedance/seedance-2-fast',
    displayName: 'Seedance 2 Fast (economico)',
    provider: 'kieai',
    kind: 'VIDEO',
    outputModalities: ['video'],
  },
  {
    id: 'veo3',
    displayName: 'Google Veo 3.1',
    provider: 'kieai',
    kind: 'VIDEO',
    outputModalities: ['video'],
  },
  {
    id: 'veo3_fast',
    displayName: 'Google Veo 3.1 Fast',
    provider: 'kieai',
    kind: 'VIDEO',
    outputModalities: ['video'],
  },
  {
    id: 'veo3_lite',
    displayName: 'Google Veo 3.1 Lite',
    provider: 'kieai',
    kind: 'VIDEO',
    outputModalities: ['video'],
  },
];

export const STATIC_CATALOGS: Record<string, Partial<Record<AiKind, CatalogModel[]>>> = {
  openai: {
    TEXT: OPENAI_TEXT,
    IMAGE: OPENAI_IMAGE,
  },
  tavily: {
    WEB_SEARCH: TAVILY_WEB_SEARCH,
  },
  kieai: {
    VIDEO: KIEAI_VIDEO,
  },
};

export function getStaticCatalog(
  provider: string,
  kind: AiKind
): CatalogModel[] | null {
  const byProvider = STATIC_CATALOGS[provider];
  if (!byProvider) return null;
  return byProvider[kind] ?? null;
}
