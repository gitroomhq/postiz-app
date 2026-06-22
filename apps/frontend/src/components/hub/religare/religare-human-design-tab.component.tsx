'use client';

import { FC } from 'react';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
import {
  CENTER_LABELS_PT,
  CENTERS,
  type HumanDesignResult,
} from '@gitroom/helpers/utils/religare';

const TYPE_LABEL_PT: Record<HumanDesignResult['type'], string> = {
  generator: 'Gerador',
  manifestingGenerator: 'Gerador Manifestante',
  manifestor: 'Manifestador',
  projector: 'Projetor',
  reflector: 'Refletor',
};

const AUTHORITY_LABEL_PT: Record<HumanDesignResult['authority'], string> = {
  emotional: 'Emocional',
  sacral: 'Sacral',
  splenic: 'Esplênica',
  ego: 'Ego/Coração',
  selfProjected: 'Autoprojetada (G)',
  lunar: 'Lunar',
  mental: 'Mental/Ambiental',
};

const DEFINITION_LABEL_PT: Record<HumanDesignResult['definition'], string> = {
  none: 'Sem Definição',
  single: 'Definição Única',
  split: 'Definição Dividida',
  tripleSplit: 'Definição Tripla',
  quadrupleSplit: 'Definição Quádrupla',
};

const HD_BODY_LABELS_PT = [
  'Sol',
  'Terra',
  'Lua',
  'Nodo Norte',
  'Nodo Sul',
  'Mercúrio',
  'Vênus',
  'Marte',
  'Júpiter',
  'Saturno',
  'Urano',
  'Netuno',
  'Plutão',
];

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-[16px] bg-newBgColorInner border border-newTableBorder p-[18px] mb-[14px]">
    <div
      className="text-[12px] font-[800] uppercase tracking-wide mb-[12px]"
      style={{ color: 'var(--new-table-text)' }}
    >
      {title}
    </div>
    {children}
  </div>
);

const RecomputeEmpty: FC<{ onRecompute?: () => void; recomputing?: boolean }> = ({
  onRecompute,
  recomputing,
}) => (
  <div className="rounded-[16px] border border-dashed border-newTableBorder p-[40px] text-center">
    <Sparkles size={20} className="mx-auto mb-[10px]" style={{ color: 'var(--voc-violet)' }} />
    <p className="text-[15px] font-[700] text-newTextColor mb-[4px]">
      Desenho de Human Design ainda não calculado
    </p>
    <p className="text-[13px] mb-[16px]" style={{ color: 'var(--new-table-text)' }}>
      Calcule o bodygraph a partir da data, hora e local de nascimento.
    </p>
    {onRecompute && (
      <button
        onClick={onRecompute}
        disabled={recomputing}
        className="inline-flex items-center gap-[7px] px-[16px] py-[9px] rounded-[10px] text-[13px] font-[700] text-white disabled:opacity-60"
        style={{ background: 'var(--voc-violet)' }}
      >
        {recomputing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {recomputing ? 'Calculando…' : 'Calcular agora'}
      </button>
    )}
  </div>
);

const Card: FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div
    className="rounded-[12px] p-[14px] border text-center"
    style={{
      borderColor: accent ? 'var(--voc-rose)' : 'var(--new-table-border)',
      background: accent ? 'rgba(207,98,149,0.08)' : 'var(--new-bgColorInner)',
    }}
  >
    <div className="text-[11px] font-[700] mb-[4px]" style={{ color: 'var(--new-table-text)' }}>
      {label}
    </div>
    <div className="text-[15px] font-[800] text-newTextColor">{value}</div>
  </div>
);

export const HumanDesignTab: FC<{
  humanDesign: HumanDesignResult | null;
  onRecompute?: () => void;
  recomputing?: boolean;
}> = ({ humanDesign, onRecompute, recomputing }) => {
  if (!humanDesign) {
    return <RecomputeEmpty onRecompute={onRecompute} recomputing={recomputing} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px] mb-[14px]">
        <Card label="Tipo" value={TYPE_LABEL_PT[humanDesign.type]} accent />
        <Card label="Estratégia" value={humanDesign.strategy} />
        <Card label="Autoridade" value={AUTHORITY_LABEL_PT[humanDesign.authority]} />
        <Card label="Perfil" value={humanDesign.profile} />
      </div>

      <Section title="Definição">
        <p className="text-[14px] text-newTextColor">
          {DEFINITION_LABEL_PT[humanDesign.definition]}
        </p>
      </Section>

      <Section title="Centros">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px]">
          {CENTERS.map((c) => {
            const defined = humanDesign.centers[c];
            return (
              <div key={c} className="flex items-center gap-[8px]">
                <span
                  className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                  style={{ background: defined ? 'var(--voc-aurora)' : 'transparent', border: defined ? 'none' : '1.5px solid var(--new-table-border)' }}
                />
                <span className="text-[13px]" style={{ color: defined ? 'rgb(var(--new-textColor))' : 'var(--new-table-text)' }}>
                  {CENTER_LABELS_PT[c]}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Portões ativos">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-newTextColor">
            <thead>
              <tr style={{ color: 'var(--new-table-text)' }} className="text-[11px] uppercase">
                <th className="text-left font-[700] py-[6px] pr-[8px]">Corpo</th>
                <th className="text-left font-[700] py-[6px] pr-[8px]">Personalidade</th>
                <th className="text-left font-[700] py-[6px]">Design</th>
              </tr>
            </thead>
            <tbody>
              {HD_BODY_LABELS_PT.map((label, i) => (
                <tr key={label} className="border-t border-newTableBorder">
                  <td className="py-[6px] pr-[8px] font-[600]">{label}</td>
                  <td className="py-[6px] pr-[8px]">
                    {humanDesign.gates.personality[i]
                      ? `${humanDesign.gates.personality[i].gate}.${humanDesign.gates.personality[i].line}`
                      : '—'}
                  </td>
                  <td className="py-[6px]">
                    {humanDesign.gates.design[i]
                      ? `${humanDesign.gates.design[i].gate}.${humanDesign.gates.design[i].line}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {humanDesign.definedChannels.length > 0 && (
        <Section title="Canais completos">
          <div className="flex flex-wrap gap-[6px]">
            {humanDesign.definedChannels.map((c) => (
              <span
                key={`${c.gates[0]}-${c.gates[1]}`}
                className="text-[11px] px-[8px] py-[4px] rounded-full bg-newBgColor border border-newTableBorder"
                style={{ color: 'var(--new-table-text)' }}
              >
                {c.gates[0]}-{c.gates[1]}: {c.name}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};
