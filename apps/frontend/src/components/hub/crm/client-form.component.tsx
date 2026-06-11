'use client';

import { FC, FormEvent, useState } from 'react';
import { ClientFormData } from './use-crm-mutations.hook';

const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: 'Ativo' },
  { value: 'PROSPECT', label: 'Prospecto' },
  { value: 'LEAD',     label: 'Lead' },
  { value: 'INACTIVE', label: 'Inativo' },
];

interface Props {
  initial?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
}

const Field: FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="flex flex-col gap-[6px]">
    <label className="text-[12px] font-[700] text-newTableText uppercase tracking-[0.06em]">
      {label}{required && <span className="text-[var(--voc-rose)] ml-[2px]">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-[14px] py-[10px] rounded-[10px] bg-newBgColor border border-newTableBorder text-[14px] text-newTextColor placeholder:text-newTableText outline-none focus:border-[var(--voc-violet)] transition-colors";

export const ClientForm: FC<Props> = ({
  initial = {},
  onSubmit,
  submitLabel = 'Salvar',
  onCancel,
}) => {
  const [name, setName]       = useState(initial.name ?? '');
  const [email, setEmail]     = useState(initial.email ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');
  const [segment, setSegment] = useState(initial.segment ?? '');
  const [status, setStatus]   = useState(initial.status ?? 'ACTIVE');
  const [notes, setNotes]     = useState(initial.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    setLoading(true);
    try {
      const payload: ClientFormData = { name: name.trim(), status };
      if (email.trim())   payload.email   = email.trim();
      if (website.trim()) payload.website = website.trim();
      if (segment.trim()) payload.segment = segment.trim();
      if (notes.trim())   payload.notes   = notes.trim();
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
      <Field label="Nome" required>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Camila Caeron" />
      </Field>

      <div className="grid grid-cols-2 gap-[12px]">
        <Field label="E-mail">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
        </Field>
        <Field label="Website">
          <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <Field label="Segmento">
          <input className={inputCls} value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: Saúde, Moda…" />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas internas sobre o cliente…"
        />
      </Field>

      {error && <p className="text-[13px]" style={{ color: 'var(--voc-rose)' }}>{error}</p>}

      <div className="flex gap-[10px] pt-[4px]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-[11px] rounded-[12px] text-[13px] font-[700] text-newTextColor border border-newTableBorder hover:bg-newBgColor transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-[11px] rounded-[12px] text-[13px] font-[800] text-white disabled:opacity-60 transition-opacity"
          style={{ background: 'var(--voc-aurora)' }}
        >
          {loading ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  );
};
