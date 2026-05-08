'use client';

import { Button } from '@gitroom/react/form/button';
import React, { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import useSWR from 'swr';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';

type Mode = 'T2V' | 'I2V';
type AspectRatio = '1:1' | '9:16' | '16:9';

interface VideoModalProps {
  close: () => void;
  setLoading: (v: boolean) => void;
  onChange: (params: { id: string; path: string }) => void;
}

interface ConfiguredVideo {
  configured: boolean;
  model?: string;
  modelLabel?: string;
  enrichDefault?: boolean;
}

/**
 * Lê a credencial efetiva de VIDEO para mostrar o modelo configurado e
 * o default de enrich. Reaproveita o endpoint /ai/credentials/:kind/effective
 * já existente no backend.
 */
const useVideoCredential = () => {
  const fetch = useFetch();
  const loader = useCallback(async (): Promise<ConfiguredVideo> => {
    try {
      const res = await fetch('/ai/credentials/VIDEO/effective');
      if (!res.ok) return { configured: false };
      const data = await res.json();
      if (!data?.provider) return { configured: false };
      return {
        configured: true,
        model: data.model ?? undefined,
        modelLabel:
          data.model === 'bytedance/seedance-2'
            ? 'Seedance 2.0'
            : data.model === 'bytedance/seedance-2-fast'
            ? 'Seedance 2 Fast'
            : data.model === 'veo3'
            ? 'Veo 3.1'
            : data.model,
        enrichDefault: data.options?.enrichPromptByDefault !== false,
      };
    } catch {
      return { configured: false };
    }
  }, [fetch]);
  return useSWR('ai-video-effective-credential', loader, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
};

const VideoModal: FC<VideoModalProps> = ({ close, setLoading, onChange }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const setLocked = useLaunchStore((p) => p.setLocked);

  const { data: cred } = useVideoCredential();

  const [mode, setMode] = useState<Mode>('T2V');
  const [prompt, setPrompt] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [enrichPrompt, setEnrichPrompt] = useState<boolean>(true);
  const [loading, setLocalLoading] = useState(false);

  // Sincroniza enrich default da credencial (so primeira vez)
  React.useEffect(() => {
    if (cred?.configured && cred.enrichDefault !== undefined) {
      setEnrichPrompt(cred.enrichDefault);
    }
  }, [cred?.configured]);

  const isI2VValid = useMemo(() => {
    if (mode !== 'I2V') return true;
    try {
      const u = new URL(referenceImageUrl.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, [mode, referenceImageUrl]);

  const canGenerate =
    !loading && prompt.trim().length >= 3 && isI2VValid;

  const handleResponse = useCallback(
    async (res: Response): Promise<boolean> => {
      if (res.ok) return true;
      const detail = await res.json().catch(() => ({} as any));
      // NestJS ValidationPipe envia message como array; concatenamos pra
      // que o toast nao mostre "[object Object]" ou similar.
      const backendMessage: string | undefined = Array.isArray(detail?.message)
        ? detail.message.join(' · ')
        : typeof detail?.message === 'string'
        ? detail.message
        : undefined;

      if (res.status === 412 || res.status === 402) {
        toaster.show(
          backendMessage ||
            t(
              'ai_video_not_configured',
              'Configure suas chaves em Settings > AI Provider > Vídeo'
            ),
          'warning'
        );
        return false;
      }
      if (res.status === 429) {
        toaster.show(
          backendMessage ||
            t(
              'ai_video_rate_limit',
              'Aguarde um instante antes de gerar outro vídeo.'
            ),
          'warning'
        );
        return false;
      }
      if (res.status === 504) {
        toaster.show(
          backendMessage ||
            t(
              'ai_video_timeout',
              'Geração demorou demais (>10min). Tente novamente.'
            ),
          'warning'
        );
        return false;
      }
      // Para 502 (kie.ai) e outros — sempre prefere a mensagem do backend
      // (o AiVideoService traduz codigos comuns do kie.ai pra portugues).
      toaster.show(
        backendMessage ||
          t(
            'ai_video_upstream_error',
            'kie.ai falhou ao gerar o vídeo. Tente novamente em alguns minutos.'
          ),
        'warning'
      );
      return false;
    },
    [toaster, t]
  );

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLocalLoading(true);
    setLoading(true);
    setLocked(true);
    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        mode,
        aspectRatio,
        enrichPrompt,
      };
      if (mode === 'I2V') {
        body.referenceImageUrl = referenceImageUrl.trim();
      }
      const res = await fetch('/ai/video/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const ok = await handleResponse(res);
      if (!ok) return;
      const data = await res.json();
      if (!data?.id || !data?.path) {
        toaster.show(
          t('ai_video_invalid_response', 'Resposta inválida do servidor'),
          'warning'
        );
        return;
      }
      onChange({ id: data.id, path: data.path });
      toaster.show(t('ai_video_done', 'Vídeo gerado'), 'success');
      close();
    } catch (err) {
      toaster.show(
        t('ai_video_generic_error', 'Erro ao gerar vídeo'),
        'warning'
      );
    } finally {
      setLocalLoading(false);
      setLoading(false);
      setLocked(false);
    }
  }, [
    canGenerate,
    mode,
    prompt,
    aspectRatio,
    enrichPrompt,
    referenceImageUrl,
    fetch,
    handleResponse,
    onChange,
    close,
    setLocked,
    setLoading,
    toaster,
    t,
  ]);

  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex bg-black/50">
      <div>
        <div className="flex gap-[14px] flex-col w-[600px] max-h-[85vh] overflow-y-auto bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
          <div className="flex sticky top-0 bg-sixth z-[1] pt-[20px] -mt-[20px]">
            <div className="flex-1">
              <TopTitle title={t('ai_video_modal_title', 'Gerar vídeo com IA')} />
            </div>
            <button
              onClick={close}
              className="outline-none absolute end-[10px] top-[10px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close"
              type="button"
            >
              <svg viewBox="0 0 15 15" fill="none" width="16" height="16">
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Modelo configurado */}
          {cred?.configured ? (
            <div className="flex items-center justify-between bg-newColColor border border-fifth rounded-[6px] px-[12px] py-[8px]">
              <div className="text-[12px] text-customColor18">
                {t('ai_video_model_label', 'Modelo configurado')}
              </div>
              <div className="text-[13px] font-semibold">
                {cred.modelLabel ?? cred.model ?? '—'}
              </div>
            </div>
          ) : (
            <div className="bg-newColColor border border-customColor19 rounded-[6px] px-[12px] py-[8px] text-[13px] text-customColor19">
              {t(
                'ai_video_no_credential',
                'Nenhum modelo de vídeo configurado. Vá em Settings > AI Provider > Vídeo para configurar.'
              )}
            </div>
          )}

          {/* Tabs T2V / I2V */}
          <div className="grid grid-cols-2 gap-[8px] p-[4px] bg-newColColor rounded-[8px]">
            <ModeTab
              active={mode === 'T2V'}
              onClick={() => setMode('T2V')}
              disabled={loading}
              label={t('ai_video_tab_t2v', 'Texto → Vídeo')}
              hint={t(
                'ai_video_tab_t2v_hint',
                'Gera vídeo a partir de prompt'
              )}
              icon={<TextIcon />}
            />
            <ModeTab
              active={mode === 'I2V'}
              onClick={() => setMode('I2V')}
              disabled={loading}
              label={t('ai_video_tab_i2v', 'Imagem → Vídeo')}
              hint={t(
                'ai_video_tab_i2v_hint',
                'Anima uma imagem de referência'
              )}
              icon={<ImageIcon />}
            />
          </div>

          {/* Prompt */}
          <FieldRow
            label={t('ai_video_prompt_label', 'Descrição do vídeo')}
          >
            <textarea
              className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[14px] py-[10px] outline-none text-[14px] min-h-[100px] resize-none"
              placeholder={t(
                'ai_video_prompt_placeholder',
                'ex: drone shot of a beach at sunset, palm trees swaying, golden hour'
              )}
              value={prompt}
              disabled={loading}
              maxLength={2000}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </FieldRow>

          {/* I2V: reference image URL */}
          {mode === 'I2V' && (
            <FieldRow
              label={t('ai_video_reference_label', 'URL da imagem de referência')}
            >
              <input
                type="url"
                className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[14px] py-[10px] outline-none text-[14px]"
                placeholder="https://..."
                value={referenceImageUrl}
                disabled={loading}
                onChange={(e) => setReferenceImageUrl(e.target.value)}
              />
              {referenceImageUrl && !isI2VValid && (
                <div className="text-[12px] text-customColor19 mt-[4px]">
                  {t(
                    'ai_video_reference_invalid',
                    'URL inválida (use http:// ou https://).'
                  )}
                </div>
              )}
            </FieldRow>
          )}

          {/* Aspect ratio */}
          <FieldRow label={t('ai_video_aspect_label', 'Proporção')}>
            <div className="flex gap-[8px]">
              {(['1:1', '9:16', '16:9'] as const).map((ar) => (
                <label
                  key={ar}
                  className={clsx(
                    'flex items-center gap-[6px] px-[14px] py-[8px] rounded-[6px] border cursor-pointer transition-colors',
                    aspectRatio === ar
                      ? 'border-btnPrimary bg-newColColor'
                      : 'border-newTableBorder hover:bg-newColColor',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="radio"
                    name="ai-video-aspect"
                    value={ar}
                    checked={aspectRatio === ar}
                    disabled={loading}
                    onChange={() => setAspectRatio(ar)}
                    className="accent-btnPrimary"
                  />
                  <span className="text-[14px]">{ar}</span>
                </label>
              ))}
            </div>
            <div className="text-[11px] text-customColor18 mt-[4px]">
              {t(
                'ai_video_aspect_hint',
                '1:1 feed Instagram · 9:16 Stories/Reels/TikTok · 16:9 YouTube/LinkedIn'
              )}
            </div>
          </FieldRow>

          {/* Enrich prompt toggle */}
          <label className="flex items-start gap-[8px] cursor-pointer">
            <input
              type="checkbox"
              className="w-[16px] h-[16px] mt-[2px] accent-btnPrimary"
              checked={enrichPrompt}
              disabled={loading}
              onChange={(e) => setEnrichPrompt(e.target.checked)}
            />
            <div className="flex flex-col">
              <span className="text-[14px]">
                {t(
                  'ai_video_enrich_toggle',
                  'Enriquecer prompt automaticamente'
                )}
              </span>
              <span className="text-[11px] text-customColor18">
                {t(
                  'ai_video_enrich_hint',
                  'Adiciona detalhes de cinematografia (câmera, iluminação, ritmo) usando o LLM configurado em Texto.'
                )}
              </span>
            </div>
          </label>

          <Button
            type="button"
            onClick={generate}
            loading={loading}
            disabled={!canGenerate || !cred?.configured}
          >
            {t('ai_video_btn_generate', 'Gerar vídeo')}
          </Button>

          <div className="text-[11px] text-customColor18 text-center">
            {t(
              'ai_video_loading_hint',
              'A geração pode levar até 10 minutos.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ModeTab: FC<{
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> = ({ active, disabled, onClick, label, hint, icon }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={clsx(
      'flex items-center gap-[10px] px-[12px] py-[10px] rounded-[6px] text-start transition-all',
      active
        ? 'bg-sixth shadow-sm text-textColor'
        : 'text-customColor18 hover:text-textColor',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span
      className={clsx(
        'flex w-[28px] h-[28px] items-center justify-center rounded-[6px] flex-shrink-0',
        active ? 'bg-newColColor' : 'bg-newColColor/40'
      )}
    >
      {icon}
    </span>
    <span className="flex flex-col leading-tight overflow-hidden">
      <span className="text-[13px] font-semibold truncate">{label}</span>
      <span className="text-[11px] text-customColor18 truncate">{hint}</span>
    </span>
  </button>
);

const TextIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4H13M3 8H10M3 12H8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ImageIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect
      x="2"
      y="3"
      width="12"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <circle cx="6" cy="7" r="1.2" fill="currentColor" />
    <path
      d="M3 12L6.5 8.5L9 11L11 9L13 11"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

const FieldRow: FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-[6px]">
    {label && <div className="text-[13px] text-customColor18">{label}</div>}
    {children}
  </div>
);

export const AiVideo: FC<{
  value: string;
  onChange: (params: { id: string; path: string }) => void;
}> = ({ value, onChange }) => {
  const t = useT();
  const fetch = useFetch();
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isTrailing } = useUser();

  const loadVideoCredits = useCallback(async () => {
    return (
      await fetch('/copilot/credits?type=ai_videos', { method: 'GET' })
    ).json();
  }, [fetch]);
  const { data: creditData } = useSWR('video-credits-outer', loadVideoCredits);

  const isUnlimited = !creditData || creditData.credits >= 999999;
  const hasCredits = isUnlimited || creditData.credits > 0;

  return (
    <>
      {modal && (
        <VideoModal
          close={() => setModal(false)}
          setLoading={setLoading}
          onChange={onChange}
        />
      )}
      <div className="relative group">
        <div
          {...(!hasCredits
            ? {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': t(
                  'ai_credits_limit_reached',
                  'Limit reached'
                ),
              }
            : {})}
          className={clsx(
            'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]',
            !hasCredits && 'opacity-50 pointer-events-none'
          )}
          onClick={() => hasCredits && setModal(true)}
        >
          {loading && (
            <div className="absolute start-[50%] -translate-x-[50%]">
              <Loading height={30} width={30} type="spin" color="#fff" />
            </div>
          )}
          <div
            className={clsx(
              'flex gap-[5px] items-center',
              loading && 'invisible'
            )}
          >
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_2352_53058)">
                  <path
                    d="M8.06916 14.1663V2.04134M4.97208 14.1663V11.1351M4.97208 5.07259V2.04134M11.1662 14.1663V11.1351M9.09973 2.02152L4.8482 2.04134C3.80748 2.04134 3.28712 2.04134 2.88962 2.23957C2.53997 2.41394 2.25569 2.69218 2.07754 3.0344C1.875 3.42345 1.875 3.93275 1.875 4.95134L1.875 11.2563C1.875 12.2749 1.875 12.7842 2.07754 13.1733C2.25569 13.5155 2.53997 13.7937 2.88962 13.9681C3.28712 14.1663 3.80748 14.1663 4.8482 14.1663H11.2901C12.3308 14.1663 12.8512 14.1663 13.2487 13.9681C13.5984 13.7937 13.8826 13.5155 14.0608 13.1733C14.2633 12.7842 14.2633 12.2749 14.2633 11.2563V7.61426M1.875 5.07259L9.09973 5.06116M1.875 11.1351H14.2633M12.8141 1.20801L12.3949 2.02152C12.253 2.29684 12.1821 2.4345 12.0873 2.55379C12.0032 2.65965 11.9054 2.75455 11.7963 2.83614C11.6734 2.92809 11.5315 2.99692 11.2478 3.13458L10.4094 3.54134L11.2478 3.9481C11.5315 4.08576 11.6734 4.15459 11.7963 4.24654C11.9054 4.32814 12.0032 4.42303 12.0873 4.52889C12.1821 4.64818 12.253 4.78584 12.3949 5.06116L12.8141 5.87467L13.2333 5.06116C13.3751 4.78584 13.4461 4.64818 13.5408 4.52889C13.6249 4.42303 13.7227 4.32814 13.8318 4.24654C13.9548 4.15459 14.0966 4.08576 14.3804 3.9481L15.2188 3.54134L14.3804 3.13458C14.0966 2.99692 13.9548 2.92809 13.8318 2.83614C13.7227 2.75455 13.6249 2.65965 13.5408 2.55379C13.4461 2.4345 13.3751 2.29684 13.2333 2.02152L12.8141 1.20801Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2352_53058">
                    <rect width="16" height="16" fill="currentColor" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="text-[10px] font-[600] iconBreak:hidden block">
              {t('ai', 'AI')} Video
            </div>
          </div>
        </div>
        {!isUnlimited && creditData && creditData.credits > 0 && (
          <div className="text-[10px] text-customColor18 mt-[2px] text-center">
            {t(
              'ai_credits_remaining',
              '{{count}} credits remaining this month'
            ).replace('{{count}}', String(creditData.credits))}
          </div>
        )}
        {!hasCredits && (
          <div className="text-[10px] text-customColor19 mt-[2px] text-center">
            {t('ai_credits_limit_reached', 'Limit reached')}
          </div>
        )}
      </div>
    </>
  );
};
