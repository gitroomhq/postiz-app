'use client';

import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { textToTiptapHtml } from '@gitroom/frontend/components/launches/helpers/text-to-html';

const MAX_URLS = 20;

type Tab = 'search' | 'extract';
type Topic = 'general' | 'news' | 'finance';

interface ModalProps {
  editor: any;
  platform?: string;
  close: () => void;
}

const isValidPublicUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const SearchModal: FC<ModalProps> = ({ editor, platform, close }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const setLocked = useLaunchStore((p) => p.setLocked);

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<Topic>('general');
  const [recent, setRecent] = useState(false);
  const [urlsRaw, setUrlsRaw] = useState('');
  const [deepExtract, setDeepExtract] = useState(false);
  const [loading, setLoading] = useState(false);

  const parsedUrls = useMemo(() => {
    return urlsRaw
      .split(/\s+/g)
      .map((u) => u.trim())
      .filter(Boolean);
  }, [urlsRaw]);

  const invalidUrls = useMemo(
    () => parsedUrls.filter((u) => !isValidPublicUrl(u)),
    [parsedUrls]
  );

  const canGenerate =
    !loading &&
    (tab === 'search'
      ? query.trim().length >= 2
      : parsedUrls.length > 0 &&
        parsedUrls.length <= MAX_URLS &&
        invalidUrls.length === 0);

  const handleResponse = useCallback(
    async (res: Response): Promise<boolean> => {
      if (res.ok) return true;
      const detail = await res.json().catch(() => ({}));
      if (res.status === 412 || res.status === 402) {
        toaster.show(
          detail?.message ||
            t(
              'ai_search_not_configured',
              'Configure suas chaves em Settings > AI Provider > Web Search'
            ),
          'warning'
        );
        return false;
      }
      if (res.status === 429) {
        toaster.show(
          t('ai_search_rate_limit', 'Voce atingiu o limite. Aguarde um instante.'),
          'warning'
        );
        return false;
      }
      if (res.status === 504) {
        toaster.show(
          t(
            'ai_search_timeout',
            'Tavily demorou demais. Tente menos URLs ou desative "Conteudo profundo".'
          ),
          'warning'
        );
        return false;
      }
      if (res.status === 502) {
        toaster.show(
          detail?.message ||
            t('ai_search_upstream_error', 'Tavily falhou ao buscar/extrair'),
          'warning'
        );
        return false;
      }
      toaster.show(
        detail?.message ||
          t('ai_search_generic_error', 'Erro ao gerar post'),
        'warning'
      );
      return false;
    },
    [toaster, t]
  );

  const generate = useCallback(async () => {
    if (!canGenerate || !editor) return;
    setLoading(true);
    setLocked(true);
    try {
      const body: Record<string, unknown> = { mode: tab, platform };
      if (tab === 'search') {
        body.query = query.trim();
        if (topic !== 'general') body.topic = topic;
        if (recent) body.days = 7;
      } else {
        body.urls = parsedUrls;
        if (deepExtract) body.extractDepth = 'advanced';
      }
      const res = await fetch('/ai/web-search/generate-post', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const ok = await handleResponse(res);
      if (!ok) return;
      const data = await res.json();
      const newText: string = data?.text ?? '';
      if (!newText) {
        toaster.show(
          t('ai_search_empty', 'Nenhum texto retornado'),
          'warning'
        );
        return;
      }
      editor?.commands?.setContent(textToTiptapHtml(newText));
      editor?.commands?.focus('end');
      if (data?.partial) {
        toaster.show(
          t(
            'ai_search_partial',
            'Algumas URLs falharam — usamos so as que vieram'
          ),
          'success'
        );
      } else {
        toaster.show(t('ai_search_done', 'Post gerado'), 'success');
      }
      close();
    } catch (err) {
      toaster.show(
        t('ai_search_generic_error', 'Erro ao gerar post'),
        'warning'
      );
    } finally {
      setLoading(false);
      setLocked(false);
    }
  }, [
    canGenerate,
    editor,
    tab,
    query,
    topic,
    recent,
    parsedUrls,
    deepExtract,
    platform,
    fetch,
    handleResponse,
    toaster,
    t,
    setLocked,
    close,
  ]);

  const TOPIC_OPTIONS: Array<{ value: Topic; label: string; hint: string }> = [
    {
      value: 'general',
      label: t('ai_search_topic_general', 'Geral'),
      hint: t(
        'ai_search_topic_general_hint',
        'Busca ampla na web (default)'
      ),
    },
    {
      value: 'news',
      label: t('ai_search_topic_news', 'Noticias'),
      hint: t(
        'ai_search_topic_news_hint',
        'Foco em portais de noticias e atualidades'
      ),
    },
    {
      value: 'finance',
      label: t('ai_search_topic_finance', 'Financas'),
      hint: t(
        'ai_search_topic_finance_hint',
        'Mercado, acoes, cripto e indicadores'
      ),
    },
  ];

  return (
    <div className="text-textColor fixed start-0 top-0 bg-primary/80 z-[300] w-full h-full p-[60px] animate-fade justify-center flex bg-black/50">
      <div>
        <div className="flex gap-[16px] flex-col w-[600px] max-h-[85vh] overflow-y-auto bg-sixth border-tableBorder border-2 rounded-xl pb-[20px] px-[20px] relative">
          <div className="flex sticky top-0 bg-sixth z-[1] pt-[20px] -mt-[20px]">
            <div className="flex-1">
              <TopTitle
                title={t('ai_search_modal_title', 'Gerar post a partir da web')}
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

          <div className="grid grid-cols-2 gap-[8px] p-[4px] bg-newColColor rounded-[8px]">
            <SegmentButton
              active={tab === 'search'}
              onClick={() => setTab('search')}
              disabled={loading}
              icon={<SearchIcon />}
              label={t('ai_search_tab_search', 'Pesquisar topico')}
              hint={t('ai_search_tab_search_hint', 'Busca na web por palavra-chave')}
            />
            <SegmentButton
              active={tab === 'extract'}
              onClick={() => setTab('extract')}
              disabled={loading}
              icon={<LinkIcon />}
              label={t('ai_search_tab_extract', 'Importar URLs')}
              hint={t('ai_search_tab_extract_hint', 'Cria post a partir de paginas')}
            />
          </div>

          {tab === 'search' && (
            <div className="flex flex-col gap-[14px]">
              <FieldRow
                label={t('ai_search_query_label', 'Sobre o que vai escrever?')}
              >
                <textarea
                  className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[14px] py-[10px] outline-none text-[14px] min-h-[80px] resize-none"
                  placeholder={t(
                    'ai_search_query_placeholder',
                    'ex: novidades do GPT-5.5 essa semana'
                  )}
                  value={query}
                  disabled={loading}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </FieldRow>

              <FieldRow label={t('ai_search_topic_label', 'Tipo de busca')}>
                <div className="grid grid-cols-3 gap-[8px]">
                  {TOPIC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={loading}
                      onClick={() => setTopic(opt.value)}
                      className={clsx(
                        'flex flex-col items-start gap-[2px] px-[12px] py-[10px] rounded-[8px] border text-start transition-colors',
                        topic === opt.value
                          ? 'border-btnPrimary bg-newColColor'
                          : 'border-newTableBorder hover:bg-newColColor',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span className="text-[13px] font-semibold">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-customColor18 leading-tight">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </FieldRow>

              <label className="flex items-start gap-[8px] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-[16px] h-[16px] mt-[2px] accent-btnPrimary"
                  checked={recent}
                  disabled={loading}
                  onChange={(e) => setRecent(e.target.checked)}
                />
                <div className="flex flex-col">
                  <span className="text-[14px]">
                    {t('ai_search_recent', 'Apenas resultados recentes')}
                  </span>
                  <span className="text-[11px] text-customColor18">
                    {t(
                      'ai_search_recent_hint',
                      'Limita a ultimos 7 dias (efetivo em "Noticias")'
                    )}
                  </span>
                </div>
              </label>

              <Button
                type="button"
                onClick={generate}
                loading={loading}
                disabled={!canGenerate}
              >
                {t('ai_search_btn_search', 'Buscar e gerar post')}
              </Button>
            </div>
          )}

          {tab === 'extract' && (
            <div className="flex flex-col gap-[14px]">
              <FieldRow
                label={t(
                  'ai_search_urls_label',
                  'URLs (uma por linha, maximo 20)'
                )}
              >
                <textarea
                  className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[14px] py-[10px] outline-none text-[14px] min-h-[120px] resize-none font-mono"
                  placeholder={
                    'https://blog.example.com/post\nhttps://techcrunch.com/...'
                  }
                  value={urlsRaw}
                  disabled={loading}
                  onChange={(e) => setUrlsRaw(e.target.value)}
                />
                <div className="flex items-center justify-between mt-[4px]">
                  <span className="text-[12px] text-customColor18">
                    {t(
                      'ai_search_urls_count',
                      '{{count}} de 20 URLs'
                    ).replace('{{count}}', String(parsedUrls.length))}
                  </span>
                  {invalidUrls.length > 0 && (
                    <span className="text-[12px] text-customColor19">
                      {t(
                        'ai_search_urls_invalid',
                        '{{count}} URL(s) invalida(s)'
                      ).replace('{{count}}', String(invalidUrls.length))}
                    </span>
                  )}
                </div>
              </FieldRow>
              <label className="flex items-start gap-[8px] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-[16px] h-[16px] mt-[2px] accent-btnPrimary"
                  checked={deepExtract}
                  disabled={loading}
                  onChange={(e) => setDeepExtract(e.target.checked)}
                />
                <div className="flex flex-col">
                  <span className="text-[14px]">
                    {t('ai_search_deep_extract', 'Conteudo profundo')}
                  </span>
                  <span className="text-[11px] text-customColor18">
                    {t(
                      'ai_search_deep_extract_hint',
                      'Mais lento, +2x creditos — para sites com conteudo dinamico'
                    )}
                  </span>
                </div>
              </label>
              <Button
                type="button"
                onClick={generate}
                loading={loading}
                disabled={!canGenerate}
              >
                {t('ai_search_btn_extract', 'Importar e gerar post')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SegmentButton: FC<{
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}> = ({ active, disabled, onClick, icon, label, hint }) => (
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

const SearchIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.5 10.5L13.5 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const LinkIcon: FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6.5 9.5L9.5 6.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9 4L10 3C11.1 1.9 12.9 1.9 14 3C15.1 4.1 15.1 5.9 14 7L13 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7 12L6 13C4.9 14.1 3.1 14.1 2 13C0.9 11.9 0.9 10.1 2 9L3 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const FieldRow: FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-[6px]">
    <div className="text-[13px] text-customColor18">{label}</div>
    {children}
  </div>
);

export const AiSearch: FC<{
  value: string;
  editor: any;
  platform?: string;
}> = ({ editor, platform }) => {
  const t = useT();
  const [modal, setModal] = useState(false);

  return (
    <>
      {modal && (
        <SearchModal
          editor={editor}
          platform={platform}
          close={() => setModal(false)}
        />
      )}
      <div className="relative group">
        <div
          className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px]"
          onClick={() => setModal(true)}
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
                <circle
                  cx="7.5"
                  cy="7.5"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M11 11L14 14"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-[10px] font-[600] iconBreak:hidden block">
              {t('ai', 'AI')} Search
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
