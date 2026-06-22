'use client';

import { useMemo, useState } from 'react';
import { X, Star, Trash2, CopyPlus, Wand2, Users } from 'lucide-react';
import { CAROUSEL_FONTS, deriveBrandKit, type BrandKit } from '@gitroom/carousel-engine';
import {
  applyBrandToProjectCarousels,
  clearBrandDefaults,
  copyProjectConfig,
  loadBrandDefaults,
  loadFavoriteFonts,
  saveBrandDefaults,
  toggleFavoriteFont,
} from './carousel-store';
import { useExperts, useClientExperts } from '@gitroom/frontend/components/hub/crm/use-experts.hook';
import { useCrmMutations } from '@gitroom/frontend/components/hub/crm/use-crm-mutations.hook';

export interface ProjectOption {
  id: string;
  name: string;
}

/**
 * Configurações globais POR PROJETO — cores, campos globais e fontes favoritas.
 * Editável direto na Galeria (sem precisar abrir um carrossel). Escreve na MESMA
 * chave (`project-defaults:{crmClientId}`) que o toggle "Usar como padrão" do
 * editor — aqui é só outra porta de entrada para o mesmo dado.
 *
 * Novos carrosséis do projeto herdam estes valores (`createNewCarousel`);
 * carrosséis já existentes NÃO são alterados — o override individual continua
 * possível e intacto.
 */
interface ProjectSettingsModalProps {
  clientId: string | null;
  projectName: string;
  /** Outros projetos ativados (p/ "copiar config de…"). Não inclui este. */
  otherProjects?: ProjectOption[];
  /** Quantos carrosséis o projeto já tem (habilita "aplicar aos existentes"). */
  carouselCount?: number;
  onClose: () => void;
  /** Chamado após salvar/aplicar/limpar, p/ a galeria re-listar. */
  onChanged?: () => void;
}

export const ProjectSettingsModal = ({
  clientId,
  projectName,
  otherProjects = [],
  carouselCount = 0,
  onClose,
  onChanged,
}: ProjectSettingsModalProps) => {
  const baseline = useMemo<BrandKit>(() => {
    const defaults = loadBrandDefaults(clientId);
    return defaults ? { ...deriveBrandKit({}), ...defaults } : deriveBrandKit({});
  }, [clientId]);

  const [brand, setBrand] = useState<BrandKit>(baseline);
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(() => loadFavoriteFonts(clientId));
  const [saved, setSaved] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // experts (N:N marca↔expert) — todos da org + os vinculados a esta marca
  const { data: allExperts = [] } = useExperts();
  const { data: clientExperts, mutate: reloadClientExperts } = useClientExperts(clientId);
  const { createExpert, linkExpert, unlinkExpert } = useCrmMutations();
  const linkedExpertIds = useMemo(() => (clientExperts ?? []).map((e) => e.id), [clientExperts]);
  const [newExpertName, setNewExpertName] = useState('');
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [togglingExpertId, setTogglingExpertId] = useState<string | null>(null);

  const onToggleExpertLink = async (expertId: string, linked: boolean) => {
    if (!clientId) return;
    setTogglingExpertId(expertId);
    try {
      if (linked) await unlinkExpert(clientId, expertId);
      else await linkExpert(clientId, expertId);
      await reloadClientExperts();
    } finally {
      setTogglingExpertId(null);
    }
  };

  const onCreateExpert = async () => {
    const name = newExpertName.trim();
    if (!name || creatingExpert || !clientId) return;
    setCreatingExpert(true);
    try {
      const created = await createExpert({ name });
      await linkExpert(clientId, created.id);
      await reloadClientExperts();
      setNewExpertName('');
    } finally {
      setCreatingExpert(false);
    }
  };

  const update = (patch: Partial<BrandKit>) => {
    setBrand((b) => ({ ...b, ...patch }));
    setSaved(false);
    setConfirmApply(false);
    setApplyResult(null);
  };

  const onUploadAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const onToggleFavorite = (font: string) => {
    setFavoriteFonts(toggleFavoriteFont(clientId, font));
  };

  const onCopyFrom = (fromId: string) => {
    if (!fromId) return;
    const defaults = loadBrandDefaults(fromId);
    if (defaults) setBrand({ ...deriveBrandKit({}), ...defaults });
    // fontes favoritas são gravadas ao vivo — copia já persistindo
    copyProjectConfig(fromId, clientId);
    setFavoriteFonts(loadFavoriteFonts(clientId));
    setSaved(false);
  };

  const onSave = () => {
    saveBrandDefaults(clientId, brand);
    setSaved(true);
    onChanged?.();
  };

  const onApplyToExisting = () => {
    if (!confirmApply) {
      setConfirmApply(true);
      return;
    }
    saveBrandDefaults(clientId, brand);
    const n = applyBrandToProjectCarousels(clientId, brand);
    setConfirmApply(false);
    setApplyResult(`${n} ${n === 1 ? 'carrossel atualizado' : 'carrosséis atualizados'}`);
    setSaved(true);
    onChanged?.();
  };

  const onClear = () => {
    clearBrandDefaults(clientId);
    setBrand(deriveBrandKit({}));
    setSaved(false);
    onChanged?.();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-[24px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-[480px] max-h-[88vh] rounded-[16px] bg-newBgColorInner border border-newBorder overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-[10px] px-[20px] h-[58px] shrink-0 border-b border-newBorder">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[14px] font-[800] leading-tight">Configurações da marca/expert</span>
            <span className="text-[11px] text-textItemBlur leading-tight truncate">{projectName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center w-[30px] h-[30px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[22px]">
          <p className="text-[11px] text-textItemBlur leading-[1.5] -mt-[4px]">
            Estes valores são o padrão de TODO carrossel novo desta marca/expert. Carrosséis já criados
            não mudam (a não ser que você use "Aplicar aos existentes") — e qualquer carrossel pode
            sobrescrever individualmente no editor.
          </p>

          {otherProjects.length > 0 && (
            <label className="flex flex-col gap-[5px]">
              <span className="flex items-center gap-[5px] text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                <CopyPlus size={12} />
                Copiar configurações de outra marca/expert
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  onCopyFrom(e.target.value);
                  e.target.value = '';
                }}
                className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
              >
                <option value="" disabled>
                  Escolher marca/expert…
                </option>
                {otherProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Campos globais */}
          <section className="flex flex-col gap-[12px]">
            <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
              Campos globais
            </span>
            <SettingField label="Marca" value={brand.brandName} onChange={(v) => update({ brandName: v })} />
            <SettingField label="@ handle" value={brand.handle} onChange={(v) => update({ handle: v })} />
            <SettingField label="Copyright" value={brand.copyright} onChange={(v) => update({ copyright: v })} />

            <div className="flex items-center gap-[10px]">
              <div className="w-[40px] h-[40px] shrink-0 rounded-[10px] overflow-hidden bg-newBgColor border border-newBorder grid place-items-center">
                {brand.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-textItemBlur">—</span>
                )}
              </div>
              <label className="flex-1 text-[12px] font-[700] px-[12px] py-[8px] rounded-[9px] text-center cursor-pointer border border-dashed border-newBorder text-textItemBlur hover:bg-boxHover hover:text-newTextColor transition-colors">
                Trocar avatar / foto de perfil
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadAvatar(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </section>

          {/* Cores globais */}
          <section className="flex flex-col gap-[10px]">
            <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
              Cores globais
            </span>
            <SettingColor label="Primária (accent)" value={brand.primary} onChange={(v) => update({ primary: v })} />
            <SettingColor
              label="Barra de topo"
              value={brand.accentBar ?? brand.primary}
              onChange={(v) => update({ accentBar: v })}
            />
            <SettingColor label="Fundo claro" value={brand.bgLight} onChange={(v) => update({ bgLight: v })} />
            <SettingColor label="Fundo escuro" value={brand.bgDark} onChange={(v) => update({ bgDark: v })} />
          </section>

          {/* Fontes favoritas */}
          <section className="flex flex-col gap-[10px]">
            <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
              Fontes favoritas do projeto
            </span>
            <p className="text-[11px] text-textItemBlur leading-[1.5] -mt-[2px]">
              Só aparecem em destaque no seletor de fonte — escolher a fonte de cada texto continua
              manual (afeta a diagramação do slide).
            </p>
            <div className="flex flex-col gap-[4px] max-h-[180px] overflow-y-auto rounded-[10px] border border-newBorder p-[6px]">
              {CAROUSEL_FONTS.map((f) => {
                const fav = favoriteFonts.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onToggleFavorite(f)}
                    className="flex items-center justify-between gap-[8px] px-[10px] py-[7px] rounded-[8px] hover:bg-boxHover transition-colors text-left"
                  >
                    <span className="text-[13px]" style={{ fontFamily: f }}>
                      {f}
                    </span>
                    <Star
                      size={14}
                      className={fav ? '' : 'text-textItemBlur'}
                      style={fav ? { color: 'var(--voc-rose)', fill: 'var(--voc-rose)' } : undefined}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Experts vinculados (N:N marca↔expert) */}
          {clientId && (
            <section className="flex flex-col gap-[10px]">
              <span className="flex items-center gap-[5px] text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                <Users size={12} />
                Experts vinculados a esta marca
              </span>
              <p className="text-[11px] text-textItemBlur leading-[1.5] -mt-[2px]">
                Um expert pode estar vinculado a várias marcas. Vincule aqui para poder atribuí-lo a
                carrosséis desta marca (painel "Expert" no editor).
              </p>
              <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto rounded-[10px] border border-newBorder p-[6px]">
                {allExperts.length === 0 && (
                  <span className="text-[11px] text-textItemBlur px-[6px] py-[4px]">
                    Nenhum expert cadastrado ainda.
                  </span>
                )}
                {allExperts.map((expert) => {
                  const linked = linkedExpertIds.includes(expert.id);
                  return (
                    <button
                      key={expert.id}
                      type="button"
                      onClick={() => onToggleExpertLink(expert.id, linked)}
                      disabled={togglingExpertId === expert.id}
                      className="flex items-center justify-between gap-[8px] px-[10px] py-[7px] rounded-[8px] hover:bg-boxHover transition-colors text-left disabled:opacity-50"
                    >
                      <span className="text-[13px] truncate">
                        {expert.name}
                        {expert.role ? <span className="text-textItemBlur"> · {expert.role}</span> : null}
                      </span>
                      <span
                        className="shrink-0 text-[10px] font-[700] px-[8px] py-[2px] rounded-full"
                        style={
                          linked
                            ? { background: 'rgba(207,98,149,0.15)', color: 'var(--voc-rose)' }
                            : { background: 'var(--new-bgColor)', color: 'var(--new-textItemBlur)', border: '1px solid var(--new-border)' }
                        }
                      >
                        {linked ? 'Vinculado' : 'Vincular'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-[6px]">
                <input
                  value={newExpertName}
                  onChange={(e) => setNewExpertName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCreateExpert();
                  }}
                  placeholder="Nome do novo expert"
                  className="flex-1 text-[12px] px-[10px] py-[7px] rounded-[9px] bg-newBgColor border border-newBorder text-newTextColor outline-none placeholder:text-textItemBlur"
                />
                <button
                  type="button"
                  onClick={onCreateExpert}
                  disabled={!newExpertName.trim() || creatingExpert}
                  className="shrink-0 text-[12px] font-[700] px-[12px] py-[7px] rounded-[9px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--voc-rose)' }}
                >
                  + Criar e vincular
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex flex-col gap-[8px] px-[20px] py-[12px] shrink-0 border-t border-newBorder">
          {carouselCount > 0 && (
            <button
              type="button"
              onClick={onApplyToExisting}
              title="Reaplica estas cores/campos aos carrosséis já criados (sobrescreve personalizações por carrossel)"
              className="flex items-center justify-center gap-[7px] text-[12px] font-[700] w-full h-[38px] rounded-[10px] border transition-colors"
              style={
                confirmApply
                  ? { borderColor: 'var(--voc-rose)', background: 'rgba(207,98,149,0.12)', color: 'var(--voc-rose)' }
                  : { borderColor: 'var(--new-border)', color: 'var(--new-textColor)' }
              }
            >
              <Wand2 size={14} />
              {applyResult
                ? applyResult
                : confirmApply
                ? `Sobrescrever os ${carouselCount} carrosséis? Clique p/ confirmar`
                : `Aplicar aos ${carouselCount} carrosséis existentes`}
            </button>
          )}
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={onClear}
              title="Remove o padrão desta marca/expert (volta ao padrão Vocaccio)"
              className="flex items-center gap-[6px] text-[12px] font-[700] px-[12px] h-[38px] rounded-[10px] border border-newBorder text-textItemBlur hover:bg-boxHover transition-colors"
            >
              <Trash2 size={14} />
              Limpar
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onSave}
              className="text-[13px] font-[800] px-[18px] h-[38px] rounded-full text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--voc-aurora)' }}
            >
              {saved ? 'Salvo!' : 'Salvar padrão da marca/expert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-[5px]">
    <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
    />
  </label>
);

const SettingColor = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between gap-[10px]">
    <span className="text-[12px] text-textItemBlur">{label}</span>
    <div className="flex items-center gap-[8px]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[88px] text-[12px] px-[8px] py-[6px] rounded-[8px] bg-newBgColor border border-newBorder text-newTextColor outline-none"
      />
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-[30px] h-[26px] bg-transparent border border-newBorder rounded-[6px] cursor-pointer"
      />
    </div>
  </div>
);
