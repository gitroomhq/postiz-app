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
        className="flex items-center gap-[8px] px-[14px] h-[36px] rounded-[10px] text-[13px] font-[600] border border-newBorder transition-colors text-newTextColor"
        style={{
          background: selectedClientId ? 'var(--voc-rose)' : 'var(--new-bgColor)',
          color: selectedClientId ? '#fff' : undefined,
        }}
      >
        <Users size={14} />
        <span>{label}</span>
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div className="absolute top-[42px] left-0 z-50 min-w-[200px] rounded-[12px] py-[6px] flex flex-col bg-newBgColorInner border border-newBorder shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="px-[14px] py-[8px] text-[13px] text-left hover:bg-boxHover transition-colors text-newTextColor"
            style={{ color: !selectedClientId ? 'var(--voc-rose)' : undefined }}
          >
            Todos os clientes
          </button>
          {clients?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c.id)}
              className="px-[14px] py-[8px] text-[13px] text-left hover:bg-boxHover transition-colors text-newTextColor"
              style={{ color: selectedClientId === c.id ? 'var(--voc-rose)' : undefined }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
