'use client';

import React, { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import Loading from '@gitroom/frontend/components/layout/loading';

const MIN_CHARS = 30;

const SparkleIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M8 1.5L9.6 5.7L13.8 7.3L9.6 8.9L8 13L6.4 8.9L2.2 7.3L6.4 5.7L8 1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M13 11.2L13.4 12.4L14.6 12.8L13.4 13.2L13 14.4L12.6 13.2L11.4 12.8L12.6 12.4L13 11.2Z"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
  </svg>
);

export const AiCaption: FC<{
  value: string;
  editor: any;
  platform?: string;
}> = ({ value, editor, platform }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);

  const isDisabled = value.length < MIN_CHARS;
  const tooltipContent = isDisabled
    ? t(
        'ai_caption_min_chars',
        'Adicione ao menos 30 caracteres para usar a IA'
      )
    : undefined;

  const run = useCallback(async () => {
    if (loading || isDisabled || !editor) return;
    setLoading(true);
    try {
      const res = await fetch('/ai/text/caption', {
        method: 'POST',
        body: JSON.stringify({
          action: 'improve',
          content: value,
          platform,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        if (res.status === 412 || res.status === 402) {
          toaster.show(
            detail?.message ||
              t(
                'ai_caption_not_configured',
                'Configure suas chaves em Settings > AI Provider'
              ),
            'warning'
          );
          return;
        }
        if (res.status === 429) {
          toaster.show(
            t(
              'ai_caption_rate_limit',
              'Você atingiu o limite. Aguarde um instante.'
            ),
            'warning'
          );
          return;
        }
        toaster.show(
          detail?.message ||
            t('ai_caption_generic_error', 'Erro ao chamar o assistente'),
          'warning'
        );
        return;
      }
      const data = await res.json();
      const newText: string = data?.text ?? '';
      if (!newText) return;
      editor?.commands?.setContent(newText);
      editor?.commands?.focus('end');
    } finally {
      setLoading(false);
    }
  }, [loading, isDisabled, editor, fetch, value, platform, toaster, t]);

  return (
    <div className="relative group">
      <div
        {...(tooltipContent
          ? {
              'data-tooltip-id': 'tooltip',
              'data-tooltip-content': tooltipContent,
            }
          : {})}
        onClick={run}
        className={clsx(
          'cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]',
          isDisabled && 'opacity-50 pointer-events-none'
        )}
      >
        {loading && (
          <div className="absolute start-[50%] -translate-x-[50%]">
            <Loading height={15} width={15} type="spin" color="#fff" />
          </div>
        )}
        <div
          className={clsx(
            'flex gap-[5px] items-center',
            loading && 'invisible'
          )}
        >
          <div>
            <SparkleIcon />
          </div>
          <div className="text-[10px] font-[600] iconBreak:hidden block">
            {t('ai_caption_label', 'IA Texto')}
          </div>
        </div>
      </div>
    </div>
  );
};
