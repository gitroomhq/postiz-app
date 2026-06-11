'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { Plus, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjects, ProjectListItem } from './use-projects.hook';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: 'Ativo',     color: '#32d583' },
  PAUSED:   { label: 'Pausado',   color: '#e89a7b' },
  ARCHIVED: { label: 'Arquivado', color: '#9c9c9c' },
};

const TONE_LABELS: Record<string, string> = {
  FORMAL: 'Formal', CASUAL: 'Casual', INSPIRATIONAL: 'Inspiracional',
  TECHNICAL: 'Técnico', PLAYFUL: 'Descontraído', AUTHORITATIVE: 'Autoritativo',
};

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'PAUSED', label: 'Pausados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];

const PAGE_SIZE = 30;

const GRADIENTS = [
  'linear-gradient(135deg, #e89a7b, #cf6295)',
  'linear-gradient(135deg, #cf6295, #7360aa)',
  'linear-gradient(135deg, #7360aa, #2897bf)',
  'linear-gradient(135deg, #2897bf, #e89a7b)',
];

const ProjectAvatar: FC<{ name: string; index: number }> = ({ name, index }) => (
  <div
    className="flex-shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-[800]"
    style={{ background: GRADIENTS[index % GRADIENTS.length] }}
  >
    {name.slice(0, 2).toUpperCase()}
  </div>
);

const SkeletonRow: FC = () => (
  <tr className="border-b border-newTableBorder">
    {[36, 20, 16, 22, 10].map((w, i) => (
      <td key={i} className="px-[20px] py-[16px]">
        <div className="h-[13px] rounded-full animate-pulse bg-newBgColor" style={{ width: `${w}%` }} />
      </td>
    ))}
  </tr>
);

const TableRow: FC<{ p: ProjectListItem; index: number }> = ({ p, index }) => {
  const s = STATUS_MAP[p.status] ?? { label: p.status, color: '#9c9c9c' };
  return (
    <tr className="border-b border-newTableBorder hover:bg-newBgColor transition-colors group">
      <td className="px-[20px] py-[14px]">
        <div className="flex items-center gap-[12px]">
          <ProjectAvatar name={p.name} index={index} />
          <div>
            <p className="text-[14px] font-[600] text-newTextColor leading-tight">{p.name}</p>
            {p.slogan && <p className="text-[12px] text-newTableText mt-[1px] italic">{p.slogan}</p>}
          </div>
        </div>
      </td>
      <td className="px-[20px] py-[14px]">
        <Link href={`/hub/crm/${p.client.id}`} className="text-[13px] text-newTableText hover:text-newTextColor transition-colors">
          {p.client.name}
        </Link>
      </td>
      <td className="px-[20px] py-[14px]">
        <span className="text-[12px] text-newTableText">{p.businessArea ?? '—'}</span>
      </td>
      <td className="px-[20px] py-[14px]">
        <span className="text-[12px] text-newTableText">{TONE_LABELS[p.toneOfVoice ?? ''] ?? '—'}</span>
      </td>
      <td className="px-[20px] py-[14px]">
        <span className="text-[11px] font-[700] px-[10px] py-[3px] rounded-full" style={{ color: s.color, background: `${s.color}22` }}>
          {s.label}
        </span>
      </td>
      <td className="px-[20px] py-[14px]">
        <Link
          href={`/hub/crm/projetos/${p.id}`}
          className="inline-flex items-center gap-[4px] text-[12px] font-[600] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--voc-violet)' }}
        >
          Abrir →
        </Link>
      </td>
    </tr>
  );
};

export const ProjectsList: FC = () => {
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const { data, isLoading } = useProjects({ status, page });
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-start justify-between gap-[16px] flex-wrap">
            <div>
              <p className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[4px]" style={{ color: 'var(--voc-rose)' }}>Hub · CRM</p>
              <h1 className="text-[26px] font-[600] text-newTextColor leading-tight">Projetos</h1>
              {data && <p className="text-[13px] text-newTableText mt-[2px]">{data.total} {data.total === 1 ? 'projeto' : 'projetos'} no total</p>}
            </div>
            <Link
              href="/hub/crm/projetos/novo"
              className="inline-flex items-center gap-[8px] px-[18px] py-[10px] rounded-full text-[13px] font-[800] text-white flex-shrink-0"
              style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 24px rgba(115,96,170,0.28)' }}
            >
              <Plus size={16} strokeWidth={2.5} /> Novo projeto
            </Link>
          </div>
          <div className="flex gap-[6px] flex-wrap mt-[16px]">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatus(f.value); setPage(1); }}
                className="px-[12px] py-[5px] rounded-full text-[12px] font-[700] transition-all"
                style={status === f.value
                  ? { background: 'var(--voc-aurora)', color: 'white', boxShadow: '0 2px 10px rgba(115,96,170,0.3)' }
                  : { background: 'var(--new-bgColor)', border: '1px solid var(--new-table-border)', color: 'var(--new-table-text)' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[1100px] w-full mx-auto px-[20px] py-[20px]">
        <div className="bg-newBgColorInner rounded-[14px] border border-newTableBorder overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-[800] uppercase tracking-[0.06em] text-newTableText border-b border-newTableBorder bg-newTableHeader">
                <th className="px-[20px] py-[12px] text-left">Projeto</th>
                <th className="px-[20px] py-[12px] text-left">Cliente</th>
                <th className="px-[20px] py-[12px] text-left">Área</th>
                <th className="px-[20px] py-[12px] text-left">Tom de voz</th>
                <th className="px-[20px] py-[12px] text-left">Status</th>
                <th className="px-[20px] py-[12px] text-left" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : data?.items?.map((p, i) => <TableRow key={p.id} p={p} index={i} />)}
            </tbody>
          </table>
          {!isLoading && !data?.items?.length && (
            <div className="flex flex-col items-center py-[64px] text-center">
              <div className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mb-[16px]" style={{ background: 'var(--voc-aurora)' }}>
                <Layers size={24} className="text-white" />
              </div>
              <h3 className="text-[18px] font-[600] text-newTextColor mb-[6px]">Nenhum projeto ainda</h3>
              <p className="text-[14px] text-newTableText">Crie o primeiro projeto para um cliente.</p>
            </div>
          )}
        </div>

        {!isLoading && data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-[20px]">
            <p className="text-[13px] text-newTableText">Página {page} de {totalPages}</p>
            <div className="flex gap-[8px]">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-[4px] px-[14px] py-[8px] rounded-[10px] text-[13px] font-[600] text-newTextColor border border-newTableBorder bg-newBgColorInner disabled:opacity-40">
                <ChevronLeft size={14} /> Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-[4px] px-[14px] py-[8px] rounded-[10px] text-[13px] font-[800] text-white disabled:opacity-40" style={{ background: 'var(--voc-aurora)' }}>
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
