'use client';

import { FC, useEffect, useId, useRef } from 'react';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
import {
  toAstroChartData,
  THEME_PHRASE,
  type AstrologyResult,
  type ReligareDNA,
} from '@gitroom/helpers/utils/religare';

const ASPECT_PT: Record<string, string> = {
  conjunction: 'Conjunção',
  opposition: 'Oposição',
  trine: 'Trígono',
  square: 'Quadratura',
  sextile: 'Sextil',
  quincunx: 'Quincúncio',
  quintile: 'Quintil',
  septile: 'Septil',
  'semi-sextile': 'Semi-sextil',
  'semi-square': 'Semi-quadratura',
};

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
      Mapa astral ainda não calculado
    </p>
    <p className="text-[13px] mb-[16px]" style={{ color: 'var(--new-table-text)' }}>
      Calcule o mapa natal a partir da data, hora e local de nascimento.
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

/** The radix wheel — @astrodraw/astrochart needs the DOM, so import it lazily. */
const Wheel: FC<{ astrology: AstrologyResult }> = ({ astrology }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const elId = `astrochart-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    const el = ref.current;
    if (el) el.innerHTML = '';
    import('@astrodraw/astrochart')
      .then(({ Chart }) => {
        if (cancelled || !ref.current) return;
        try {
          const size = 440;
          const chart = new Chart(elId, size, size);
          chart.radix(toAstroChartData(astrology)).aspects();
        } catch {
          /* render errors are non-fatal — the table/cards still show */
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (el) el.innerHTML = '';
    };
  }, [astrology, elId]);

  // Light "paper" card so the chart's default dark strokes are visible.
  return (
    <div
      className="rounded-[16px] p-[10px] mb-[14px] overflow-hidden"
      style={{ background: 'var(--voc-paper, #f5f1ea)' }}
    >
      <div id={elId} ref={ref} className="mx-auto" style={{ maxWidth: 440 }} />
    </div>
  );
};

const BigThreeCards: FC<{ astrology: AstrologyResult }> = ({ astrology }) => {
  const items: [string, { signPt: string; degreeInSign: number }][] = [
    ['Sol', astrology.bigThree.sun],
    ['Lua', astrology.bigThree.moon],
    ['Ascendente', astrology.bigThree.rising],
  ];
  return (
    <div className="grid grid-cols-3 gap-[12px] mb-[14px]">
      {items.map(([label, p], i) => (
        <div
          key={label}
          className="rounded-[12px] p-[14px] border text-center"
          style={{
            borderColor: i === 0 ? 'var(--voc-rose)' : 'var(--new-table-border)',
            background: i === 0 ? 'rgba(207,98,149,0.08)' : 'var(--new-bgColorInner)',
          }}
        >
          <div className="text-[11px] font-[700] mb-[4px]" style={{ color: 'var(--new-table-text)' }}>
            {label}
          </div>
          <div className="text-[16px] font-[800] text-newTextColor">{p.signPt}</div>
          <div className="text-[12px]" style={{ color: 'var(--voc-violet)' }}>
            {p.degreeInSign.toFixed(0)}°
          </div>
        </div>
      ))}
    </div>
  );
};

export const AstrologyTab: FC<{
  astrology: AstrologyResult | null;
  onRecompute?: () => void;
  recomputing?: boolean;
}> = ({ astrology, onRecompute, recomputing }) => {
  if (!astrology) {
    return <RecomputeEmpty onRecompute={onRecompute} recomputing={recomputing} />;
  }

  return (
    <>
      <BigThreeCards astrology={astrology} />
      <Wheel astrology={astrology} />

      <Section title="Posições planetárias">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-newTextColor">
            <thead>
              <tr style={{ color: 'var(--new-table-text)' }} className="text-[11px] uppercase">
                <th className="text-left font-[700] py-[6px] pr-[8px]">Astro</th>
                <th className="text-left font-[700] py-[6px] pr-[8px]">Signo</th>
                <th className="text-left font-[700] py-[6px] pr-[8px]">Grau</th>
                <th className="text-left font-[700] py-[6px] pr-[8px]">Casa</th>
                <th className="text-left font-[700] py-[6px]">Mov.</th>
              </tr>
            </thead>
            <tbody>
              {astrology.planets.map((p) => (
                <tr key={p.key} className="border-t border-newTableBorder">
                  <td className="py-[6px] pr-[8px] font-[600]">{p.name}</td>
                  <td className="py-[6px] pr-[8px]">{p.signPt}</td>
                  <td className="py-[6px] pr-[8px]">{p.degreeInSign.toFixed(1)}°</td>
                  <td className="py-[6px] pr-[8px]">{p.house ?? '—'}</td>
                  <td className="py-[6px]">{p.retrograde ? '℞' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {astrology.aspects.length > 0 && (
        <Section title="Aspectos">
          <div className="flex flex-wrap gap-[6px]">
            {astrology.aspects.map((a, i) => (
              <span
                key={`${a.a}-${a.b}-${i}`}
                className="text-[11px] px-[8px] py-[4px] rounded-full bg-newBgColor border border-newTableBorder"
                style={{ color: 'var(--new-table-text)' }}
              >
                {a.a}–{a.b}: {ASPECT_PT[a.type] || a.type} ({a.orb.toFixed(1)}°)
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};

const NarrativeBlock: FC<{ title: string; text?: string }> = ({ title, text }) => {
  if (!text) return null;
  return (
    <Section title={title}>
      <p className="text-[14px] leading-[1.7] text-newTextColor whitespace-pre-line">{text}</p>
    </Section>
  );
};

export const ReadingTab: FC<{
  dna: ReligareDNA | null;
  onRecompute?: () => void;
  recomputing?: boolean;
}> = ({ dna, onRecompute, recomputing }) => {
  if (!dna) {
    return (
      <div className="rounded-[16px] border border-dashed border-newTableBorder p-[40px] text-center">
        <Sparkles size={20} className="mx-auto mb-[10px]" style={{ color: 'var(--voc-violet)' }} />
        <p className="text-[15px] font-[700] text-newTextColor mb-[4px]">
          Leitura ainda não gerada
        </p>
        <p className="text-[13px] mb-[16px]" style={{ color: 'var(--new-table-text)' }}>
          Gere a leitura integrativa a partir de todas as ferramentas de autoconhecimento.
        </p>
        {onRecompute && (
          <button
            onClick={onRecompute}
            disabled={recomputing}
            className="inline-flex items-center gap-[7px] px-[16px] py-[9px] rounded-[10px] text-[13px] font-[700] text-white disabled:opacity-60"
            style={{ background: 'var(--voc-violet)' }}
          >
            {recomputing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {recomputing ? 'Gerando…' : 'Gerar leitura'}
          </button>
        )}
      </div>
    );
  }

  const topThemes = dna.themes.slice(0, 6);
  const maxWeight = topThemes[0]?.weight || 1;

  return (
    <>
      <Section title="Síntese integrativa">
        <div className="flex items-start gap-[10px]">
          <Sparkles size={16} style={{ color: 'var(--voc-rose)' }} className="mt-[3px] flex-shrink-0" />
          <p className="text-[15px] leading-[1.7] text-newTextColor whitespace-pre-line">
            {dna.narrative.integrative}
          </p>
        </div>
      </Section>

      {topThemes.length > 0 && (
        <Section title="Fios condutores">
          <div className="flex flex-col gap-[8px]">
            {topThemes.map((t) => (
              <div key={t.key} className="flex items-center gap-[10px]" title={THEME_PHRASE[t.key]}>
                <span className="text-[13px] text-newTextColor w-[120px]">{t.label}</span>
                <div className="flex-1 h-[7px] rounded-full overflow-hidden bg-newBgColor">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(t.weight / maxWeight) * 100}%`, background: 'var(--voc-aurora)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {dna.toneOfVoice && (
        <Section title="Tom de voz">
          <p className="text-[14px] leading-[1.6] text-newTextColor">{dna.toneOfVoice}</p>
        </Section>
      )}

      <NarrativeBlock title="Seu céu (astrologia)" text={dna.narrative.astrology} />
      <NarrativeBlock title="Seu Kin (Tzolkin)" text={dna.narrative.tzolkin} />
      <NarrativeBlock title="Seus arquétipos" text={dna.narrative.archetypes} />
      <NarrativeBlock title="Sua vocação" text={dna.narrative.vocational} />
      <NarrativeBlock title="Seu desenho (Human Design)" text={dna.narrative.humanDesign} />
    </>
  );
};
