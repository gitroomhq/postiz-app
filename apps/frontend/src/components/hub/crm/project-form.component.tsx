'use client';

import { FC, useState } from 'react';
import { ProjectDetail, SocialHandles, Persona } from './use-project.hook';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: 'Ativo' },
  { value: 'PAUSED',   label: 'Pausado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

const TONE_OPTIONS = [
  { value: 'FORMAL',        label: 'Formal' },
  { value: 'CASUAL',        label: 'Casual' },
  { value: 'INSPIRATIONAL', label: 'Inspiracional' },
  { value: 'TECHNICAL',     label: 'Técnico' },
  { value: 'PLAYFUL',       label: 'Descontraído' },
  { value: 'AUTHORITATIVE', label: 'Autoritativo' },
];

const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'facebook',  label: 'Facebook' },
  { key: 'x',         label: 'X (Twitter)' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'threads',   label: 'Threads' },
];

// ─── UI primitives ────────────────────────────────────────────────────────────

const inputCls = "w-full px-[14px] py-[10px] rounded-[10px] bg-newBgColor border border-newTableBorder text-[14px] text-newTextColor placeholder:text-newTableText outline-none focus:border-[var(--voc-violet)] transition-colors";
const labelCls = "text-[12px] font-[700] text-newTableText uppercase tracking-[0.06em]";

const Field: FC<{ label: string; required?: boolean; children: React.ReactNode; hint?: string }> = ({ label, required, children, hint }) => (
  <div className="flex flex-col gap-[6px]">
    <label className={labelCls}>
      {label}{required && <span className="text-[var(--voc-rose)] ml-[2px]">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-newTableText opacity-60">{hint}</p>}
  </div>
);

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-newBgColorInner rounded-[16px] border border-newTableBorder p-[20px] flex flex-col gap-[16px]">
    <h3 className="text-[13px] font-[800] uppercase tracking-[0.1em]" style={{ color: 'var(--voc-violet)' }}>{title}</h3>
    {children}
  </div>
);

// ─── Tags input (for pains/desires) ──────────────────────────────────────────

const TagsInput: FC<{ value: string[]; onChange: (v: string[]) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInput('');
  };
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex gap-[6px]">
        <input
          className={`${inputCls} flex-1`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="px-[14px] py-[10px] rounded-[10px] text-[13px] font-[700] text-white" style={{ background: 'var(--voc-violet)' }}>+</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {value.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full text-[12px] font-[600]" style={{ background: 'rgba(115,96,170,0.14)', color: 'var(--voc-violet)' }}>
              {tag}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProjectFormData {
  name: string;
  clientId: string;
  ownerId: string;
  businessArea?: string;
  slogan?: string;
  website?: string;
  bioLink?: string;
  productsServices?: string;
  toneOfVoice?: string;
  cta1?: string;
  cta2?: string;
  cta3?: string;
  briefing?: string;
  locale?: string;
  timezone?: string;
  status?: string;
  socialHandles?: SocialHandles;
  persona?: Persona;
}

interface Props {
  initial?: Partial<ProjectDetail>;
  clients: { id: string; name: string }[];
  currentUserId: string;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
}

// ─── Main form ────────────────────────────────────────────────────────────────

export const ProjectForm: FC<Props> = ({ initial = {}, clients, currentUserId, onSubmit, submitLabel = 'Salvar', onCancel }) => {
  const [name, setName]                   = useState(initial.name ?? '');
  const [clientId, setClientId]           = useState(initial.clientId ?? (clients[0]?.id ?? ''));
  const [businessArea, setBusinessArea]   = useState(initial.businessArea ?? '');
  const [slogan, setSlogan]               = useState(initial.slogan ?? '');
  const [website, setWebsite]             = useState(initial.website ?? '');
  const [bioLink, setBioLink]             = useState(initial.bioLink ?? '');
  const [productsServices, setProductsServices] = useState(initial.productsServices ?? '');
  const [toneOfVoice, setToneOfVoice]     = useState(initial.toneOfVoice ?? 'CASUAL');
  const [cta1, setCta1]                   = useState(initial.cta1 ?? '');
  const [cta2, setCta2]                   = useState(initial.cta2 ?? '');
  const [cta3, setCta3]                   = useState(initial.cta3 ?? '');
  const [briefing, setBriefing]           = useState(initial.briefing ?? '');
  const [status, setStatus]               = useState(initial.status ?? 'ACTIVE');
  const [socialHandles, setSocialHandles] = useState<SocialHandles>(initial.socialHandles ?? {});
  const [personaName, setPersonaName]     = useState(initial.persona?.name ?? '');
  const [pains, setPains]                 = useState<string[]>(initial.persona?.pains ?? []);
  const [desires, setDesires]             = useState<string[]>(initial.persona?.desires ?? []);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório.'); return; }
    if (!clientId)    { setError('Cliente é obrigatório.'); return; }
    setError(''); setLoading(true);
    try {
      const payload: ProjectFormData = {
        name: name.trim(),
        clientId,
        ownerId: currentUserId,
        status,
        toneOfVoice,
      };
      if (businessArea.trim())   payload.businessArea   = businessArea.trim();
      if (slogan.trim())         payload.slogan         = slogan.trim();
      if (website.trim())        payload.website        = website.trim();
      if (bioLink.trim())        payload.bioLink        = bioLink.trim();
      if (productsServices.trim()) payload.productsServices = productsServices.trim();
      if (cta1.trim()) payload.cta1 = cta1.trim();
      if (cta2.trim()) payload.cta2 = cta2.trim();
      if (cta3.trim()) payload.cta3 = cta3.trim();
      if (briefing.trim()) payload.briefing = briefing.trim();
      const handles = Object.fromEntries(Object.entries(socialHandles).filter(([, v]) => v?.trim()));
      if (Object.keys(handles).length) payload.socialHandles = handles;
      if (personaName.trim() || pains.length || desires.length) {
        payload.persona = { name: personaName.trim() || undefined, pains, desires };
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">

      {/* 1. Identidade */}
      <Section title="1 · Identidade">
        <Field label="Nome do projeto" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marca Pessoal Camila" />
        </Field>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Cliente" required>
            <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Área de atuação">
            <input className={inputCls} value={businessArea} onChange={(e) => setBusinessArea(e.target.value)} placeholder="Ex: Saúde, Moda…" />
          </Field>
          <Field label="Slogan">
            <input className={inputCls} value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Frase de posicionamento" />
          </Field>
        </div>
      </Section>

      {/* 2. Presença digital */}
      <Section title="2 · Presença Digital">
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Site">
            <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Bio Link">
            <input className={inputCls} value={bioLink} onChange={(e) => setBioLink(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        <Field label="Redes sociais" hint="@ ou URL de cada rede">
          <div className="grid grid-cols-2 gap-[10px]">
            {SOCIAL_NETWORKS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-[8px]">
                <span className="text-[12px] text-newTableText w-[80px] flex-shrink-0">{label}</span>
                <input
                  className={inputCls}
                  value={(socialHandles as any)[key] ?? ''}
                  onChange={(e) => setSocialHandles({ ...socialHandles, [key]: e.target.value })}
                  placeholder="@handle"
                />
              </div>
            ))}
          </div>
        </Field>
      </Section>

      {/* 3. Estratégia */}
      <Section title="3 · Estratégia">
        <Field label="Produtos e serviços">
          <textarea className={`${inputCls} resize-none`} rows={3} value={productsServices} onChange={(e) => setProductsServices(e.target.value)} placeholder="O que o cliente oferece?" />
        </Field>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Tom de voz">
            <select className={inputCls} value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)}>
              {TONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-[10px]">
          <Field label="CTA 1"><input className={inputCls} value={cta1} onChange={(e) => setCta1(e.target.value)} placeholder="Ex: Agende uma consulta" /></Field>
          <Field label="CTA 2"><input className={inputCls} value={cta2} onChange={(e) => setCta2(e.target.value)} placeholder="Ex: Acesse o programa" /></Field>
          <Field label="CTA 3"><input className={inputCls} value={cta3} onChange={(e) => setCta3(e.target.value)} placeholder="Ex: Siga no Instagram" /></Field>
        </div>
        <Field label="Persona — Nome">
          <input className={inputCls} value={personaName} onChange={(e) => setPersonaName(e.target.value)} placeholder="Ex: Juliana, 35 anos, empresária" />
        </Field>
        <Field label="Persona — Dores" hint="Enter para adicionar">
          <TagsInput value={pains} onChange={setPains} placeholder="Ex: Não sabe como se posicionar…" />
        </Field>
        <Field label="Persona — Desejos" hint="Enter para adicionar">
          <TagsInput value={desires} onChange={setDesires} placeholder="Ex: Ter autoridade na área…" />
        </Field>
        <Field label="Briefing livre">
          <textarea className={`${inputCls} resize-none`} rows={5} value={briefing} onChange={(e) => setBriefing(e.target.value)} placeholder="Contexto, história, diferenciais, restrições…" />
        </Field>
      </Section>

      {error && <p className="text-[13px]" style={{ color: 'var(--voc-rose)' }}>{error}</p>}

      <div className="flex gap-[10px]">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 py-[12px] rounded-[12px] text-[13px] font-[700] text-newTextColor border border-newTableBorder hover:bg-newBgColor transition-colors">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={loading} className="flex-1 py-[12px] rounded-[12px] text-[13px] font-[800] text-white disabled:opacity-60" style={{ background: 'var(--voc-aurora)' }}>
          {loading ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  );
};
