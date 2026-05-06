'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  AiKind,
  useAiCredential,
} from '@gitroom/frontend/hooks/use-ai-credentials.hook';
import {
  CatalogModel,
  useAiCatalog,
} from '@gitroom/frontend/hooks/use-ai-catalog.hook';
import { SearchableModelSelect } from './searchable-model-select';

const SENTINEL = '__REDACTED__';
const MASK = '••••••••';

interface ProviderOption {
  value: string;
  label: string;
}

interface KindCardProps {
  kind: AiKind;
  title: string;
  description: string;
  icon: React.ReactNode;
  providers: ProviderOption[];
  comingSoon?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  kieai: 'KieAI',
  tavily: 'Tavily',
};

const labelForProvider = (id: string) =>
  PROVIDER_LABELS[id] ??
  id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();

interface FormState {
  provider: string;
  apiKey: string;
  model: string;
  fallbackModel: string;
  options: Record<string, any>;
}

const emptyState: FormState = {
  provider: '',
  apiKey: '',
  model: '',
  fallbackModel: '',
  options: {},
};

export const AiKindCard: React.FC<KindCardProps> = ({
  kind,
  title,
  description,
  icon,
  providers,
  comingSoon,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const decision = useDecisionModal();
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyState);

  const { data: credential, mutate, isLoading } = useAiCredential(kind);
  const { data: catalog } = useAiCatalog(kind, form.provider || null);

  const configured = !!credential;
  const isLocked = configured && !editing;
  const defaultProvider = providers[0]?.value ?? '';

  // Sincroniza form a partir de campos primitivos pra evitar re-fire quando
  // o SWR revalida e devolve nova referencia com mesmo conteudo.
  useEffect(() => {
    if (configured && credential) {
      setForm({
        provider: credential.provider,
        apiKey: editing ? '' : SENTINEL,
        model: credential.model ?? '',
        fallbackModel: credential.fallbackModel ?? '',
        options: (credential.options as Record<string, any>) ?? {},
      });
    } else if (!configured && defaultProvider) {
      setForm({ ...emptyState, provider: defaultProvider });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    credential?.updatedAt,
    credential?.provider,
    credential?.model,
    credential?.fallbackModel,
    configured,
    editing,
    defaultProvider,
  ]);

  const models: CatalogModel[] = useMemo(
    () => catalog?.models ?? [],
    [catalog]
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: m.displayName || m.id,
        hint: m.contextLength
          ? `${(m.contextLength / 1000).toFixed(0)}K ctx`
          : undefined,
      })),
    [models]
  );

  const fallbackOptions = useMemo(
    () => modelOptions.filter((m) => m.value !== form.model),
    [modelOptions, form.model]
  );

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateOption = useCallback((key: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (comingSoon) return;
    if (!form.provider) {
      toaster.show(
        t('ai_provider_pick_provider', 'Selecione um provedor'),
        'warning'
      );
      return;
    }
    if (!form.apiKey || (form.apiKey === SENTINEL && !configured)) {
      toaster.show(
        t('ai_provider_apikey_required', 'API key obrigatória'),
        'warning'
      );
      return;
    }

    const sanitizedOptions = sanitizeOptions(kind, form.provider, form.options);

    setSaving(true);
    setTestResult(null);
    try {
      const body = {
        provider: form.provider,
        apiKey: form.apiKey,
        model: form.model || undefined,
        fallbackModel: form.fallbackModel || undefined,
        options:
          Object.keys(sanitizedOptions).length > 0 ? sanitizedOptions : undefined,
        // shareDefault default true; UI escondida nessa fase
        shareDefault: true,
      };
      const res = await fetch(`/ai/credentials/${kind}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        toaster.show(
          detail?.message ||
            t('ai_provider_save_failed', 'Erro ao salvar configuração'),
          'warning'
        );
        return;
      }

      await mutate();
      setEditing(false);
      toaster.show(
        t('ai_provider_saved', 'Configuração salva com sucesso'),
        'success'
      );
    } finally {
      setSaving(false);
    }
  }, [comingSoon, form, configured, kind, fetch, mutate, toaster, t]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/ai/credentials/${kind}/test`, {
        method: 'POST',
      });
      const result = await res.json().catch(() => ({
        ok: false,
        error: `HTTP ${res.status}`,
      }));
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        error: t('ai_provider_test_error', 'Erro ao testar conexão'),
      });
    } finally {
      setTesting(false);
    }
  }, [kind, fetch, t]);

  const handleDelete = useCallback(async () => {
    const approved = await decision.open({
      title: t('ai_provider_delete_title', 'Remover configuração?'),
      description: t(
        'ai_provider_delete_desc',
        'Isso removerá a credencial configurada para este tipo. Features dependentes voltarão a exigir nova configuração.'
      ),
      approveLabel: t('ai_provider_delete_approve', 'Sim, remover'),
      cancelLabel: t('ai_provider_delete_cancel', 'Cancelar'),
    });
    if (!approved) return;

    const res = await fetch(`/ai/credentials/${kind}`, { method: 'DELETE' });
    if (res.ok) {
      await mutate();
      setEditing(false);
      setTestResult(null);
      toaster.show(
        t('ai_provider_deleted', 'Configuração removida'),
        'success'
      );
    } else {
      toaster.show(
        t('ai_provider_delete_failed', 'Erro ao remover configuração'),
        'warning'
      );
    }
  }, [kind, fetch, mutate, decision, toaster, t]);

  const headerStatus = useMemo(() => {
    if (comingSoon) {
      return (
        <span className="text-[12px] text-customColor18">
          {t('ai_provider_coming_soon', 'Em breve')}
        </span>
      );
    }
    if (!configured) {
      return (
        <span className="text-[12px] text-customColor18">
          {t('ai_provider_not_configured', 'Não configurado')}
        </span>
      );
    }
    if (credential?.lastTestStatus === 'failed') {
      return (
        <span className="text-[12px] text-customColor19 font-semibold">
          {t('ai_provider_last_test_failed', 'Último teste: falhou')}
        </span>
      );
    }
    return (
      <span className="text-[12px] text-customColor42 font-semibold">
        {labelForProvider(credential?.provider ?? '')} ·{' '}
        {credential?.model || '—'}
      </span>
    );
  }, [comingSoon, configured, credential, t]);

  return (
    <div className="bg-sixth border border-fifth rounded-[4px]">
      <div
        className={clsx(
          'flex items-center justify-between p-[16px] cursor-pointer hover:bg-boxHover transition-colors',
          expanded && 'border-b border-fifth'
        )}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-[12px]">
          <div className="w-[32px] h-[32px] flex items-center justify-center rounded-[6px] bg-newColColor">
            {icon}
          </div>
          <div className="flex flex-col gap-[2px]">
            <div className="text-[15px] font-semibold">{title}</div>
            <div className="text-[12px] text-customColor18">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-[12px]">
          {headerStatus}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={clsx('transition-transform', expanded && 'rotate-180')}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="p-[16px] flex flex-col gap-[16px]">
          {comingSoon && (
            <div className="text-[13px] text-customColor18 bg-newColColor border border-fifth rounded-[4px] px-[12px] py-[10px]">
              {t(
                'ai_provider_coming_soon_desc',
                'Configuração deste tipo será liberada em breve. Por enquanto, deixe os defaults.'
              )}
            </div>
          )}

          {isLoading && (
            <div className="text-customColor18 text-[13px] animate-pulse">
              {t('ai_provider_loading', 'Carregando...')}
            </div>
          )}

          {!isLoading && (
            <>
              <FieldRow label={t('ai_provider_provider', 'Provedor')}>
                <SelectInput
                  value={form.provider}
                  disabled={comingSoon || isLocked}
                  onChange={(v) => updateField('provider', v)}
                >
                  <option value="">
                    {t('ai_provider_select', 'Selecione um provedor')}
                  </option>
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </SelectInput>
              </FieldRow>

              <FieldRow label={t('ai_provider_apikey', 'API Key')}>
                <div className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] flex items-center">
                  <input
                    className="h-full bg-transparent outline-none flex-1 text-[14px] px-[16px] disabled:opacity-100 disabled:cursor-default"
                    type={isLocked ? 'text' : 'password'}
                    placeholder={
                      configured
                        ? t(
                            'ai_provider_apikey_placeholder_set',
                            'Deixe vazio para manter a chave atual'
                          )
                        : t(
                            'ai_provider_apikey_placeholder_new',
                            'Cole a API key do provedor'
                          )
                    }
                    value={
                      isLocked
                        ? MASK
                        : form.apiKey === SENTINEL
                        ? ''
                        : form.apiKey
                    }
                    disabled={comingSoon || isLocked}
                    onChange={(e) => updateField('apiKey', e.target.value)}
                  />
                </div>
                {configured && !editing && (
                  <div className="text-[12px] text-customColor18 mt-[4px]">
                    {t(
                      'ai_provider_apikey_hint_set',
                      'Chave salva. Clique em Editar para substituir.'
                    )}
                  </div>
                )}
              </FieldRow>

              {!comingSoon && form.provider && (
                <>
                  <FieldRow label={t('ai_provider_model', 'Modelo principal')}>
                    <SearchableModelSelect
                      value={form.model}
                      options={modelOptions}
                      placeholder={t(
                        'ai_provider_model_default',
                        'Default do provedor'
                      )}
                      emptyOptionLabel={t(
                        'ai_provider_model_default',
                        'Default do provedor'
                      )}
                      disabled={isLocked}
                      onChange={(v) => updateField('model', v)}
                    />
                  </FieldRow>
                  <FieldRow
                    label={t('ai_provider_fallback_model', 'Fallback (opcional)')}
                  >
                    <SearchableModelSelect
                      value={form.fallbackModel}
                      options={fallbackOptions}
                      placeholder={t(
                        'ai_provider_no_fallback',
                        'Sem fallback'
                      )}
                      emptyOptionLabel={t(
                        'ai_provider_no_fallback',
                        'Sem fallback'
                      )}
                      disabled={isLocked}
                      onChange={(v) => updateField('fallbackModel', v)}
                    />
                  </FieldRow>
                </>
              )}

              {!comingSoon && form.provider && (
                <DynamicOptions
                  kind={kind}
                  provider={form.provider}
                  options={form.options}
                  disabled={isLocked}
                  onChange={updateOption}
                  t={t}
                />
              )}

              {testResult && (
                <div
                  className={clsx(
                    'text-[13px] px-[12px] py-[8px] rounded-[4px] border',
                    testResult.ok
                      ? 'text-customColor42 border-customColor42'
                      : 'text-customColor19 border-customColor19'
                  )}
                >
                  {testResult.ok
                    ? t('ai_provider_test_ok', 'Conexão OK')
                    : testResult.error ||
                      t('ai_provider_test_failed', 'Falha na conexão')}
                </div>
              )}

              <div className="flex items-center gap-[12px] flex-wrap">
                {configured && !editing && !comingSoon && (
                  <>
                    <Button onClick={() => setEditing(true)}>
                      {t('ai_provider_edit', 'Editar')}
                    </Button>
                    <Button
                      onClick={handleTest}
                      loading={testing}
                      secondary={true as any}
                    >
                      {t('ai_provider_test', 'Testar conexão')}
                    </Button>
                    <Button onClick={handleDelete} secondary={true as any}>
                      {t('ai_provider_delete', 'Remover')}
                    </Button>
                  </>
                )}
                {(!configured || editing) && !comingSoon && (
                  <>
                    <Button onClick={handleSave} loading={saving}>
                      {t('ai_provider_save', 'Salvar configuração')}
                    </Button>
                    {editing && (
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setTestResult(null);
                        }}
                        secondary={true as any}
                      >
                        {t('ai_provider_cancel', 'Cancelar')}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-[6px]">
    {label && <div className="text-[13px] text-customColor18">{label}</div>}
    {children}
  </div>
);

const SelectInput: React.FC<{
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  children: React.ReactNode;
}> = ({ value, disabled, onChange, children }) => (
  <div className="relative">
    <select
      className={clsx(
        'w-full bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] pl-[16px] pr-[40px] outline-none text-[14px] appearance-none',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute end-[14px] top-1/2 -translate-y-1/2"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const DynamicOptions: React.FC<{
  kind: AiKind;
  provider: string;
  options: Record<string, any>;
  disabled: boolean;
  onChange: (key: string, value: any) => void;
  t: any;
}> = ({ kind, provider, options, disabled, onChange, t }) => {
  if (kind === 'TEXT') {
    return (
      <>
        <FieldRow label={t('ai_provider_temperature', 'Temperature (0-2)')}>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] px-[16px] outline-none text-[14px]"
            value={options.temperature ?? ''}
            disabled={disabled}
            placeholder="0.7"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange('temperature', undefined);
                return;
              }
              const num = Number(raw);
              if (Number.isNaN(num)) return;
              // Clamp 0..2 para evitar 400 do backend
              const clamped = Math.max(0, Math.min(2, num));
              onChange('temperature', clamped);
            }}
          />
        </FieldRow>
        <FieldRow
          label={t('ai_provider_reasoning_effort', 'Esforço de raciocínio')}
        >
          <SelectInput
            value={options.reasoningEffort ?? ''}
            disabled={disabled}
            onChange={(v) => onChange('reasoningEffort', v || undefined)}
          >
            <option value="">
              {t('ai_provider_default', 'Default do modelo')}
            </option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </SelectInput>
        </FieldRow>
      </>
    );
  }

  if (kind === 'IMAGE') {
    if (provider === 'openrouter') {
      return (
        <FieldRow label={t('ai_provider_image_size', 'Resolução')}>
          <div className="flex gap-[8px]">
            {['1K', '2K', '4K'].map((size) => (
              <label
                key={size}
                className={clsx(
                  'flex items-center gap-[6px] px-[12px] py-[8px] rounded-[6px] border cursor-pointer transition-colors',
                  options.imageSize === size
                    ? 'border-btnPrimary bg-newColColor'
                    : 'border-newTableBorder hover:bg-newColColor',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name="image-size"
                  value={size}
                  checked={options.imageSize === size}
                  disabled={disabled}
                  onChange={() => onChange('imageSize', size)}
                  className="accent-btnPrimary"
                />
                <span className="text-[14px]">{size}</span>
              </label>
            ))}
          </div>
        </FieldRow>
      );
    }
    if (provider === 'openai') {
      return (
        <FieldRow label={t('ai_provider_image_quality', 'Qualidade')}>
          <div className="flex gap-[8px]">
            {['low', 'medium', 'high'].map((quality) => (
              <label
                key={quality}
                className={clsx(
                  'flex items-center gap-[6px] px-[12px] py-[8px] rounded-[6px] border cursor-pointer transition-colors capitalize',
                  options.quality === quality
                    ? 'border-btnPrimary bg-newColColor'
                    : 'border-newTableBorder hover:bg-newColColor',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name="image-quality"
                  value={quality}
                  checked={options.quality === quality}
                  disabled={disabled}
                  onChange={() => onChange('quality', quality)}
                  className="accent-btnPrimary"
                />
                <span className="text-[14px]">{quality}</span>
              </label>
            ))}
          </div>
        </FieldRow>
      );
    }
  }

  return null;
};

function sanitizeOptions(
  kind: AiKind,
  provider: string,
  options: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === '') continue;
    if (kind === 'TEXT' && key === 'temperature') {
      // Clamp final defensivo
      const num = Number(value);
      if (Number.isNaN(num)) continue;
      out[key] = Math.max(0, Math.min(2, num));
      continue;
    }
    if (kind === 'IMAGE') {
      if (key === 'imageSize' && provider !== 'openrouter') continue;
      if (key === 'quality' && provider !== 'openai') continue;
    }
    out[key] = value;
  }
  return out;
}
