'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronDown, Compass } from 'lucide-react';
import { useReligareProfiles } from './use-religare-profiles.hook';
import { ARCHETYPE_INFO } from '@gitroom/helpers/utils/religare';

const STORAGE_KEY = 'vocaccio:religare:dashboard-expert';

/**
 * "Sempre conectado à essência" — mostra o Religare natal do expert selecionado
 * no Dashboard mágico. Seleção persistida em localStorage. Tema claro (voc-paper)
 * para casar com o restante do dashboard.
 */
export const ReligareEssenceWidget: FC = () => {
  const { data: profiles = [] } = useReligareProfiles();

  // só perfis com leitura concluída e com expert vinculado
  const ready = useMemo(
    () => profiles.filter((p) => p.status === 'COMPLETE'),
    [profiles]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // hidrata a seleção do localStorage / default para o primeiro
  useEffect(() => {
    if (!ready.length) return;
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const exists = stored && ready.some((p) => p.id === stored);
    setSelectedId(exists ? stored : ready[0].id);
  }, [ready]);

  const select = (id: string) => {
    setSelectedId(id);
    setOpen(false);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  };

  const profile = ready.find((p) => p.id === selectedId);

  // estado vazio — nenhum expert com leitura concluída
  if (!ready.length) {
    return (
      <div
        className="rounded-[18px] p-[20px] flex items-center justify-between gap-[16px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(232,154,123,0.10), rgba(115,96,170,0.14))',
          border: '1px solid rgba(115,96,170,0.22)',
        }}
      >
        <div className="flex items-center gap-[12px]">
          <div
            className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--voc-aurora)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
              Conecte-se à sua essência
            </div>
            <p className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
              Crie um Religare para ver o pulso vocacional dos seus experts aqui.
            </p>
          </div>
        </div>
        <Link
          href="/hub/religare"
          className="text-[13px] font-[700] px-[16px] py-[9px] rounded-[12px] text-white whitespace-nowrap"
          style={{ background: 'var(--voc-aurora)' }}
        >
          Abrir Religare
        </Link>
      </div>
    );
  }

  const primary = profile?.archetypePrimary
    ? ARCHETYPE_INFO[profile.archetypePrimary]
    : null;
  const secondary = profile?.archetypeSecondary
    ? ARCHETYPE_INFO[profile.archetypeSecondary]
    : null;
  const kin = profile?.kinData;
  const expert = profile?.expert;

  return (
    <div
      className="rounded-[18px] p-[20px]"
      style={{
        background: 'var(--voc-paper-raised)',
        border: '1px solid rgba(115,96,170,0.18)',
        boxShadow: 'var(--voc-shadow-soft)',
      }}
    >
      {/* header + selector */}
      <div className="flex items-center justify-between gap-[12px] mb-[16px]">
        <div className="flex items-center gap-[8px]">
          <Sparkles size={15} style={{ color: 'var(--voc-rose)' }} />
          <span
            className="text-[11px] font-[800] uppercase tracking-wide"
            style={{ color: 'var(--voc-ink-soft)' }}
          >
            Essência do expert
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-[8px] px-[12px] py-[7px] rounded-[10px] text-[13px] font-[700]"
            style={{ background: 'var(--voc-paper)', color: 'var(--voc-ink)' }}
          >
            {expert?.name || profile?.name}
            <ChevronDown size={13} className={open ? 'rotate-180' : ''} style={{ transition: 'transform .15s' }} />
          </button>
          {open && (
            <div
              className="absolute right-0 top-[40px] z-50 min-w-[200px] rounded-[12px] py-[6px] flex flex-col"
              style={{
                background: 'var(--voc-paper-raised)',
                border: '1px solid rgba(115,96,170,0.18)',
                boxShadow: 'var(--voc-shadow-deep)',
              }}
            >
              {ready.map((p) => (
                <button
                  key={p.id}
                  onClick={() => select(p.id)}
                  className="px-[14px] py-[8px] text-[13px] text-left transition-colors"
                  style={{
                    color: p.id === selectedId ? 'var(--voc-rose)' : 'var(--voc-ink)',
                    fontWeight: p.id === selectedId ? 700 : 500,
                  }}
                >
                  {p.expert?.name || p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex items-center gap-[16px] flex-wrap">
        {kin && (
          <div className="flex items-center gap-[12px]">
            <div
              className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-[20px] font-[900] text-white flex-shrink-0"
              style={{ background: kin.accent }}
            >
              {kin.kin}
            </div>
            <div>
              <div className="text-[15px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
                {kin.tone} {kin.seal}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--voc-ink-soft)' }}>
                Kin natal · Tzolkin
              </div>
            </div>
          </div>
        )}

        {primary && (
          <div
            className="px-[14px] py-[10px] rounded-[14px] flex-1 min-w-[180px]"
            style={{ background: 'rgba(207,98,149,0.08)' }}
          >
            <div className="flex items-center gap-[6px] mb-[2px]">
              <Compass size={13} style={{ color: 'var(--voc-rose)' }} />
              <span className="text-[14px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
                {primary.name}
              </span>
              {secondary && (
                <span className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
                  + {secondary.name}
                </span>
              )}
            </div>
            <p className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
              {primary.tagline} · {primary.description}
            </p>
          </div>
        )}

        <Link
          href={`/hub/religare/perfil/${profile?.id}`}
          className="text-[13px] font-[700] px-[14px] py-[9px] rounded-[12px] whitespace-nowrap"
          style={{ background: 'var(--voc-aurora)', color: '#fff' }}
        >
          Ver essência completa
        </Link>
      </div>
    </div>
  );
};
