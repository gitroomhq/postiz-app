'use client';

import { FC, FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Globe, Briefcase, MessageSquare, Users, Pencil, Plus, ExternalLink } from 'lucide-react';
import { useClient, CrmProject, CrmContact, CrmInteraction, ClientLoadError } from './use-client.hook';
import { CrmModal } from './crm-modal.component';
import { ClientForm } from './client-form.component';
import { useCrmMutations } from './use-crm-mutations.hook';
import { Button } from '@gitroom/frontend/components/ui/button.component';
import { Card } from '@gitroom/frontend/components/ui/card.component';
import { Badge, ClientStatusBadge } from '@gitroom/frontend/components/ui/badge.component';
import { Field, Input, Textarea } from '@gitroom/frontend/components/ui/input.component';
import { Select } from '@gitroom/frontend/components/ui/select.component';

// ─── Shared ────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #e89a7b, #cf6295)',
  'linear-gradient(135deg, #cf6295, #7360aa)',
  'linear-gradient(135deg, #7360aa, #2897bf)',
  'linear-gradient(135deg, #2897bf, #e89a7b)',
];

const Avatar: FC<{ name: string; size?: number }> = ({ name, size = 52 }) => {
  const safe = name || '?';
  const initials = safe.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const idx = safe.charCodeAt(0) % GRADIENTS.length;
  return (
    <div
      className="flex-shrink-0 rounded-[14px] flex items-center justify-center text-white font-[800]"
      style={{ width: size, height: size, background: GRADIENTS[idx], fontSize: size * 0.31 }}
    >
      {initials}
    </div>
  );
};

const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'Ativo',     color: '#32d583' },
  PAUSED:    { label: 'Pausado',   color: '#e89a7b' },
  FINISHED:  { label: 'Concluído', color: '#9c9c9c' },
  CANCELLED: { label: 'Cancelado', color: '#cf6295' },
};

const INTERACTION_TYPES: Record<string, { label: string }> = {
  CALL:     { label: 'Ligação' },
  EMAIL:    { label: 'E-mail' },
  MEETING:  { label: 'Reunião' },
  NOTE:     { label: 'Nota' },
  WHATSAPP: { label: 'WhatsApp' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton: FC = () => (
  <div className="flex flex-col flex-1 bg-newBgColor animate-pulse">
    <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[24px]">
      <div className="max-w-[900px] mx-auto flex items-start gap-[16px]">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-newBgColor" />
        <div className="flex-1 space-y-[10px]">
          <div className="h-[22px] w-[220px] rounded-full bg-newBgColor" />
          <div className="h-[13px] w-[140px] rounded-full bg-newBgColor" />
        </div>
      </div>
    </div>
  </div>
);

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Projetos', 'Contatos', 'Interações', 'Observações'] as const;
type Tab = typeof TABS[number];

// ─── Projects tab ─────────────────────────────────────────────────────────────

const ProjectsTab: FC<{ projects: CrmProject[]; clientId: string }> = ({ projects, clientId }) => (
  <div>
    <div className="flex justify-end mb-[14px]">
      <Link
        href={`/hub/crm/projetos/novo?clientId=${clientId}`}
        className="inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-full text-[12px] font-[800] text-white"
        style={{ background: 'var(--voc-aurora)' }}
      >
        <Plus size={13} strokeWidth={2.5} /> Novo projeto
      </Link>
    </div>
    {projects.length === 0 ? (
      <div className="flex flex-col items-center py-[40px] text-center">
        <Briefcase size={28} className="text-newTableText mb-[10px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhum projeto ainda.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-[10px]">
        {projects.map((p) => {
          const ps = PROJECT_STATUS_MAP[p.status] ?? { label: p.status, color: '#9c9c9c' };
          return (
            <Card key={p.id} className="flex items-start justify-between gap-[16px] hover:border-[var(--voc-border-highlight)] transition-all duration-150 group">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-[700] text-newTextColor leading-tight">{p.name}</p>
                <div className="flex flex-wrap items-center gap-[10px] mt-[6px]">
                  {p.businessArea && <span className="text-[12px] text-newTableText">{p.businessArea}</span>}
                  {p.toneOfVoice && (
                    <>
                      <span className="text-newTableText opacity-30">·</span>
                      <span className="text-[12px] text-newTableText">{p.toneOfVoice}</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-newTableText mt-[4px] opacity-60">{formatDate(p.createdAt)}</p>
              </div>
              <div className="flex items-center gap-[10px] flex-shrink-0">
                <Badge bg={`${ps.color}22`} color={ps.color}>
                  {ps.label}
                </Badge>
                <Link
                  href={`/hub/crm/projetos/${p.id}`}
                  className="inline-flex items-center gap-[4px] text-[12px] font-[600] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--voc-violet)' }}
                >
                  <ExternalLink size={12} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Contacts tab ─────────────────────────────────────────────────────────────

const ContactsTab: FC<{ contacts: CrmContact[]; onAdd: () => void }> = ({ contacts, onAdd }) => (
  <div>
    <div className="flex justify-end mb-[14px]">
      <Button variant="primary" size="sm" onClick={onAdd} className="px-[14px] py-[8px] text-[12px]">
        <Plus size={13} strokeWidth={2.5} /> Novo contato
      </Button>
    </div>
    {contacts.length === 0 ? (
      <div className="flex flex-col items-center py-[40px] text-center">
        <Users size={28} className="text-newTableText mb-[10px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhum contato cadastrado.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-[10px]">
        {contacts.map((c) => (
          <Card key={c.id} className="flex items-start gap-[14px]">
            <Avatar name={c.name} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-[700] text-newTextColor leading-tight">{c.name}</p>
              {c.role && <p className="text-[12px] text-newTableText mt-[2px]">{c.role}</p>}
              <div className="flex flex-wrap gap-[14px] mt-[8px]">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-[5px] text-[12px] transition-colors" style={{ color: 'var(--voc-violet)' }}>
                    <Mail size={12} /> {c.email}
                  </a>
                )}
                {c.phone && <span className="text-[12px] text-newTableText">{c.phone}</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>
);

// ─── Interactions tab ─────────────────────────────────────────────────────────

const InteractionsTab: FC<{ interactions: CrmInteraction[]; onAdd: () => void }> = ({ interactions, onAdd }) => (
  <div>
    <div className="flex justify-end mb-[14px]">
      <Button variant="primary" size="sm" onClick={onAdd} className="px-[14px] py-[8px] text-[12px]">
        <Plus size={13} strokeWidth={2.5} /> Nova interação
      </Button>
    </div>
    {interactions.length === 0 ? (
      <div className="flex flex-col items-center py-[40px] text-center">
        <MessageSquare size={28} className="text-newTableText mb-[10px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhuma interação registrada.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-[10px]">
        {interactions.map((inter) => {
          const info = INTERACTION_TYPES[inter.type] ?? { label: inter.type };
          return (
            <Card key={inter.id} className="flex items-start gap-[12px]">
              <div className="flex-shrink-0 w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mt-[1px]" style={{ background: 'var(--voc-aurora)' }}>
                <MessageSquare size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-[8px]">
                  <span className="text-[12px] font-[700] text-newTableText uppercase tracking-[0.06em]">{info.label}</span>
                  <span className="text-[11px] text-newTableText opacity-60 flex-shrink-0">{formatDate(inter.createdAt)}</span>
                </div>
                <p className="text-[14px] text-newTextColor mt-[4px] leading-snug">{inter.summary}</p>
              </div>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Notes tab ────────────────────────────────────────────────────────────────

const NotesTab: FC<{ notes: string | null }> = ({ notes }) => {
  if (!notes) {
    return (
      <div className="flex flex-col items-center py-[48px] text-center">
        <Briefcase size={32} className="text-newTableText mb-[12px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhuma observação registrada.</p>
      </div>
    );
  }
  return (
    <Card className="px-[18px] py-[18px]">
      <p className="text-[14px] text-newTextColor leading-relaxed whitespace-pre-wrap">{notes}</p>
    </Card>
  );
};

// ─── Modal Contato ─────────────────────────────────────────────────────────────

const ContactModal: FC<{ clientId: string; onClose: () => void }> = ({ clientId, onClose }) => {
  const { createContact } = useCrmMutations();
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório.'); return; }
    setError(''); setLoading(true);
    try {
      const payload: any = { name: name.trim() };
      if (role.trim())  payload.role  = role.trim();
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      await createContact(clientId, payload);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrmModal title="Novo contato" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <Field label="Nome" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" />
        </Field>
        <Field label="Cargo / Função">
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: CEO, Designer…" />
        </Field>
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
          </Field>
          <Field label="Telefone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </Field>
        </div>
        {error && <p className="text-[13px]" style={{ color: 'var(--voc-rose)' }}>{error}</p>}
        <div className="flex gap-[10px] pt-[4px]">
          <Button type="button" variant="outline" radius="md" onClick={onClose} className="flex-1 py-[11px] text-[13px]">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" radius="md" disabled={loading} className="flex-1 py-[11px] text-[13px] font-[800]">
            {loading ? 'Salvando…' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </CrmModal>
  );
};

// ─── Modal Interação ───────────────────────────────────────────────────────────

const INTERACTION_OPTIONS = [
  { value: 'CALL',     label: 'Ligação' },
  { value: 'EMAIL',    label: 'E-mail' },
  { value: 'MEETING',  label: 'Reunião' },
  { value: 'NOTE',     label: 'Nota interna' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

const InteractionModal: FC<{ clientId: string; onClose: () => void }> = ({ clientId, onClose }) => {
  const { createInteraction } = useCrmMutations();
  const [type, setType]       = useState('CALL');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) { setError('Descrição é obrigatória.'); return; }
    setError(''); setLoading(true);
    try {
      await createInteraction(clientId, { type, summary: summary.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrmModal title="Nova interação" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <Field label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {INTERACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Descrição" required>
          <Textarea
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="O que aconteceu nessa interação?"
          />
        </Field>
        {error && <p className="text-[13px]" style={{ color: 'var(--voc-rose)' }}>{error}</p>}
        <div className="flex gap-[10px] pt-[4px]">
          <Button type="button" variant="outline" radius="md" onClick={onClose} className="flex-1 py-[11px] text-[13px]">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" radius="md" disabled={loading} className="flex-1 py-[11px] text-[13px] font-[800]">
            {loading ? 'Salvando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </CrmModal>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const ClientDetail: FC<{ id: string }> = ({ id }) => {
  const [activeTab, setActiveTab]       = useState<Tab>('Projetos');
  const [showEdit, setShowEdit]         = useState(false);
  const [showContact, setShowContact]   = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);

  const { data, isLoading, error } = useClient(id);
  const { updateClient } = useCrmMutations();

  if (isLoading) return <Skeleton />;

  if (error || !data) {
    const loadError = error as ClientLoadError | undefined;
    const hint =
      loadError?.status === 0 ? 'Backend não está respondendo. Verifique se o servidor está rodando.' :
      loadError?.status === 401 ? 'Sessão expirada — faça login novamente.' :
      loadError?.status === 403 ? 'Sem permissão para acessar este cliente.' :
      loadError?.status === 404 ? 'Cliente não encontrado no banco de dados.' :
      loadError?.status === 500 ? 'Erro interno no servidor (verifique os logs do backend).' :
      'Não foi possível carregar o cliente.';
    return (
      <div className="flex flex-col items-center justify-center py-[80px] bg-newBgColor flex-1">
        <p className="text-[16px] text-newTableText">{hint}</p>
        {loadError && (
          <p className="mt-[8px] text-[12px] font-mono text-newTableText opacity-60">
            [{loadError.status}] {loadError.message}
          </p>
        )}
        <Link href="/hub/crm" className="mt-[16px] text-[13px] font-[700]" style={{ color: 'var(--voc-violet)' }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      {/* Header */}
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[900px] mx-auto">
          <Link href="/hub/crm" className="inline-flex items-center gap-[5px] text-[12px] font-[600] text-newTableText hover:text-newTextColor transition-colors mb-[16px]">
            <ArrowLeft size={13} /> Clientes
          </Link>

          <div className="flex items-start gap-[16px]">
            <Avatar name={data.name} size={52} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-[10px]">
                <h1 className="text-[24px] font-[700] text-newTextColor leading-tight">{data.name}</h1>
                <ClientStatusBadge status={data.status} />
                <Button
                  variant="ghost"
                  radius="md"
                  onClick={() => setShowEdit(true)}
                  className="px-0 py-0 text-[12px] font-[600]"
                >
                  <Pencil size={13} /> Editar
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-[14px] mt-[8px]">
                {data.email && (
                  <a href={`mailto:${data.email}`} className="flex items-center gap-[5px] text-[12px] text-newTableText hover:text-newTextColor transition-colors">
                    <Mail size={12} /> {data.email}
                  </a>
                )}
                {data.website && (
                  <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[5px] text-[12px] transition-colors" style={{ color: 'var(--voc-violet)' }}>
                    <Globe size={12} /> {data.website}
                  </a>
                )}
                {data.segment && (
                  <span className="flex items-center gap-[5px] text-[12px] text-newTableText">
                    <Briefcase size={12} /> {data.segment}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-[14px] mt-[10px]">
                {[
                  { label: 'projetos',   count: data._count?.projects ?? 0 },
                  { label: 'contatos',   count: data._count?.contacts ?? 0 },
                  { label: 'interações', count: data._count?.interactions ?? 0 },
                ].map(({ label, count }) => (
                  <span key={label} className="flex items-center gap-[5px] text-[12px] text-newTableText">
                    <span className="font-[800] text-newTextColor">{count}</span> {label}
                  </span>
                ))}
                <span className="text-[11px] text-newTableText opacity-60">
                  Desde {formatDate(data.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-[2px] mt-[24px] border-b border-newTableBorder -mb-[1px]">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-[16px] py-[10px] text-[13px] font-[700] transition-colors relative"
                style={{
                  color: activeTab === tab ? 'var(--voc-violet)' : 'var(--new-table-text)',
                  borderBottom: activeTab === tab ? '2px solid var(--voc-violet)' : '2px solid transparent',
                }}
              >
                {tab}
                {tab === 'Projetos' && (data._count?.projects ?? 0) > 0 && (
                  <span className="ml-[6px] inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-[800] text-white" style={{ background: 'var(--voc-aurora)' }}>
                    {data._count?.projects}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[900px] w-full mx-auto px-[20px] py-[24px]">
        {activeTab === 'Projetos'    && <ProjectsTab     projects={data.projects ?? []} clientId={id} />}
        {activeTab === 'Contatos'    && <ContactsTab     contacts={data.contacts ?? []} onAdd={() => setShowContact(true)} />}
        {activeTab === 'Interações'  && <InteractionsTab interactions={data.interactions ?? []} onAdd={() => setShowInteraction(true)} />}
        {activeTab === 'Observações' && <NotesTab        notes={data.notes} />}
      </div>

      {showEdit && (
        <CrmModal title="Editar cliente" onClose={() => setShowEdit(false)} width={560}>
          <ClientForm
            initial={{ name: data.name, email: data.email ?? '', website: data.website ?? '', segment: data.segment ?? '', status: data.status, notes: data.notes ?? '' }}
            submitLabel="Salvar alterações"
            onCancel={() => setShowEdit(false)}
            onSubmit={async (formData) => {
              await updateClient(id, formData);
              setShowEdit(false);
            }}
          />
        </CrmModal>
      )}

      {showContact && (
        <ContactModal clientId={id} onClose={() => setShowContact(false)} />
      )}

      {showInteraction && (
        <InteractionModal clientId={id} onClose={() => setShowInteraction(false)} />
      )}
    </div>
  );
};
