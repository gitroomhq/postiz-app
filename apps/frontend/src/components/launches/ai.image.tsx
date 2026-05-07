'use client';

import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import useSWR from 'swr';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';

const STYLES = [
  'Realistic',
  'Cartoon',
  'Anime',
  'Fantasy',
  'Abstract',
  'Pixel Art',
  'Sketch',
  'Watercolor',
  'Minimalist',
  'Cyberpunk',
  'Monochromatic',
  'Surreal',
  'Pop Art',
  'Fantasy Realism',
];

type AspectRatio = '1:1' | '9:16' | '16:9';

const ASPECT_OPTIONS: Array<{
  value: AspectRatio;
  labelKey: string;
  fallback: string;
  hint: string;
}> = [
  {
    value: '1:1',
    labelKey: 'ai_image_aspect_square',
    fallback: 'Quadrado',
    hint: '1:1',
  },
  {
    value: '9:16',
    labelKey: 'ai_image_aspect_vertical',
    fallback: 'Vertical (Stories, Reels)',
    hint: '9:16',
  },
  {
    value: '16:9',
    labelKey: 'ai_image_aspect_horizontal',
    fallback: 'Horizontal (Post normal)',
    hint: '16:9',
  },
];

interface ModalProps {
  value: string;
  close: () => void;
  onChange: (params: { id: string; path: string }) => void;
}

const ImageModal: FC<ModalProps> = ({ value, close, onChange }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const setLocked = useLaunchStore((p) => p.setLocked);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!style || loading) return;
    setLoading(true);
    setLocked(true);
    try {
      const res = await fetch('/media/generate-image-with-prompt', {
        method: 'POST',
        body: JSON.stringify({
          prompt: `
<!-- description -->
${value}
<!-- /description -->

<!-- style -->
${style}
<!-- /style -->

`,
          aspectRatio,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        if (res.status === 412 || res.status === 402) {
          toaster.show(
            detail?.message ||
              t(
                'ai_image_not_configured',
                'Configure suas chaves em Settings > AI Provider'
              ),
            'warning'
          );
          return;
        }
        if (res.status === 429) {
          toaster.show(
            t(
              'ai_image_rate_limit',
              'Você atingiu o limite. Aguarde um instante.'
            ),
            'warning'
          );
          return;
        }
        toaster.show(
          detail?.message ||
            t('ai_image_generic_error', 'Erro ao gerar imagem'),
          'warning'
        );
        return;
      }
      const image = await res.json();
      if (!image || typeof image !== 'object' || !image.id || !image.path) {
        toaster.show(
          t('ai_image_generic_error', 'Erro ao gerar imagem'),
          'warning'
        );
        return;
      }
      onChange(image);
      close();
    } catch (err) {
      toaster.show(
        t('ai_image_generic_error', 'Erro ao gerar imagem'),
        'warning'
      );
    } finally {
      setLoading(false);
      setLocked(false);
    }
  }, [aspectRatio, style, value, loading, fetch, toaster, t, onChange, close, setLocked]);

  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex bg-black/50">
      <div>
        <div className="flex gap-[10px] flex-col w-[560px] max-h-[80vh] overflow-y-auto bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
          <div className="flex sticky top-0 bg-sixth z-[1] pt-[20px] -mt-[20px]">
            <div className="flex-1">
              <TopTitle
                title={t('ai_image_modal_title', 'Gerar imagem com IA')}
              />
            </div>
            <button
              onClick={close}
              className="outline-none absolute end-[10px] top-[10px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-primary hover:bg-tableBorder cursor-pointer mantine-Modal-close"
              type="button"
            >
              <svg
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-[6px]">
            <div className="text-[13px] text-customColor18">
              {t('ai_image_aspect_label', 'Formato')}
            </div>
            <div className="grid grid-cols-3 gap-[8px]">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  onClick={() => setAspectRatio(opt.value)}
                  className={clsx(
                    'flex flex-col gap-[4px] items-center justify-center rounded-[6px] border px-[12px] py-[10px] transition-colors',
                    aspectRatio === opt.value
                      ? 'border-btnPrimary bg-newColColor'
                      : 'border-newTableBorder hover:bg-newColColor',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <AspectIcon ratio={opt.value} active={aspectRatio === opt.value} />
                  <span className="text-[13px]">
                    {t(opt.labelKey, opt.fallback)}
                  </span>
                  <span className="text-[10px] text-customColor18">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[6px] mt-[8px]">
            <div className="text-[13px] text-customColor18">
              {t('ai_image_style_label', 'Estilo')}
            </div>
            <div className="grid grid-cols-3 gap-[6px]">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => setStyle(s)}
                  className={clsx(
                    'rounded-[6px] border px-[10px] py-[8px] text-[12px] transition-colors text-center',
                    style === s
                      ? 'border-btnPrimary bg-newColColor'
                      : 'border-newTableBorder hover:bg-newColColor',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[4px] mt-[8px]">
            <Button
              type="button"
              onClick={generate}
              loading={loading}
              disabled={!style || loading}
            >
              {t('ai_image_generate', 'Gerar imagem')}
            </Button>
            {!style && (
              <div className="text-[11px] text-customColor18 text-center">
                {t(
                  'ai_image_pick_style',
                  'Selecione um estilo para gerar'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AspectIcon: FC<{ ratio: AspectRatio; active: boolean }> = ({ ratio, active }) => {
  const stroke = active ? 'currentColor' : '#888';
  if (ratio === '1:1') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="5" width="14" height="14" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  if (ratio === '9:16') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="8" y="3" width="8" height="18" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="8" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
};

export const AiImage: FC<{
  value: string;
  onChange: (params: { id: string; path: string }) => void;
}> = (props) => {
  const t = useT();
  const { value, onChange } = props;
  const [modal, setModal] = useState(false);
  const fetch = useFetch();

  const loadImageCredits = useCallback(async () => {
    return (
      await fetch('/copilot/credits?type=ai_images', { method: 'GET' })
    ).json();
  }, []);
  const { data: creditData } = useSWR('image-credits', loadImageCredits);

  const isUnlimited = !creditData || creditData.credits >= 999999;
  const hasCredits = isUnlimited || creditData.credits > 0;

  const isDisabled = value.length < 30 || !hasCredits;
  const tooltipContent = !hasCredits
    ? t('ai_credits_limit_reached', 'Limit reached')
    : value.length < 30
    ? t(
        'ai_image_min_chars',
        'Please add at least 30 characters to generate AI image'
      )
    : undefined;

  return (
    <>
      {modal && (
        <ImageModal
          value={value}
          close={() => setModal(false)}
          onChange={onChange}
        />
      )}
      <div className="relative group">
        <div
          {...(tooltipContent
            ? {
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': tooltipContent,
              }
            : {})}
          className={clsx(
            'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]',
            isDisabled && 'opacity-50 pointer-events-none'
          )}
          onClick={() => !isDisabled && setModal(true)}
        >
          <div className="flex gap-[5px] items-center">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <g clipPath="url(#clip0_2352_53053)">
                  <path
                    d="M8.33333 2.00033H5.2C4.07989 2.00033 3.51984 2.00033 3.09202 2.21831C2.71569 2.41006 2.40973 2.71602 2.21799 3.09234C2 3.52017 2 4.08022 2 5.20032V10.8003C2 11.9204 2 12.4805 2.21799 12.9083C2.40973 13.2846 2.71569 13.5906 3.09202 13.7823C3.51984 14.0003 4.07989 14.0003 5.2 14.0003H11.3333C11.9533 14.0003 12.2633 14.0003 12.5176 13.9322C13.2078 13.7472 13.7469 13.2081 13.9319 12.518C14 12.2636 14 11.9536 14 11.3337M7 5.66699C7 6.40337 6.40305 7.00033 5.66667 7.00033C4.93029 7.00033 4.33333 6.40337 4.33333 5.66699C4.33333 4.93061 4.93029 4.33366 5.66667 4.33366C6.40305 4.33366 7 4.93061 7 5.66699ZM9.99336 7.94576L4.3541 13.0724C4.03691 13.3607 3.87831 13.5049 3.86429 13.6298C3.85213 13.738 3.89364 13.8454 3.97546 13.9173C4.06985 14.0003 4.28419 14.0003 4.71286 14.0003H10.9707C11.9301 14.0003 12.4098 14.0003 12.7866 13.8391C13.2596 13.6368 13.6365 13.2599 13.8388 12.7869C14 12.4101 14 11.9304 14 10.971C14 10.6482 14 10.4867 13.9647 10.3364C13.9204 10.1475 13.8353 9.97056 13.7155 9.81792C13.6202 9.69646 13.4941 9.59562 13.242 9.39396L11.3772 7.9021C11.1249 7.70026 10.9988 7.59935 10.8599 7.56373C10.7374 7.53234 10.6086 7.53641 10.4884 7.57545C10.352 7.61975 10.2324 7.72842 9.99336 7.94576ZM13 1.01074L12.5932 1.82425C12.4556 2.09958 12.3868 2.23724 12.2948 2.35653C12.2132 2.46238 12.1183 2.55728 12.0125 2.63887C11.8932 2.73083 11.7555 2.79966 11.4802 2.93732L10.6667 3.34408L11.4802 3.75083C11.7555 3.88849 11.8932 3.95732 12.0125 4.04928C12.1183 4.13087 12.2132 4.22577 12.2948 4.33162C12.3868 4.45091 12.4556 4.58857 12.5932 4.8639L13 5.67741L13.4068 4.8639C13.5444 4.58857 13.6132 4.45091 13.7052 4.33162C13.7868 4.22577 13.8817 4.13087 13.9875 4.04928C14.1068 3.95732 14.2445 3.88849 14.5198 3.75083L15.3333 3.34408L14.5198 2.93732C14.2445 2.79966 14.1068 2.73083 13.9875 2.63887C13.8817 2.55728 13.7868 2.46238 13.7052 2.35653C13.6132 2.23724 13.5444 2.09958 13.4068 1.82425L13 1.01074Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2352_53053">
                    <rect width="16" height="16" fill="currentColor" />
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="text-[10px] font-[600] iconBreak:hidden block">
              {t('ai', 'AI')} Image
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
