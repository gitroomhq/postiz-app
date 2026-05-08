'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  AiCredentialSummary,
  AiKind,
  useAiCredential,
} from '@gitroom/frontend/hooks/use-ai-credentials.hook';
import {
  CatalogModel,
  useAiCatalog,
} from '@gitroom/frontend/hooks/use-ai-catalog.hook';
import {
  CurrentProfile,
  useCurrentProfile,
} from '@gitroom/frontend/hooks/use-current-profile.hook';
import { useProfilesList } from '@gitroom/frontend/components/settings/profile-persona.hooks';
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

const PROVIDER_ICON_PATHS: Record<string, string> = {
  openrouter: '/icons/ai/openrouter.svg',
  openai: '/icons/ai/openai.svg',
};

function providerIcon(providerId: string): React.ReactNode {
  const path = PROVIDER_ICON_PATHS[providerId];
  if (!path) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={path} alt={providerId} className="w-[16px] h-[16px]" />;
}

interface FormState {
  provider: string;
  apiKey: string;
  model: string;
  fallbackModel: string;
  shareDefault: boolean;
  options: Record<string, any>;
}

const emptyState: FormState = {
  provider: '',
  apiKey: '',
  model: '',
  fallbackModel: '',
  shareDefault: true,
  options: {},
};

export const AiKindCard: React.FC<KindCardProps> = (props) => {
  const { profile, isLoading: profileLoading } = useCurrentProfile();
  const { data: profilesList } = useProfilesList();
  const [expanded, setExpanded] = useState(false);
  const t = useT();

  // No nosso modelo, "WORKSPACE" e na verdade a configuracao do perfil
  // default. Por isso buscamos o nome dele para mostrar nos textos de
  // heranca (ex: "Herdado do perfil Default" em vez do generico
  // "Herdado da agencia").
  const defaultProfileName = useMemo(() => {
    const def = profilesList?.find((p) => p.isDefault);
    return def?.name ?? t('ai_provider_default_profile', 'Perfil padrão');
  }, [profilesList, t]);

  // Credencial WORKSPACE (na verdade do perfil default) — sempre carregada
  // para que perfis secundarios mostrem status herdado QUANDO shareDefault
  // estiver true.
  const { data: workspaceCred, mutate: mutateWorkspace } = useAiCredential(
    props.kind,
    null
  );

  // Quando perfil secundario, tambem carregamos a row PROFILE (override).
  // Caso contrario, passamos undefined como kind para o hook nao executar
  // fetch (SWR ignora chamadas com key null).
  const isSecondary = profile && !profile.isDefault;
  const { data: profileCred, mutate: mutateProfile } = useAiCredential(
    isSecondary ? props.kind : (undefined as any),
    isSecondary && profile ? profile.id : null
  );

  // Heranca SO acontece quando workspaceCred existe E shareDefault=true.
  // Sem o segundo check, perfis secundarios mostravam "Herdado" mesmo
  // quando o admin do default desmarcou "Compartilhar com perfis" — o que
  // era incoerente com o resolver do backend que retorna 412 nesse caso.
  const inheritedFromWorkspace =
    isSecondary &&
    !profileCred &&
    !!workspaceCred &&
    workspaceCred.shareDefault === true;

  return (
    <div className="bg-sixth border border-fifth rounded-[4px]">
      <CardHeader
        {...props}
        expanded={expanded}
        onToggle={() => setExpanded((p) => !p)}
        statusContent={
          <CardStatus
            comingSoon={props.comingSoon}
            isSecondary={!!isSecondary}
            workspaceCred={workspaceCred ?? null}
            profileCred={profileCred ?? null}
            inheritedFromWorkspace={inheritedFromWorkspace}
            defaultProfileName={defaultProfileName}
            t={t}
          />
        }
      />

      {expanded && (
        <div className="p-[16px] flex flex-col gap-[16px]">
          {profileLoading && (
            <div className="text-customColor18 text-[13px] animate-pulse">
              {t('ai_provider_loading', 'Carregando...')}
            </div>
          )}
          {!profileLoading && (
            <CardBody
              {...props}
              currentProfile={profile}
              workspaceCred={workspaceCred ?? null}
              profileCred={profileCred ?? null}
              inheritedFromWorkspace={inheritedFromWorkspace}
              defaultProfileName={defaultProfileName}
              mutateWorkspace={mutateWorkspace}
              mutateProfile={mutateProfile}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
};

const CardHeader: React.FC<
  KindCardProps & {
    expanded: boolean;
    onToggle: () => void;
    statusContent: React.ReactNode;
  }
> = ({ title, description, icon, expanded, onToggle, statusContent }) => (
  <div
    className={clsx(
      'flex items-center justify-between p-[16px] cursor-pointer hover:bg-boxHover transition-colors',
      expanded && 'border-b border-fifth'
    )}
    onClick={onToggle}
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
      {statusContent}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
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
);

const CardStatus: React.FC<{
  comingSoon?: boolean;
  isSecondary: boolean;
  workspaceCred: AiCredentialSummary | null;
  profileCred: AiCredentialSummary | null;
  inheritedFromWorkspace: boolean;
  defaultProfileName: string;
  t: any;
}> = ({
  comingSoon,
  isSecondary,
  workspaceCred,
  profileCred,
  inheritedFromWorkspace,
  defaultProfileName,
  t,
}) => {
  if (comingSoon) {
    return (
      <span className="text-[12px] text-customColor18">
        {t('ai_provider_coming_soon', 'Em breve')}
      </span>
    );
  }

  // Override do perfil tem prioridade
  if (profileCred) {
    if (profileCred.lastTestStatus === 'failed') {
      return (
        <span className="text-[12px] text-customColor19 font-semibold">
          {t('ai_provider_last_test_failed', 'Último teste: falhou')}
        </span>
      );
    }
    return (
      <span className="text-[12px] text-customColor42 font-semibold">
        {labelForProvider(profileCred.provider)} · {profileCred.model || '—'}
      </span>
    );
  }

  // Perfil secundario com heranca efetiva (workspaceCred com shareDefault=true)
  if (isSecondary && inheritedFromWorkspace && workspaceCred) {
    return (
      <span className="text-[12px] text-customColor18">
        {t('ai_provider_inherited_from', 'Herdado do perfil {{name}}').replace(
          '{{name}}',
          defaultProfileName
        )}{' '}
        · {labelForProvider(workspaceCred.provider)}
      </span>
    );
  }

  // Perfil secundario sem heranca (sem workspaceCred ou shareDefault=false)
  if (isSecondary) {
    return (
      <span className="text-[12px] text-customColor18">
        {t('ai_provider_not_configured', 'Não configurado')}
      </span>
    );
  }

  // Default profile / workspace level
  if (workspaceCred) {
    if (workspaceCred.lastTestStatus === 'failed') {
      return (
        <span className="text-[12px] text-customColor19 font-semibold">
          {t('ai_provider_last_test_failed', 'Último teste: falhou')}
        </span>
      );
    }
    return (
      <span className="text-[12px] text-customColor42 font-semibold">
        {labelForProvider(workspaceCred.provider)} ·{' '}
        {workspaceCred.model || '—'}
      </span>
    );
  }

  return (
    <span className="text-[12px] text-customColor18">
      {t('ai_provider_not_configured', 'Não configurado')}
    </span>
  );
};

const CardBody: React.FC<
  KindCardProps & {
    currentProfile: CurrentProfile | null;
    workspaceCred: AiCredentialSummary | null;
    profileCred: AiCredentialSummary | null;
    inheritedFromWorkspace: boolean;
    defaultProfileName: string;
    mutateWorkspace: () => Promise<unknown>;
    mutateProfile: () => Promise<unknown>;
    t: any;
  }
> = ({
  kind,
  providers,
  comingSoon,
  currentProfile,
  workspaceCred,
  profileCred,
  inheritedFromWorkspace,
  defaultProfileName,
  mutateWorkspace,
  mutateProfile,
  t,
}) => {
  const isSecondary = !!currentProfile && !currentProfile.isDefault;
  const targetProfileId =
    isSecondary && currentProfile ? currentProfile.id : undefined;
  const refetch = isSecondary ? mutateProfile : mutateWorkspace;

  // Em perfil secundario sem override e sem clicar no "Configurar chave
  // propria", mostramos apenas o status herdado e CTA. Se ja existe
  // profileCred, abrimos direto no editor.
  const [overrideOpen, setOverrideOpen] = useState(false);
  const showOverrideForm = !!profileCred || overrideOpen;

  if (comingSoon) {
    return (
      <div className="text-[13px] text-customColor18 bg-newColColor border border-fifth rounded-[4px] px-[12px] py-[10px]">
        {t(
          'ai_provider_coming_soon_desc',
          'Configuração deste tipo será liberada em breve. Por enquanto, deixe os defaults.'
        )}
      </div>
    );
  }

  if (isSecondary && !showOverrideForm) {
    return (
      <InheritedView
        workspaceCred={workspaceCred}
        inheritedFromWorkspace={inheritedFromWorkspace}
        defaultProfileName={defaultProfileName}
        onOverride={() => setOverrideOpen(true)}
        t={t}
      />
    );
  }

  return (
    <CredentialForm
      kind={kind}
      providers={providers}
      credential={isSecondary ? profileCred : workspaceCred}
      isWorkspaceLevel={!isSecondary}
      profileId={targetProfileId}
      isProfileOverride={!!isSecondary}
      onCancelOverride={
        isSecondary && !profileCred ? () => setOverrideOpen(false) : undefined
      }
      refetch={refetch}
      t={t}
    />
  );
};

const InheritedView: React.FC<{
  workspaceCred: AiCredentialSummary | null;
  inheritedFromWorkspace: boolean;
  defaultProfileName: string;
  onOverride: () => void;
  t: any;
}> = ({
  workspaceCred,
  inheritedFromWorkspace,
  defaultProfileName,
  onOverride,
  t,
}) => {
  // 3 estados possiveis para um perfil secundario sem override:
  //  (a) heranca efetiva — workspaceCred existe E shareDefault=true
  //  (b) workspaceCred existe MAS shareDefault=false → nao ha heranca
  //  (c) workspaceCred nao existe → nada configurado em lugar nenhum
  const hasInheritance = inheritedFromWorkspace && !!workspaceCred;
  const sharingDisabled =
    !!workspaceCred && workspaceCred.shareDefault === false;

  return (
    <div className="flex flex-col gap-[16px]">
      {hasInheritance && workspaceCred ? (
        <div className="bg-newColColor border border-fifth rounded-[4px] px-[16px] py-[14px] flex flex-col gap-[6px]">
          <div className="text-[13px] text-customColor18">
            {t(
              'ai_provider_inherited_from',
              'Herdado do perfil {{name}}'
            ).replace('{{name}}', defaultProfileName)}
          </div>
          <div className="text-[14px] font-semibold">
            {labelForProvider(workspaceCred.provider)} ·{' '}
            {workspaceCred.model ||
              t('ai_provider_default', 'Default do modelo')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t(
              'ai_provider_inherited_desc',
              'Este perfil herda a configuração do perfil {{name}}. Você pode configurar uma chave exclusiva sem afetar os demais.'
            ).replace('{{name}}', defaultProfileName)}
          </div>
        </div>
      ) : sharingDisabled ? (
        <div className="bg-newColColor border border-fifth rounded-[4px] px-[16px] py-[14px] text-[13px] text-customColor18">
          {t(
            'ai_provider_not_shared',
            'O perfil {{name}} tem chave configurada mas não está compartilhando. Configure uma chave exclusiva para este perfil.'
          ).replace('{{name}}', defaultProfileName)}
        </div>
      ) : (
        <div className="bg-newColColor border border-fifth rounded-[4px] px-[16px] py-[14px] text-[13px] text-customColor18">
          {t(
            'ai_provider_no_default',
            'Nenhuma chave configurada no perfil {{name}}. Configure uma chave exclusiva para este perfil.'
          ).replace('{{name}}', defaultProfileName)}
        </div>
      )}
      <div>
        <Button onClick={onOverride}>
          {t(
            'ai_provider_configure_profile',
            'Configurar chave própria deste perfil'
          )}
        </Button>
      </div>
    </div>
  );
};

interface CredentialFormProps {
  kind: AiKind;
  providers: ProviderOption[];
  credential: AiCredentialSummary | null;
  isWorkspaceLevel: boolean;
  profileId?: string;
  isProfileOverride: boolean;
  onCancelOverride?: () => void;
  refetch: () => Promise<unknown>;
  t: any;
}

const CredentialForm: React.FC<CredentialFormProps> = ({
  kind,
  providers,
  credential,
  isWorkspaceLevel,
  profileId,
  isProfileOverride,
  onCancelOverride,
  refetch,
  t,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const decision = useDecisionModal();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyState);

  const configured = !!credential;
  const isLocked = configured && !editing;
  const defaultProvider = providers[0]?.value ?? '';

  const { data: catalog } = useAiCatalog(kind, form.provider || null);
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

  useEffect(() => {
    if (configured && credential) {
      setForm({
        provider: credential.provider,
        apiKey: editing ? '' : SENTINEL,
        model: credential.model ?? '',
        fallbackModel: credential.fallbackModel ?? '',
        shareDefault: credential.shareDefault,
        options: (credential.options as Record<string, any>) ?? {},
      });
    } else if (!configured && defaultProvider) {
      // Default de modelo para combos (kind, provider) onde o backend NAO tem
      // fallback automatico — caso de VIDEO + kieai. Sem isso o admin teria
      // que escolher manualmente entre 5 modelos sem orientacao.
      const initialModel = pickInitialModel(kind, defaultProvider);
      setForm({
        ...emptyState,
        provider: defaultProvider,
        model: initialModel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    credential?.updatedAt,
    credential?.provider,
    credential?.model,
    credential?.fallbackModel,
    credential?.shareDefault,
    configured,
    editing,
    defaultProvider,
  ]);

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

  // Reusa o `mutate` retornado pelo hook do parent (vinculado a key SWR
  // correta). Garantimos que o estado local e resetado ANTES da revalidacao
  // para que o React renderize o input habilitado imediatamente.
  const invalidate = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const buildUrl = useCallback(
    (suffix = '') => {
      const base = `/ai/credentials/${kind}${suffix}`;
      return profileId
        ? `${base}${suffix.includes('?') ? '&' : '?'}profileId=${encodeURIComponent(
            profileId
          )}`
        : base;
    },
    [kind, profileId]
  );

  const handleSave = useCallback(async () => {
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
      const body: Record<string, unknown> = {
        provider: form.provider,
        apiKey: form.apiKey,
        model: form.model || undefined,
        fallbackModel: form.fallbackModel || undefined,
        options:
          Object.keys(sanitizedOptions).length > 0 ? sanitizedOptions : undefined,
      };
      // shareDefault so faz sentido em scope=workspace
      if (isWorkspaceLevel) {
        body.shareDefault = form.shareDefault;
      }

      const res = await fetch(buildUrl(), {
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

      await invalidate();
      setEditing(false);
      toaster.show(
        t('ai_provider_saved', 'Configuração salva com sucesso'),
        'success'
      );
    } finally {
      setSaving(false);
    }
  }, [
    form,
    configured,
    kind,
    fetch,
    invalidate,
    toaster,
    t,
    isWorkspaceLevel,
    buildUrl,
  ]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(buildUrl('/test'), { method: 'POST' });
      const result = await res.json().catch(() => ({
        ok: false,
        error: `HTTP ${res.status}`,
      }));
      setTestResult(result);
    } catch {
      setTestResult({
        ok: false,
        error: t('ai_provider_test_error', 'Erro ao testar conexão'),
      });
    } finally {
      setTesting(false);
    }
  }, [fetch, buildUrl, t]);

  const handleDelete = useCallback(async () => {
    const isOverride = isProfileOverride;
    const approved = await decision.open({
      title: isOverride
        ? t('ai_provider_remove_override_title', 'Remover override deste perfil?')
        : t('ai_provider_delete_title', 'Remover configuração?'),
      description: isOverride
        ? t(
            'ai_provider_remove_override_desc',
            'Este perfil voltará a usar o default da agência.'
          )
        : t(
            'ai_provider_delete_desc',
            'Isso removerá a credencial configurada para este tipo. Features dependentes voltarão a exigir nova configuração.'
          ),
      approveLabel: t('ai_provider_delete_approve', 'Sim, remover'),
      cancelLabel: t('ai_provider_delete_cancel', 'Cancelar'),
    });
    if (!approved) return;

    const res = await fetch(buildUrl(), { method: 'DELETE' });
    if (res.ok) {
      // Reseta estado LOCAL primeiro (sincrono) para que o input destrave
      // imediatamente; depois revalida o SWR para apagar o credential
      // em cache. A ordem importa: useEffect deps incluem editing, e se
      // setEditing fica para depois do mutate o React pode renderizar
      // o estado intermediario com credential=null mas editing=true.
      setEditing(false);
      setTestResult(null);
      setForm({ ...emptyState, provider: providers[0]?.value ?? '' });
      await invalidate();
      toaster.show(
        isOverride
          ? t('ai_provider_override_removed', 'Override removido')
          : t('ai_provider_deleted', 'Configuração removida'),
        'success'
      );
      onCancelOverride?.();
    } else {
      toaster.show(
        t('ai_provider_delete_failed', 'Erro ao remover configuração'),
        'warning'
      );
    }
  }, [fetch, buildUrl, invalidate, toaster, t, decision, isProfileOverride, onCancelOverride, providers]);

  return (
    <>
      {isProfileOverride && (
        <div className="bg-newColColor border-l-[3px] border-l-btnPrimary border border-fifth rounded-[4px] px-[12px] py-[8px] text-[12px] text-customColor18">
          {t(
            'ai_provider_override_banner',
            'Configuração exclusiva deste perfil. Não afeta o default da agência.'
          )}
        </div>
      )}

      <FieldRow label={t('ai_provider_provider', 'Provedor')}>
        <SearchableModelSelect
          value={form.provider}
          options={providers.map((p) => ({
            value: p.value,
            label: p.label,
            icon: providerIcon(p.value),
          }))}
          placeholder={t('ai_provider_select', 'Selecione um provedor')}
          disabled={isLocked}
          searchable={false}
          onChange={(v) => updateField('provider', v)}
        />
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
            disabled={isLocked}
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

      {form.provider && kind !== 'WEB_SEARCH' && (
        <>
          <FieldRow label={t('ai_provider_model', 'Modelo principal')}>
            {kind === 'VIDEO' && form.provider === 'kieai' ? (
              // Para VIDEO+kieai o backend NAO tem fallback aceitavel: a
              // chamada precisa de um model exato (Seedance vs Veo tem
              // payloads diferentes). Escondemos a opcao vazia "Default
              // do provedor" pra forcar selecao explicita; o form ja vem
              // pre-selecionado com 'veo3_lite' (ver pickInitialModel).
              <SearchableModelSelect
                value={form.model}
                options={modelOptions}
                placeholder={t(
                  'ai_provider_video_pick_model',
                  'Selecione um modelo'
                )}
                disabled={isLocked}
                onChange={(v) => updateField('model', v)}
              />
            ) : (
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
            )}
          </FieldRow>
          {/* Fallback so faz sentido para TEXT (mesmo provider, varios modelos
              compativeis com o SDK). Para IMAGE/VIDEO o fallback automatico
              cruzaria APIs de payload diferente — esconde-se o seletor. */}
          {kind === 'TEXT' && (
            <FieldRow
              label={t('ai_provider_fallback_model', 'Fallback (opcional)')}
            >
              <SearchableModelSelect
                value={form.fallbackModel}
                options={fallbackOptions}
                placeholder={t('ai_provider_no_fallback', 'Sem fallback')}
                emptyOptionLabel={t(
                  'ai_provider_no_fallback',
                  'Sem fallback'
                )}
                disabled={isLocked}
                onChange={(v) => updateField('fallbackModel', v)}
              />
            </FieldRow>
          )}
        </>
      )}

      {form.provider && (
        <DynamicOptions
          kind={kind}
          provider={form.provider}
          model={form.model}
          options={form.options}
          disabled={isLocked}
          onChange={updateOption}
          t={t}
        />
      )}

      {isWorkspaceLevel && (
        <FieldRow label="">
          <label className="flex items-center gap-[8px] cursor-pointer">
            <input
              type="checkbox"
              className="w-[16px] h-[16px] accent-btnPrimary"
              checked={form.shareDefault}
              disabled={isLocked}
              onChange={(e) => updateField('shareDefault', e.target.checked)}
            />
            <span className="text-[14px]">
              {t(
                'ai_provider_share_default',
                'Compartilhar este default com perfis (perfis sem chave própria usam essa configuração)'
              )}
            </span>
          </label>
        </FieldRow>
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
        {configured && !editing && (
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
              {isProfileOverride
                ? t('ai_provider_remove_override', 'Remover override')
                : t('ai_provider_delete', 'Remover')}
            </Button>
          </>
        )}
        {(!configured || editing) && (
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
            {!configured && onCancelOverride && (
              <Button
                onClick={() => onCancelOverride()}
                secondary={true as any}
              >
                {t('ai_provider_cancel_override', 'Voltar para o default')}
              </Button>
            )}
          </>
        )}
      </div>
    </>
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
  model: string;
  options: Record<string, any>;
  disabled: boolean;
  onChange: (key: string, value: any) => void;
  t: any;
}> = ({ kind, provider, model, options, disabled, onChange, t }) => {
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
              onChange('temperature', Math.max(0, Math.min(2, num)));
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

  if (kind === 'VIDEO' && provider === 'kieai') {
    const isSeedance = model.startsWith('bytedance/seedance');

    // Aspect ratio default e enrichPromptByDefault foram removidos do
    // Settings: o composer/agente sempre passam aspect ratio explicito por
    // call (default 9:16 no service quando ausente), e o enrich e default
    // ON sobrescrito pelo composer.
    if (!isSeedance) {
      // Veo nao tem opcoes no Settings (so model + apiKey).
      return null;
    }

    return (
      <>
        <FieldRow
          label={t('ai_provider_video_resolution', 'Resolução')}
        >
          <div className="flex gap-[8px]">
            {(['480p', '720p', '1080p'] as const).map((res) => (
              <label
                key={res}
                className={clsx(
                  'flex items-center gap-[6px] px-[12px] py-[8px] rounded-[6px] border cursor-pointer transition-colors',
                  (options.resolution ?? '720p') === res
                    ? 'border-btnPrimary bg-newColColor'
                    : 'border-newTableBorder hover:bg-newColColor',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name="video-resolution"
                  value={res}
                  checked={(options.resolution ?? '720p') === res}
                  disabled={disabled}
                  onChange={() => onChange('resolution', res)}
                  className="accent-btnPrimary"
                />
                <span className="text-[14px]">{res}</span>
              </label>
            ))}
          </div>
        </FieldRow>
        <FieldRow
          label={t('ai_provider_video_duration', 'Duração (segundos)')}
        >
          <input
            type="number"
            min={4}
            max={15}
            step={1}
            className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] px-[16px] outline-none text-[14px] w-[120px]"
            value={options.durationSeconds ?? ''}
            disabled={disabled}
            placeholder="5"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange('durationSeconds', undefined);
                return;
              }
              const num = Number(raw);
              if (Number.isNaN(num)) return;
              onChange(
                'durationSeconds',
                Math.max(4, Math.min(15, Math.floor(num)))
              );
            }}
          />
          <div className="text-[12px] text-customColor18 mt-[4px]">
            {t(
              'ai_provider_video_duration_hint',
              'Entre 4 e 15s. Padrão Seedance é 5s.'
            )}
          </div>
        </FieldRow>
        <FieldRow label="">
          <label className="flex items-center gap-[8px] cursor-pointer">
            <input
              type="checkbox"
              className="w-[16px] h-[16px] accent-btnPrimary"
              checked={!!options.audio}
              disabled={disabled}
              onChange={(e) => onChange('audio', e.target.checked)}
            />
            <span className="text-[14px]">
              {t(
                'ai_provider_video_audio',
                'Gerar áudio junto com o vídeo'
              )}
            </span>
          </label>
        </FieldRow>
      </>
    );
  }

  if (kind === 'WEB_SEARCH' && provider === 'tavily') {
    return (
      <>
        <FieldRow
          label={t('ai_provider_web_depth', 'Profundidade da busca')}
        >
          <div className="flex gap-[8px]">
            {(['basic', 'advanced'] as const).map((depth) => (
              <label
                key={depth}
                className={clsx(
                  'flex items-center gap-[6px] px-[12px] py-[8px] rounded-[6px] border cursor-pointer transition-colors capitalize',
                  (options.depth ?? 'advanced') === depth
                    ? 'border-btnPrimary bg-newColColor'
                    : 'border-newTableBorder hover:bg-newColColor',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  type="radio"
                  name="web-search-depth"
                  value={depth}
                  checked={(options.depth ?? 'advanced') === depth}
                  disabled={disabled}
                  onChange={() => onChange('depth', depth)}
                  className="accent-btnPrimary"
                />
                <span className="text-[14px]">{depth}</span>
              </label>
            ))}
          </div>
          <div className="text-[12px] text-customColor18 mt-[4px]">
            {t(
              'ai_provider_web_depth_hint',
              'advanced custa 2 créditos por busca (default); basic custa 1.'
            )}
          </div>
        </FieldRow>
        <FieldRow label={t('ai_provider_web_max_results', 'Máximo de resultados')}>
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] px-[16px] outline-none text-[14px] w-[120px]"
            value={options.maxResults ?? ''}
            disabled={disabled}
            placeholder="5"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange('maxResults', undefined);
                return;
              }
              const num = Number(raw);
              if (Number.isNaN(num)) return;
              onChange(
                'maxResults',
                Math.max(1, Math.min(20, Math.floor(num)))
              );
            }}
          />
        </FieldRow>
      </>
    );
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
      const num = Number(value);
      if (Number.isNaN(num)) continue;
      out[key] = Math.max(0, Math.min(2, num));
      continue;
    }
    if (kind === 'IMAGE') {
      if (key === 'imageSize' && provider !== 'openrouter') continue;
      if (key === 'quality' && provider !== 'openai') continue;
    }
    if (kind === 'WEB_SEARCH' && key === 'maxResults') {
      const num = Number(value);
      if (Number.isNaN(num)) continue;
      out[key] = Math.max(1, Math.min(20, Math.floor(num)));
      continue;
    }
    if (kind === 'VIDEO' && key === 'durationSeconds') {
      const num = Number(value);
      if (Number.isNaN(num)) continue;
      out[key] = Math.max(4, Math.min(15, Math.floor(num)));
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Modelo inicial pre-selecionado quando o admin abre um card sem credencial
 * salva. Aplicado apenas para combos (kind, provider) cujo backend NAO tem
 * fallback de modelo automatico — hoje so VIDEO + kieai (5 modelos sem
 * default no service). Para os demais combos, o backend escolhe um default
 * aceitavel se o `credential.model` ficar vazio.
 */
function pickInitialModel(kind: AiKind, provider: string): string {
  if (kind === 'VIDEO' && provider === 'kieai') {
    // Veo 3.1 Lite — mais economico, suficiente para a maioria dos casos.
    return 'veo3_lite';
  }
  return '';
}
