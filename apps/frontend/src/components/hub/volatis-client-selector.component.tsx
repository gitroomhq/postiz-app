'use client';

import { useVolatisClient } from '@gitroom/frontend/components/hub/volatis-client-context';
import { useClientsAll } from '@gitroom/frontend/components/hub/crm/use-clients-all.hook';
import { ChevronDown, Users } from 'lucide-react';
import { useRef, useState } from 'react';

export const VolatisClientSelector = () => {
  const { selectedClientId, setSelectedClientId } = useVolatisClient();
  const { data: clients } = useClientsAll();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients?.find((c) => c.id === selectedClientId);
  const label = selected ? selected.name : 'Todos os clientes';

  const handleSelect = (id: string | null) => {
    setSelectedClientId(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[8px] px-[14px] h-[36px] rounded-[10px] text-[13px] font-[600] transition-colors"
        style={{
          background: selectedClientId
            ? 'var(--voc-violet)'
            : 'var(--voc-paper-raised)',
          color: selectedClientId ? '#fff' : 'var(--voc-ink)',
          border: '1px solid var(--voc-line)',
        }}
      >
        <Users size={14} />
        <span>{label}</span>
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          className="absolute top-[42px] left-0 z-50 min-w-[200px] rounded-[12px] py-[6px] flex flex-col"
          style={{
            background: 'var(--voc-paper-raised)',
            border: '1px solid var(--voc-line)',
            boxShadow: 'var(--voc-shadow-soft)',
          }}
        >
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="px-[14px] py-[8px] text-[13px] text-left hover:bg-[rgba(115,96,170,0.08)] transition-colors"
            style={{ color: !selectedClientId ? 'var(--voc-violet)' : 'var(--voc-ink)' }}
          >
            Todos os clientes
          </button>
          {clients?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c.id)}
              className="px-[14px] py-[8px] text-[13px] text-left hover:bg-[rgba(115,96,170,0.08)] transition-colors"
              style={{ color: selectedClientId === c.id ? 'var(--voc-violet)' : 'var(--voc-ink)' }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
