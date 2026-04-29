'use client';

import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  FORMAT_LABEL,
  GroupedDestination,
  GroupedSource,
  RepostChannelOption,
  RepostDestination,
  RepostDestinationFormat,
  RepostRule,
  RepostSourceOption,
  RepostSourceType,
  SOURCE_TYPE_LABEL,
  groupDestinations,
  groupSources,
  useRepostDestinationCandidates,
  useRepostSourceCandidates,
} from '@gitroom/frontend/components/automations/hooks/use-repost';
import { PlatformIconBadge } from '@gitroom/frontend/components/launches/helpers/platform-icon.helper';

interface Props {
  initial?: RepostRule;
  mode: 'create' | 'edit';
  onSaved: (rule: RepostRule) => void;
  onCancel?: () => void;
}

const INTERVAL_PRESETS = [5, 15, 30, 60, 120, 360];

function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

function platformDisplayName(providerIdentifier: string) {
  const label = providerIdentifier.startsWith('zernio-')
    ? providerIdentifier.replace('zernio-', '')
    : providerIdentifier.replace('instagram-standalone', 'instagram');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const RepostRuleForm: FC<Props> = ({
  initial,
  mode,
  onSaved,
  onCancel,
}) => {
  const t = useT();
  const fetchApi = useFetch();
  const toaster = useToaster();
  const { data: sourceCandidates, isLoading: loadingSources } =
    useRepostSourceCandidates();

  const [name, setName] = useState(initial?.name ?? '');
  const [sourceIntegrationId, setSourceIntegrationId] = useState(
    initial?.sourceIntegrationId ?? ''
  );
  const [sourceType, setSourceType] = useState<RepostSourceType | ''>(
    initial?.sourceType ?? ''
  );
  const [destinations, setDestinations] = useState<RepostDestination[]>(
    initial?.destinations?.map((d) => ({
      integrationId: d.integrationId,
      format: d.format,
    })) ?? []
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    initial?.intervalMinutes ?? 15
  );
  const [captionTemplate, setCaptionTemplate] = useState(
    initial?.captionTemplate ?? ''
  );
  const [filterHashtag, setFilterHashtag] = useState(
    initial?.filterHashtag ?? ''
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const { data: destCandidates, isLoading: loadingDests } =
    useRepostDestinationCandidates(sourceType || null);

  useEffect(() => {
    if (!initial) return;
    setName(initial.name);
    setSourceIntegrationId(initial.sourceIntegrationId);
    setSourceType(initial.sourceType);
    setDestinations(
      initial.destinations?.map((d) => ({
        integrationId: d.integrationId,
        format: d.format,
      })) ?? []
    );
    setIntervalMinutes(initial.intervalMinutes);
    setCaptionTemplate(initial.captionTemplate ?? '');
    setFilterHashtag(initial.filterHashtag ?? '');
    setEnabled(initial.enabled);
  }, [initial]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!sourceIntegrationId || !sourceType) return false;
    if (destinations.length === 0) return false;
    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 5) return false;
    return !saving;
  }, [name, sourceIntegrationId, sourceType, destinations, intervalMinutes, saving]);

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const url =
        mode === 'create' ? '/repost/rules' : `/repost/rules/${initial?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetchApi(url, {
        method,
        body: JSON.stringify({
          name: name.trim(),
          sourceIntegrationId,
          sourceType,
          destinations,
          intervalMinutes,
          captionTemplate: captionTemplate.trim() || null,
          filterHashtag: filterHashtag.trim() || null,
          enabled,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toaster.show(
          body.message ||
            t('repost_save_failed', 'Falha ao salvar a regra de repost'),
          'warning'
        );
        return;
      }
      const saved = (await res.json()) as RepostRule;
      toaster.show(
        mode === 'create'
          ? t('repost_rule_created', 'Regra de repost criada')
          : t('repost_rule_updated', 'Regra de repost atualizada'),
        'success'
      );
      onSaved(saved);
    } catch {
      toaster.show(
        t('repost_save_failed', 'Falha ao salvar a regra de repost'),
        'warning'
      );
    } finally {
      setSaving(false);
    }
  };

  const sourceGroups = useMemo(
    () => groupSources(sourceCandidates || []),
    [sourceCandidates]
  );

  const selectedSourceGroup = useMemo(
    () => sourceGroups.find((g) => g.integrationId === sourceIntegrationId),
    [sourceGroups, sourceIntegrationId]
  );

  const destGroups = useMemo(
    () => groupDestinations(destCandidates || []),
    [destCandidates]
  );

  // Integrações já adicionadas (pelo menos 1 formato selecionado).
  const selectedDestIntegrationIds = useMemo(
    () => Array.from(new Set(destinations.map((d) => d.integrationId))),
    [destinations]
  );

  // Grupos disponíveis no dropdown: integrações que AINDA não têm
  // nenhum formato selecionado (uma vez adicionada, a integração sai
  // do dropdown e o user usa o pill do card para alternar formatos).
  const availableDestGroups = useMemo(
    () =>
      destGroups.filter(
        (g) => !selectedDestIntegrationIds.includes(g.integrationId)
      ),
    [destGroups, selectedDestIntegrationIds]
  );

  // Grupos selecionados: integrações com pelo menos 1 format ativo,
  // enriquecidas com formats do catálogo (pra renderizar todos os pills,
  // não só os selecionados).
  const selectedDestGroups = useMemo(() => {
    return selectedDestIntegrationIds
      .map((id) => destGroups.find((g) => g.integrationId === id))
      .filter((g): g is GroupedDestination => !!g);
  }, [destGroups, selectedDestIntegrationIds]);

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Card superior: Fonte → Destinos */}
      <div className="rounded-[12px] border border-fifth bg-sixth/60 p-[24px]">
        <div className="flex flex-col lg:flex-row gap-[20px] items-stretch">
          {/* Fonte */}
          <div className="flex flex-col gap-[8px] flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-customColor18 font-medium text-center">
              {t('repost_source_label_short', 'Fonte')}
            </div>
            <SourcePicker
              groups={sourceGroups}
              loading={loadingSources}
              selectedGroup={selectedSourceGroup}
              selectedType={sourceType || null}
              onPickIntegration={(group) => {
                setSourceIntegrationId(group.integrationId);
                // default: prioriza Story se disponível, senão primeiro
                const firstType =
                  group.sourceTypes.find((t) => t === 'INSTAGRAM_STORY') ??
                  group.sourceTypes[0];
                setSourceType(firstType);
                setDestinations([]);
              }}
              onChangeType={(type) => {
                setSourceType(type);
                // Ao trocar o sourceType, mantemos os destinos — a matriz atual
                // aceita os mesmos destinos pra ambos os sourceTypes (V2).
              }}
              onClear={() => {
                setSourceIntegrationId('');
                setSourceType('');
                setDestinations([]);
              }}
            />
          </div>

          <div className="hidden lg:flex items-center justify-center shrink-0 w-[72px]">
            <svg
              viewBox="0 0 64 40"
              width="56"
              height="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-customColor18"
            >
              <path d="M4 20h48" />
              <path d="M46 12l10 8-10 8" />
            </svg>
          </div>

          {/* Destinos */}
          <div className="flex flex-col gap-[8px] flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wide text-customColor18 font-medium text-center">
              {t('repost_destinations_label', 'Destinos')}
            </div>
            <DestinationsPicker
              availableGroups={availableDestGroups}
              selectedGroups={selectedDestGroups}
              selectedDestinations={destinations}
              loading={loadingDests}
              sourceSelected={!!sourceType}
              onAddIntegration={(group) =>
                setDestinations((current) => {
                  if (group.formats.length === 0) return current;
                  // default: prioriza Reel/Feed para Instagram, senão primeiro.
                  const firstFormat =
                    group.formats.find((f) => f === 'INSTAGRAM_POST') ??
                    group.formats[0];
                  return [
                    ...current,
                    {
                      integrationId: group.integrationId,
                      format: firstFormat,
                    },
                  ];
                })
              }
              onToggleFormat={(integrationId, format) =>
                setDestinations((current) => {
                  const exists = current.some(
                    (d) =>
                      d.integrationId === integrationId && d.format === format
                  );
                  if (exists) {
                    // Não permite remover o último formato via pill — use lixeira.
                    const countForIntegration = current.filter(
                      (d) => d.integrationId === integrationId
                    ).length;
                    if (countForIntegration <= 1) return current;
                    return current.filter(
                      (d) =>
                        !(
                          d.integrationId === integrationId &&
                          d.format === format
                        )
                    );
                  }
                  return [...current, { integrationId, format }];
                })
              }
              onRemoveIntegration={(integrationId) =>
                setDestinations((current) =>
                  current.filter((d) => d.integrationId !== integrationId)
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Cards inferiores: Geral + Conteúdo */}
      <div className="flex flex-col md:flex-row gap-[20px] items-stretch">
        <div className="rounded-[12px] border border-fifth bg-sixth/60 p-[20px] flex flex-col gap-[16px] md:w-[320px] md:shrink-0">
          <div className="text-[14px] font-semibold text-textColor">
            {t('repost_section_general', 'Geral')}
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-textColor">
              {t('repost_rule_name_label', 'Nome da automação')}
            </label>
            <input
              type="text"
              className="h-[40px] bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[12px] text-[13px] text-textColor"
              placeholder={t(
                'repost_rule_name_placeholder',
                'Ex.: Stories do @canal → TikTok + YouTube'
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-textColor">
              {t('repost_frequency_label', 'Frequência de verificação')}
            </label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
              className="h-[40px] bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[12px] text-[13px] text-textColor"
            >
              {INTERVAL_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p < 60
                    ? `${p} ${t('minutes_short', 'min')}`
                    : `${p / 60} ${t('hours_short', 'h')}`}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-customColor18">
              {t(
                'repost_filter_videos_only_hint',
                'V1 repostará apenas vídeos. Fotos são puladas automaticamente.'
              )}
            </span>
          </div>
        </div>

        <div className="rounded-[12px] border border-fifth bg-sixth/60 p-[20px] flex flex-col gap-[16px] flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-textColor">
            {t('repost_section_content', 'Conteúdo')}
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-textColor">
              {t('repost_caption_template_label', 'Modelo de Legenda')}
            </label>
            <textarea
              className="min-h-[100px] bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[12px] py-[10px] text-[13px] text-textColor"
              placeholder={t(
                'repost_caption_template_placeholder',
                'Texto para acompanhar cada repost. Use {{timestamp}} para incluir a data.'
              )}
              value={captionTemplate}
              onChange={(e) => setCaptionTemplate(e.target.value)}
              maxLength={2200}
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-textColor">
              {t(
                'repost_filter_hashtag_label',
                'Hashtag de ativação (opcional)'
              )}
            </label>
            <input
              type="text"
              className="h-[40px] bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[12px] text-[13px] text-textColor"
              placeholder={t(
                'repost_filter_hashtag_placeholder',
                'Ex.: #repost'
              )}
              value={filterHashtag}
              onChange={(e) => setFilterHashtag(e.target.value)}
              maxLength={100}
            />
            <span className="text-[11px] text-customColor18">
              {t(
                'repost_filter_hashtag_hint',
                'Se preenchido, só posts com essa hashtag na legenda serão repostados. Em branco reposta tudo. (Stories normalmente não têm legenda.)'
              )}
            </span>
          </div>

          <label className="flex items-center gap-[8px] text-[13px] text-textColor cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t('repost_toggle_enable', 'Ativar regra agora')}
          </label>

          <div className="flex items-center justify-end gap-[8px] pt-[4px]">
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-[6px] border border-fifth bg-btnSimple px-[18px] py-[8px] text-[13px] text-textColor hover:opacity-80"
              >
                {t('cancel', 'Cancelar')}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSave}
              className="rounded-[6px] bg-btnPrimary px-[18px] py-[8px] text-[13px] text-white hover:opacity-80 disabled:opacity-50"
            >
              {saving
                ? t('saving', 'Salvando...')
                : t('save', 'Salvar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────── Pill Toggle ──────────────────────

interface PillToggleProps<T extends string> {
  options: T[];
  active: T[];
  mode: 'single' | 'multi';
  onToggle: (value: T) => void;
  labelFor: (value: T) => string;
}

function PillToggle<T extends string>({
  options,
  active,
  mode,
  onToggle,
  labelFor,
}: PillToggleProps<T>) {
  if (options.length <= 1) {
    // Provider tem só 1 formato — mostra como badge estático sem interação.
    const only = options[0];
    if (!only) return null;
    return (
      <span className="inline-flex items-center rounded-full border border-fifth bg-newBgColor/40 px-[10px] py-[3px] text-[11px] text-customColor18">
        {labelFor(only)}
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-[4px] rounded-full border border-fifth bg-newBgColor/40 p-[2px]">
      {options.map((opt) => {
        const selected = active.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(opt);
            }}
            aria-pressed={selected}
            className={`rounded-full px-[10px] py-[3px] text-[11px] transition-colors ${
              selected
                ? 'text-white'
                : 'text-customColor18 hover:text-textColor'
            }`}
            style={{
              backgroundColor: selected ? '#22c55e' : 'transparent',
            }}
          >
            {labelFor(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────── Source Picker ──────────────────────

interface SourcePickerProps {
  groups: GroupedSource[];
  loading: boolean;
  selectedGroup?: GroupedSource;
  selectedType: RepostSourceType | null;
  onPickIntegration: (group: GroupedSource) => void;
  onChangeType: (type: RepostSourceType) => void;
  onClear: () => void;
}

const SourcePicker: FC<SourcePickerProps> = ({
  groups,
  loading,
  selectedGroup,
  selectedType,
  onPickIntegration,
  onChangeType,
  onClear,
}) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false));

  const handlePick = (group: GroupedSource) => {
    onPickIntegration(group);
    setOpen(false);
  };

  if (loading) {
    return (
      <div className="rounded-[10px] border border-fifth bg-newBgColorInner px-[16px] py-[18px] text-[12px] text-customColor18">
        {t('loading', 'Carregando...')}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-fifth bg-newBgColorInner px-[16px] py-[18px] text-[12px] text-customColor19">
        {t(
          'repost_no_source_channels',
          'Conecte uma conta Instagram Business para usar esta feature.'
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {selectedGroup ? (
        <div className="flex flex-col gap-[10px] rounded-[10px] border border-fifth bg-newBgColorInner px-[14px] py-[12px]">
          <div className="flex items-center gap-[12px]">
            <span className="relative inline-block leading-none">
              <PlatformIconBadge
                identifier={selectedGroup.providerIdentifier}
                size={36}
                zernioBadgeSize={15}
                zernioBadgeRadius={15}
              />
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-textColor truncate">
                {platformDisplayName(selectedGroup.providerIdentifier)}
              </span>
              <span className="text-[12px] text-customColor18 truncate">
                @{selectedGroup.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-[12px] text-customColor18 hover:text-textColor px-[8px] py-[4px] rounded-[4px] hover:bg-boxHover"
            >
              {t('repost_change', 'Trocar')}
            </button>
            <button
              type="button"
              onClick={onClear}
              aria-label={t('remove', 'Remover')}
              className="text-customColor18 hover:text-textColor w-[24px] h-[24px] flex items-center justify-center rounded-[4px] hover:bg-boxHover"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-[8px]">
            <span className="text-[11px] uppercase tracking-wide text-customColor18">
              {t('repost_format_label', 'Formato')}:
            </span>
            <PillToggle<RepostSourceType>
              options={selectedGroup.sourceTypes}
              active={selectedType ? [selectedType] : []}
              mode="single"
              onToggle={(type) => onChangeType(type)}
              labelFor={(type) => SOURCE_TYPE_LABEL[type] ?? type}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-[10px] rounded-[10px] border border-dashed border-fifth bg-newBgColorInner px-[14px] py-[18px] text-[13px] text-customColor18 hover:border-btnPrimary/50 hover:text-textColor"
        >
          <span className="text-[18px] leading-none">+</span>
          {t('repost_pick_source', 'Escolher fonte')}
        </button>
      )}

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-[6px] rounded-[8px] border border-fifth bg-newBgColorInner shadow-menu overflow-hidden max-h-[300px] overflow-y-auto">
          {groups.map((g) => (
            <button
              key={g.integrationId}
              type="button"
              onClick={() => handlePick(g)}
              className={`w-full flex items-center gap-[10px] px-[14px] py-[10px] text-left hover:bg-boxHover ${
                selectedGroup?.integrationId === g.integrationId
                  ? 'bg-boxHover'
                  : ''
              }`}
            >
              <span className="relative inline-block leading-none">
                <PlatformIconBadge
                  identifier={g.providerIdentifier}
                  size={28}
                  zernioBadgeSize={15}
                  zernioBadgeRadius={15}
                />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-textColor truncate">
                  {platformDisplayName(g.providerIdentifier)}
                </span>
                <span className="text-[11px] text-customColor18 truncate">
                  @{g.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ────────────────────── Destinations Picker ──────────────────────

interface DestinationsPickerProps {
  availableGroups: GroupedDestination[];
  selectedGroups: GroupedDestination[];
  selectedDestinations: RepostDestination[];
  loading: boolean;
  sourceSelected: boolean;
  onAddIntegration: (group: GroupedDestination) => void;
  onToggleFormat: (
    integrationId: string,
    format: RepostDestinationFormat
  ) => void;
  onRemoveIntegration: (integrationId: string) => void;
}

const DestinationsPicker: FC<DestinationsPickerProps> = ({
  availableGroups,
  selectedGroups,
  selectedDestinations,
  loading,
  sourceSelected,
  onAddIntegration,
  onToggleFormat,
  onRemoveIntegration,
}) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false));

  const handlePick = (group: GroupedDestination) => {
    onAddIntegration(group);
    setOpen(false);
  };

  const activeFormatsFor = (integrationId: string) =>
    selectedDestinations
      .filter((d) => d.integrationId === integrationId)
      .map((d) => d.format);

  if (!sourceSelected) {
    return (
      <div className="rounded-[10px] border border-dashed border-fifth bg-newBgColorInner px-[16px] py-[18px] text-[12px] text-customColor18 text-center">
        {t(
          'repost_pick_source_first',
          'Escolha a fonte primeiro para ver os destinos compatíveis.'
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[10px] border border-fifth bg-newBgColorInner px-[16px] py-[18px] text-[12px] text-customColor18">
        {t('loading', 'Carregando...')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]" ref={wrapperRef}>
      {selectedGroups.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          {selectedGroups.map((g) => {
            const active = activeFormatsFor(g.integrationId);
            return (
              <div
                key={g.integrationId}
                className="flex flex-col gap-[8px] rounded-[10px] border border-fifth bg-newBgColorInner px-[14px] py-[10px]"
              >
                <div className="flex items-center gap-[10px]">
                  <span className="relative inline-block leading-none">
                    <PlatformIconBadge
                      identifier={g.providerIdentifier}
                      size={28}
                      zernioBadgeSize={15}
                      zernioBadgeRadius={15}
                    />
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[13px] text-textColor truncate">
                      {platformDisplayName(g.providerIdentifier)}
                    </span>
                    <span className="text-[11px] text-customColor18 truncate">
                      @{g.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveIntegration(g.integrationId)}
                    aria-label={t('remove', 'Remover')}
                    className="text-customColor18 hover:text-[#ef4444] w-[28px] h-[28px] flex items-center justify-center rounded-[4px] hover:bg-boxHover"
                  >
                    🗑
                  </button>
                </div>
                <div className="flex items-center gap-[8px]">
                  <span className="text-[11px] uppercase tracking-wide text-customColor18">
                    {t('repost_format_label', 'Formato')}:
                  </span>
                  <PillToggle<RepostDestinationFormat>
                    options={g.formats}
                    active={active}
                    mode="multi"
                    onToggle={(format) =>
                      onToggleFormat(g.integrationId, format)
                    }
                    labelFor={(format) => FORMAT_LABEL[format] ?? format}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={availableGroups.length === 0}
          className="w-full flex items-center justify-center gap-[8px] rounded-[10px] border border-dashed border-fifth bg-newBgColorInner px-[14px] py-[14px] text-[13px] text-customColor18 hover:border-btnPrimary/50 hover:text-textColor disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[16px] leading-none">+</span>
          {t('repost_add_platform', 'Adicionar Plataforma')}
        </button>
        {open && availableGroups.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-[6px] rounded-[8px] border border-fifth bg-newBgColorInner shadow-menu overflow-hidden max-h-[300px] overflow-y-auto">
            {availableGroups.map((g) => (
              <button
                key={g.integrationId}
                type="button"
                onClick={() => handlePick(g)}
                className="w-full flex items-center gap-[10px] px-[14px] py-[10px] text-left hover:bg-boxHover"
              >
                <span className="relative inline-block leading-none">
                  <PlatformIconBadge
                    identifier={g.providerIdentifier}
                    size={28}
                    zernioBadgeSize={15}
                    zernioBadgeRadius={15}
                  />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] text-textColor truncate">
                    {platformDisplayName(g.providerIdentifier)}
                  </span>
                  <span className="text-[11px] text-customColor18 truncate">
                    @{g.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGroups.length === 0 && (
        <div className="text-[11px] text-customColor18 text-center py-[4px]">
          {t('repost_no_destinations_yet', 'Nenhum destino selecionado ainda.')}
        </div>
      )}
    </div>
  );
};
