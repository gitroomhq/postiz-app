'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Globe, Briefcase, MessageSquare, Users, ChevronRight } from 'lucide-react';
import { useClient, CrmProject, CrmContact, CrmInteraction } from './use-client.hook';

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

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Ativo',      bg: 'rgba(50,213,131,0.16)',   color: '#32d583' },
  INACTIVE: { label: 'Inativo',    bg: 'rgba(150,150,150,0.16)', color: '#9c9c9c' },
  PROSPECT: { label: 'Prospecto',  bg: 'rgba(232,154,123,0.18)', color: '#e89a7b' },
  LEAD:     { label: 'Lead',       bg: 'rgba(115,96,170,0.18)',  color: '#b69dec' },
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const s = STATUS_MAP[status] ?? { label: status, bg: 'rgba(200,200,200,0.16)', color: '#9c9c9c' };
  return (
    <span
      className="inline-flex items-center px-[10px] py-[3px] rounded-full text-[11px] font-[700]"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};

const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'Ativo',     color: '#32d583' },
  PAUSED:    { label: 'Pausado',   color: '#e89a7b' },
  FINISHED:  { label: 'Concluído', color: '#9c9c9c' },
  CANCELLED: { label: 'Cancelado', color: '#cf6295' },
};

const INTERACTION_TYPE_MAP: Record<string, { label: string; icon: FC<{ size?: number; className?: string }> }> = {
  CALL:     { label: 'Ligação',       icon: MessageSquare },
  EMAIL:    { label: 'E-mail',        icon: Mail },
  MEETING:  { label: 'Reunião',       icon: Users },
  NOTE:     { label: 'Nota',          icon: Briefcase },
  WHATSAPP: { label: 'WhatsApp',      icon: MessageSquare },
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
    <div className="max-w-[900px] mx-auto w-full px-[20px] py-[28px] space-y-[12px]">
      {[80, 60, 70, 50].map((w, i) => (
        <div key={i} className="h-[13px] rounded-full bg-newBgColorInner" style={{ width: `${w}%` }} />
      ))}
    </div>
  </div>
);

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Projetos', 'Contatos', 'Interações', 'Observações'] as const;
type Tab = typeof TABS[number];

// ─── Projects tab ─────────────────────────────────────────────────────────────

const ProjectsTab: FC<{ projects: CrmProject[] }> = ({ projects }) => {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center py-[48px] text-center">
        <Briefcase size={32} className="text-newTableText mb-[12px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhum projeto ainda.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[10px]">
      {projects.map((p) => {
        const ps = PROJECT_STATUS_MAP[p.status] ?? { label: p.status, color: '#9c9c9c' };
        return (
          <div
            key={p.id}
            className="flex items-start justify-between gap-[16px] px-[18px] py-[16px] rounded-[14px] border border-newTableBorder bg-newBgColorInner hover:border-[rgba(115,96,170,0.28)] transition-all duration-150"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-[700] text-newTextColor leading-tight">{p.name}</p>
              <div className="flex flex-wrap items-center gap-[10px] mt-[6px]">
                {p.businessArea && (
                  <span className="text-[12px] text-newTableText">{p.businessArea}</span>
                )}
                {p.toneOfVoice && (
                  <>
                    <span className="text-newTableText opacity-30">·</span>
                    <span className="text-[12px] text-newTableText">{p.toneOfVoice}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-newTableText mt-[4px] opacity-60">{formatDate(p.createdAt)}</p>
            </div>
            <span className="text-[11px] font-[700] px-[10px] py-[3px] rounded-full flex-shrink-0" style={{ color: ps.color, background: `${ps.color}22` }}>
              {ps.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Contacts tab ─────────────────────────────────────────────────────────────

const ContactsTab: FC<{ contacts: CrmContact[] }> = ({ contacts }) => {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center py-[48px] text-center">
        <Users size={32} className="text-newTableText mb-[12px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhum contato cadastrado.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[10px]">
      {contacts.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-[14px] px-[18px] py-[16px] rounded-[14px] border border-newTableBorder bg-newBgColorInner"
        >
          <Avatar name={c.name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-[700] text-newTextColor leading-tight">{c.name}</p>
            {c.role && <p className="text-[12px] text-newTableText mt-[2px]">{c.role}</p>}
            <div className="flex flex-wrap gap-[14px] mt-[8px]">
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center gap-[5px] text-[12px] transition-colors"
                  style={{ color: 'var(--voc-violet)' }}
                >
                  <Mail size={12} /> {c.email}
                </a>
              )}
              {c.phone && (
                <span className="flex items-center gap-[5px] text-[12px] text-newTableText">
                  {c.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Interactions tab ─────────────────────────────────────────────────────────

const InteractionsTab: FC<{ interactions: CrmInteraction[] }> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-[48px] text-center">
        <MessageSquare size={32} className="text-newTableText mb-[12px] opacity-40" />
        <p className="text-[14px] text-newTableText">Nenhuma interação registrada.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[10px]">
      {interactions.map((inter) => {
        const info = INTERACTION_TYPE_MAP[inter.type] ?? { label: inter.type, icon: MessageSquare };
        const Icon = info.icon;
        return (
          <div key={inter.id} className="flex items-start gap-[12px] px-[18px] py-[16px] rounded-[14px] border border-newTableBorder bg-newBgColorInner">
            <div
              className="flex-shrink-0 w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mt-[1px]"
              style={{ background: 'var(--voc-aurora)' }}
            >
              <Icon size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-[8px]">
                <span className="text-[12px] font-[700] text-newTableText uppercase tracking-[0.06em]">{info.label}</span>
                <span className="text-[11px] text-newTableText opacity-60 flex-shrink-0">{formatDate(inter.createdAt)}</span>
              </div>
              <p className="text-[14px] text-newTextColor mt-[4px] leading-snug">{inter.summary}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
    <div className="px-[18px] py-[18px] rounded-[14px] border border-newTableBorder bg-newBgColorInner">
      <p className="text-[14px] text-newTextColor leading-relaxed whitespace-pre-wrap">{notes}</p>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const ClientDetail: FC<{ id: string }> = ({ id }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Projetos');
  const { data, isLoading } = useClient(id);

  if (isLoading) return <Skeleton />;

  if (!data || !data.id) {
    return (
      <div className="flex flex-col items-center justify-center py-[80px] bg-newBgColor flex-1">
        <p className="text-[16px] text-newTableText">Cliente não encontrado.</p>
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
          <Link
            href="/hub/crm"
            className="inline-flex items-center gap-[5px] text-[12px] font-[600] text-newTableText hover:text-newTextColor transition-colors mb-[16px]"
          >
            <ArrowLeft size={13} /> Clientes
          </Link>

          <div className="flex items-start gap-[16px]">
            <Avatar name={data.name} size={52} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-[10px]">
                <h1 className="text-[24px] font-[700] text-newTextColor leading-tight">{data.name}</h1>
                <StatusBadge status={data.status} />
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-[14px] mt-[8px]">
                {(data as any).email && (
                  <a
                    href={`mailto:${(data as any).email}`}
                    className="flex items-center gap-[5px] text-[12px] text-newTableText hover:text-newTextColor transition-colors"
                  >
                    <Mail size={12} /> {(data as any).email}
                  </a>
                )}
                {(data as any).website && (
                  <a
                    href={(data as any).website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[5px] text-[12px] transition-colors"
                    style={{ color: 'var(--voc-violet)' }}
                  >
                    <Globe size={12} /> {(data as any).website}
                  </a>
                )}
                {(data as any).segment && (
                  <span className="flex items-center gap-[5px] text-[12px] text-newTableText">
                    <Briefcase size={12} /> {(data as any).segment}
                  </span>
                )}
              </div>

              {/* Counts */}
              <div className="flex flex-wrap items-center gap-[14px] mt-[10px]">
                {[
                  { label: 'projetos',    count: data._count?.projects ?? 0 },
                  { label: 'contatos',    count: data._count?.contacts ?? 0 },
                  { label: 'interações',  count: data._count?.interactions ?? 0 },
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

          {/* Tabs */}
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
                  <span
                    className="ml-[6px] inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-[800] text-white"
                    style={{ background: 'var(--voc-aurora)' }}
                  >
                    {data._count?.projects}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 max-w-[900px] w-full mx-auto px-[20px] py-[24px]">
        {activeTab === 'Projetos'    && <ProjectsTab     projects={data.projects ?? []} />}
        {activeTab === 'Contatos'    && <ContactsTab     contacts={data.contacts ?? []} />}
        {activeTab === 'Interações'  && <InteractionsTab interactions={data.interactions ?? []} />}
        {activeTab === 'Observações' && <NotesTab        notes={data.notes} />}
      </div>
    </div>
  );
};
