'use client';

import { FC, useCallback, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Users, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useClients, CrmClient, PAGE_SIZE } from './use-clients.hook';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Ativo', bg: 'rgba(50, 213, 131, 0.16)', color: '#32d583' },
  INACTIVE: { label: 'Inativo', bg: 'rgba(150, 150, 150, 0.16)', color: '#9c9c9c' },
  PROSPECT: { label: 'Prospecto', bg: 'rgba(232, 154, 123, 0.18)', color: '#e89a7b' },
  LEAD: { label: 'Lead', bg: 'rgba(115, 96, 170, 0.18)', color: '#b69dec' },
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

// ─── Avatar initials ───────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #e89a7b, #cf6295)',
  'linear-gradient(135deg, #cf6295, #7360aa)',
  'linear-gradient(135deg, #7360aa, #2897bf)',
  'linear-gradient(135deg, #2897bf, #e89a7b)',
];

const Avatar: FC<{ name: string; index: number }> = ({ name, index }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="flex-shrink-0 w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-[700]"
      style={{ background: GRADIENTS[index % GRADIENTS.length] }}
    >
      {initials}
    </div>
  );
};

// ─── Desktop table row ─────────────────────────────────────────────────────────

const TableRow: FC<{ client: CrmClient; index: number }> = ({ client, index }) => (
  <tr className="border-b border-newTableBorder hover:bg-newBgColor transition-colors duration-100 group">
    <td className="px-[20px] py-[14px]">
      <div className="flex items-center gap-[12px]">
        <Avatar name={client.name} index={index} />
        <div>
          <p className="text-[14px] font-[600] text-newTextColor leading-tight">{client.name}</p>
          {client.email && (
            <p className="text-[12px] text-newTableText mt-[1px]">{client.email}</p>
          )}
        </div>
      </div>
    </td>
    <td className="px-[20px] py-[14px]">
      <span className="text-[13px] text-newTableText">{client.segment ?? '—'}</span>
    </td>
    <td className="px-[20px] py-[14px]">
      <StatusBadge status={client.status} />
    </td>
    <td className="px-[20px] py-[14px]">
      <div className="flex items-center gap-[8px] text-[13px] text-newTableText">
        <span>{client._count?.projects ?? 0} projetos</span>
        <span className="opacity-30">·</span>
        <span>{client._count?.contacts ?? 0} contatos</span>
      </div>
    </td>
    <td className="px-[20px] py-[14px]">
      <Link
        href={`/hub/crm/${client.id}`}
        className="inline-flex items-center gap-[4px] text-[12px] font-[600] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ color: 'var(--voc-violet)' }}
      >
        Ver <ExternalLink size={12} />
      </Link>
    </td>
  </tr>
);

// ─── Mobile card ───────────────────────────────────────────────────────────────

const ClientCard: FC<{ client: CrmClient; index: number }> = ({ client, index }) => (
  <Link
    href={`/hub/crm/${client.id}`}
    className="block p-[16px] rounded-[14px] border border-newTableBorder bg-newBgColorInner hover:border-[rgba(115,96,170,0.32)] transition-all duration-200 active:scale-[0.98]"
    style={{ boxShadow: undefined }}
  >
    <div className="flex items-start gap-[12px]">
      <Avatar name={client.name} index={index} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-[8px]">
          <p className="text-[14px] font-[700] text-newTextColor truncate leading-tight mt-[1px]">
            {client.name}
          </p>
          <StatusBadge status={client.status} />
        </div>
        {client.segment && (
          <p className="text-[12px] text-newTableText mt-[3px]">{client.segment}</p>
        )}
        <div className="flex items-center gap-[8px] mt-[8px] text-[11px] text-newTableText">
          <span>{client._count?.projects ?? 0} projetos</span>
          <span className="opacity-30">·</span>
          <span>{client._count?.contacts ?? 0} contatos</span>
        </div>
      </div>
    </div>
  </Link>
);

// ─── Filter pills ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'PROSPECT', label: 'Prospectos' },
  { value: 'LEAD', label: 'Leads' },
  { value: 'INACTIVE', label: 'Inativos' },
];

// ─── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: FC<{ hasFilter: boolean }> = ({ hasFilter }) => (
  <div className="flex flex-col items-center justify-center py-[64px] text-center px-[20px]">
    <div
      className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mb-[16px]"
      style={{ background: 'var(--voc-aurora)' }}
    >
      <Users size={24} className="text-white" />
    </div>
    <h3 className="text-[18px] font-[600] text-newTextColor mb-[6px]">
      {hasFilter ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
    </h3>
    <p className="text-[14px] text-newTableText max-w-[280px]">
      {hasFilter
        ? 'Tente ajustar os filtros de busca.'
        : 'Adicione seu primeiro cliente para começar.'}
    </p>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonRow: FC = () => (
  <tr className="border-b border-newTableBorder">
    {[40, 24, 16, 32, 8].map((w, i) => (
      <td key={i} className="px-[20px] py-[16px]">
        <div
          className="h-[13px] rounded-full animate-pulse bg-newBgColor"
          style={{ width: `${w}%` }}
        />
      </td>
    ))}
  </tr>
);

const SkeletonCard: FC = () => (
  <div className="p-[16px] rounded-[14px] border border-newTableBorder bg-newBgColorInner">
    <div className="flex gap-[12px]">
      <div className="w-[36px] h-[36px] rounded-[10px] animate-pulse bg-newBgColor flex-shrink-0" />
      <div className="flex-1 space-y-[8px]">
        <div className="h-[13px] w-[60%] rounded-full animate-pulse bg-newBgColor" />
        <div className="h-[11px] w-[40%] rounded-full animate-pulse bg-newBgColor" />
      </div>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

export const ClientsList: FC = () => {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useClients({ search: activeSearch, status, page });

  const handleSearch = useCallback(() => {
    setPage(1);
    setActiveSearch(search);
  }, [search]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setActiveSearch('');
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((s: string) => {
    setStatus(s);
    setPage(1);
  }, []);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const hasFilter = !!activeSearch || !!status;

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      {/* Page header */}
      <div className="bg-newBgColorInner border-b border-newTableBorder px-[20px] py-[20px]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start justify-between gap-[16px] flex-wrap">
            <div>
              <p
                className="text-[10px] font-[900] tracking-[0.12em] uppercase mb-[4px]"
                style={{ color: 'var(--voc-rose)' }}
              >
                Hub · CRM
              </p>
              <h1 className="text-[26px] font-[600] text-newTextColor leading-tight">
                Clientes
              </h1>
              {data && (
                <p className="text-[13px] text-newTableText mt-[2px]">
                  {data.total} {data.total === 1 ? 'cliente' : 'clientes'} no total
                </p>
              )}
            </div>
            <Link
              href="/hub/crm/novo"
              className="inline-flex items-center gap-[8px] px-[18px] py-[10px] rounded-full text-[13px] font-[800] text-white flex-shrink-0"
              style={{
                background: 'var(--voc-aurora)',
                boxShadow: '0 8px 24px rgba(115, 96, 170, 0.28)',
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="mobile:hidden">Novo cliente</span>
              <span className="hidden mobile:inline">Novo</span>
            </Link>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-[10px] mt-[16px]">
            <div className="flex items-center gap-[8px] px-[14px] py-[9px] rounded-[12px] max-w-[480px] bg-newBgColor border border-newTableBorder">
              <Search size={15} className="text-newTableText flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nome, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-newTextColor placeholder:text-newTableText"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="text-newTableText hover:text-newTextColor text-[16px] leading-none transition-colors"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex gap-[6px] flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => handleStatusChange(f.value)}
                  className="px-[12px] py-[5px] rounded-full text-[12px] font-[700] transition-all duration-150"
                  style={
                    status === f.value
                      ? {
                          background: 'var(--voc-aurora)',
                          color: 'white',
                          boxShadow: '0 2px 10px rgba(115,96,170,0.3)',
                        }
                      : {
                          background: 'var(--new-bgColor)',
                          border: '1px solid var(--new-table-border)',
                          color: 'var(--new-table-text)',
                        }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-[20px] py-[20px]">
        {/* Desktop table */}
        <div className="hidden md:block bg-newBgColorInner rounded-[14px] border border-newTableBorder overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-[800] uppercase tracking-[0.06em] text-newTableText border-b border-newTableBorder bg-newTableHeader">
                <th className="px-[20px] py-[12px] text-left">Cliente</th>
                <th className="px-[20px] py-[12px] text-left">Segmento</th>
                <th className="px-[20px] py-[12px] text-left">Status</th>
                <th className="px-[20px] py-[12px] text-left">Atividade</th>
                <th className="px-[20px] py-[12px] text-left" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : data?.items?.map((c, i) => (
                    <TableRow key={c.id} client={c} index={i} />
                  ))}
            </tbody>
          </table>
          {!isLoading && data?.items.length === 0 && (
            <EmptyState hasFilter={hasFilter} />
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-[10px]">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : data?.items.length === 0
            ? <EmptyState hasFilter={hasFilter} />
            : data?.items.map((c, i) => (
                <ClientCard key={c.id} client={c} index={i} />
              ))}
        </div>

        {/* Pagination */}
        {!isLoading && data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-[20px]">
            <p className="text-[13px] text-newTableText">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-[8px]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-[4px] px-[14px] py-[8px] rounded-[10px] text-[13px] font-[600] text-newTextColor border border-newTableBorder bg-newBgColorInner disabled:opacity-40 transition-colors hover:border-newSep"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-[4px] px-[14px] py-[8px] rounded-[10px] text-[13px] font-[800] text-white disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--voc-aurora)' }}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
