'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AiKindCard } from '@gitroom/frontend/components/settings/ai-provider/ai-kind-card.component';

const TextIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 6h14M5 12h14M5 18h10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const ImageIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path
      d="M21 15l-5-5L5 21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="5"
      width="14"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M17 9l4-3v12l-4-3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M21 21l-4.35-4.35"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const AiProviderSettingsSection: React.FC = () => {
  const t = useT();

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <h3 className="text-[20px] font-semibold">
          {t('ai_provider_title', 'AI Provider')}
        </h3>
        <p className="text-[14px] text-customColor18">
          {t(
            'ai_provider_description',
            'Configure as chaves e modelos de IA'
          )}
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <AiKindCard
          kind="TEXT"
          title={t('ai_provider_text_title', 'Geração de texto')}
          description={t(
            'ai_provider_text_desc',
            'Modelo de LLM para geração de texto, utilizado pelo Agent.'
          )}
          icon={<TextIcon />}
          providers={[
            { value: 'openrouter', label: 'OpenRouter' },
            { value: 'openai', label: 'OpenAI' },
          ]}
        />

        <AiKindCard
          kind="IMAGE"
          title={t('ai_provider_image_title', 'Imagem')}
          description={t(
            'ai_provider_image_desc',
            'Geração de imagens (GPT-image, Gemini Nano Banana, Flux, etc).'
          )}
          icon={<ImageIcon />}
          providers={[
            { value: 'openrouter', label: 'OpenRouter' },
            { value: 'openai', label: 'OpenAI' },
          ]}
        />

        <AiKindCard
          kind="VIDEO"
          title={t('ai_provider_video_title', 'Vídeo')}
          description={t(
            'ai_provider_video_desc',
            'Geração de vídeo via KieAI (Seedance 2.0, Veo 3.1). Suporta texto-para-vídeo (T2V) e imagem-para-vídeo (I2V).'
          )}
          icon={<VideoIcon />}
          providers={[{ value: 'kieai', label: 'KieAI' }]}
        />

        <AiKindCard
          kind="WEB_SEARCH"
          title={t('ai_provider_web_search_title', 'Web Search')}
          description={t(
            'ai_provider_web_search_desc',
            'Busca web do agente (Tavily). Usado quando o usuário pede um post a partir de uma URL ou de uma pesquisa.'
          )}
          icon={<SearchIcon />}
          providers={[{ value: 'tavily', label: 'Tavily' }]}
        />
      </div>

      <div className="text-[12px] text-customColor18 mt-[8px] border-t border-fifth pt-[12px]">
        {t(
          'ai_provider_footer_hint',
          'As chaves são armazenadas criptografadas (AES-256-GCM) e nunca expostas no frontend. Status do último teste fica visível na barra superior de cada card.'
        )}
      </div>
    </div>
  );
};
