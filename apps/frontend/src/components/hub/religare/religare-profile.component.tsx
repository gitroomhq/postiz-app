'use client';

import { FC, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Lock,
  FileDown,
  Loader2,
  RefreshCw,
  FileJson,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useReligareProfile } from './use-religare-profile.hook';
import { useReligareMutations } from './use-religare-mutations.hook';
import { AstrologyTab, ReadingTab } from './religare-astrology-tab.component';
import { HumanDesignTab } from './religare-human-design-tab.component';
// jsPDF só entra no bundle quando o usuário realmente exporta (VOC-38).
const loadPdfExport = () => import('./religare-pdf-export');
import {
  ARCHETYPE_INFO,
  dnaToExportJson,
  dnaToMarkdown,
  VOCATION_INFO,
  type ArchetypeKey,
} from '@gitroom/helpers/utils/religare';
import { getMoonPhase } from '@gitroom/helpers/utils/religare';
import type { ReligareProfileDetail } from './use-religare-profiles.hook';

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ExportMenu: FC<{ profile: ReligareProfileDetail }> = ({ profile }) => {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const hasDna = !!profile.dna;
  const tier = user?.tier?.current;
  const marcaUnlocked = !!tier && tier !== 'FREE' && tier !== 'STANDARD';
  const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  const items = [
    {
      key: 'vocacional',
      label: 'PDF Vocacional',
      icon: FileDown,
      locked: false,
      onClick: () =>
        run('vocacional', async () => {
          const { buildVocacionalPdf, downloadPdf } = await loadPdfExport();
          const pdf = await buildVocacionalPdf(profile, profile.dna!);
          downloadPdf(pdf, `religare-vocacional-${slug}.pdf`);
        }),
    },
    {
      key: 'marca',
      label: 'PDF Marca',
      icon: FileDown,
      locked: !marcaUnlocked,
      onClick: () =>
        run('marca', async () => {
          const { buildMarcaPdf, downloadPdf } = await loadPdfExport();
          const pdf = await buildMarcaPdf(profile, profile.dna!);
          downloadPdf(pdf, `religare-marca-${slug}.pdf`);
        }),
    },
    {
      key: 'markdown',
      label: 'Markdown (pra IA)',
      icon: FileText,
      locked: false,
      onClick: () =>
        run('markdown', () => {
          downloadTextFile(
            `religare-${slug}.md`,
            dnaToMarkdown(profile, profile.dna!),
            'text/markdown'
          );
        }),
    },
    {
      key: 'json',
      label: 'JSON',
      icon: FileJson,
      locked: false,
      onClick: () =>
        run('json', () => {
          downloadTextFile(
            `religare-${slug}.json`,
            JSON.stringify(dnaToExportJson(profile, profile.dna!), null, 2),
            'application/json'
          );
        }),
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!hasDna}
        title={hasDna ? 'Exportar leitura' : 'Recalcule a leitura para liberar a exportação'}
        className="flex items-center gap-[7px] px-[14px] py-[9px] rounded-[10px] text-[13px] font-[700] border border-newTableBorder text-newTextColor hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileDown size={14} />
        Exportar
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div ref={overlayRef} className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-[calc(100%+6px)] z-[41] w-[220px] rounded-[12px] border border-newTableBorder bg-newBgColorInner shadow-lg overflow-hidden"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  disabled={item.locked || busy !== null}
                  className="w-full flex items-center gap-[8px] px-[14px] py-[10px] text-[13px] font-[600] text-left text-newTextColor hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === item.key ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Icon size={14} />
                  )}
                  {item.label}
                  {item.locked && <Lock size={11} className="ml-auto" />}
                </button>
              );
            })}
            {!marcaUnlocked && (
              <div
                className="px-[14px] py-[8px] text-[11px] border-t border-newTableBorder"
                style={{ color: 'var(--new-table-text)' }}
              >
                PDF Marca disponível a partir do plano Pro.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const TABS = ['Essência', 'Leitura', 'Astrologia', 'Tzolkin', 'Human Design', 'Consulta'] as const;
type Tab = (typeof TABS)[number];
const LOCKED_TABS: Tab[] = ['Consulta'];

export const ReligareProfile: FC<{ id: string }> = ({ id }) => {
  const { data: profile, isLoading } = useReligareProfile(id);
  const { recomputeProfile } = useReligareMutations();
  const [tab, setTab] = useState<Tab>('Essência');
  const [recomputing, setRecomputing] = useState(false);

  const onRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeProfile(id);
    } catch {
      /* surfaced by the empty-state remaining; keep silent here */
    } finally {
      setRecomputing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-newBgColor">
        <Loader2 size={22} className="animate-spin text-newTextColor opacity-60" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center bg-newBgColor">
        <p className="text-[14px]" style={{ color: 'var(--new-table-text)' }}>
          Perfil não encontrado.
        </p>
      </div>
    );
  }

  const natalMoon = profile.birthDate
    ? getMoonPhase(new Date(profile.birthDate))
    : null;

  return (
    <div className="flex flex-col flex-1 bg-newBgColor min-h-full">
      <div className="max-w-[900px] w-full mx-auto px-[20px] py-[28px]">
        {/* header */}
        <div className="flex items-start justify-between gap-[16px] flex-wrap">
          <div className="flex items-center gap-[10px]">
            <Link
              href="/hub/religare"
              className="text-newTextColor opacity-70 hover:opacity-100"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-[22px] font-[800] text-newTextColor">{profile.name}</h1>
              <p className="text-[12px]" style={{ color: 'var(--new-table-text)' }}>
                {profile.birthPlace}
                {profile.birthDate
                  ? ` · ${new Date(profile.birthDate).toLocaleDateString('pt-BR')}`
                  : ''}
                {profile.birthTime ? ` · ${profile.birthTime}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <button
              onClick={onRecompute}
              disabled={recomputing}
              title="Recalcular astrologia e leitura"
              className="flex items-center gap-[7px] px-[14px] py-[9px] rounded-[10px] text-[13px] font-[700] border border-newTableBorder text-newTextColor hover:opacity-80 disabled:opacity-50"
            >
              {recomputing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {recomputing ? 'Recalculando…' : 'Recalcular'}
            </button>
            <ExportMenu profile={profile} />
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-[2px] mt-[22px] border-b border-newTableBorder">
          {TABS.map((t) => {
            const locked = LOCKED_TABS.includes(t);
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => !locked && setTab(t)}
                className="flex items-center gap-[5px] px-[14px] py-[10px] text-[13px] font-[700] transition-colors relative"
                style={{
                  color: active
                    ? 'var(--voc-violet)'
                    : locked
                    ? 'var(--new-table-text)'
                    : 'rgb(var(--new-textColor))',
                  borderBottom: active
                    ? '2px solid var(--voc-violet)'
                    : '2px solid transparent',
                  opacity: locked ? 0.55 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                }}
              >
                {t}
                {locked && <Lock size={11} />}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div className="py-[24px]">
          {tab === 'Essência' && <EssenciaTab profile={profile} />}
          {tab === 'Leitura' && (
            <ReadingTab dna={profile.dna} onRecompute={onRecompute} recomputing={recomputing} />
          )}
          {tab === 'Astrologia' && (
            <AstrologyTab
              astrology={profile.astrology}
              onRecompute={onRecompute}
              recomputing={recomputing}
            />
          )}
          {tab === 'Tzolkin' && (
            <TzolkinTab profile={profile} moonName={natalMoon?.name} moonEmoji={natalMoon?.emoji} moonDesc={natalMoon?.desc} />
          )}
          {tab === 'Human Design' && (
            <HumanDesignTab
              humanDesign={profile.humanDesign}
              onRecompute={onRecompute}
              recomputing={recomputing}
            />
          )}
          {LOCKED_TABS.includes(tab) && <ComingSoon name={tab} />}
        </div>
      </div>
    </div>
  );
};

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-[16px] bg-newBgColorInner border border-newTableBorder p-[18px] mb-[14px]">
    <div className="text-[12px] font-[800] uppercase tracking-wide mb-[12px]" style={{ color: 'var(--new-table-text)' }}>
      {title}
    </div>
    {children}
  </div>
);

const EssenciaTab: FC<{ profile: ReturnType<typeof useReligareProfile>['data'] }> = ({ profile }) => {
  if (!profile) return null;
  const primary = profile.archetypePrimary
    ? ARCHETYPE_INFO[profile.archetypePrimary as ArchetypeKey]
    : null;
  const secondary = profile.archetypeSecondary
    ? ARCHETYPE_INFO[profile.archetypeSecondary as ArchetypeKey]
    : null;
  const callings = profile.vocational?.callings ?? [];
  const ikigai = profile.vocational?.ikigai;

  return (
    <>
      {profile.synthesis && (
        <Section title="Síntese">
          <div className="flex items-start gap-[10px]">
            <Sparkles size={16} style={{ color: 'var(--voc-rose)' }} className="mt-[2px] flex-shrink-0" />
            <p className="text-[14px] leading-[1.6] text-newTextColor whitespace-pre-line">
              {profile.synthesis}
            </p>
          </div>
        </Section>
      )}

      {(primary || secondary) && (
        <Section title="Arquétipos de Jung">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {[primary, secondary].filter(Boolean).map((arc, i) => (
              <div
                key={arc!.key}
                className="rounded-[12px] p-[14px] border"
                style={{
                  borderColor: i === 0 ? 'var(--voc-rose)' : 'var(--new-table-border)',
                  background: i === 0 ? 'rgba(207,98,149,0.08)' : 'transparent',
                }}
              >
                <div className="text-[11px] font-[700] mb-[2px]" style={{ color: 'var(--new-table-text)' }}>
                  {i === 0 ? 'Primário' : 'Secundário'}
                </div>
                <div className="text-[16px] font-[800] text-newTextColor">{arc!.name}</div>
                <div className="text-[12px] font-[600] mb-[6px]" style={{ color: 'var(--voc-violet)' }}>
                  {arc!.tagline}
                </div>
                <p className="text-[12px] leading-[1.5]" style={{ color: 'var(--new-table-text)' }}>
                  {arc!.description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {callings.length > 0 && (
        <Section title="Chamados vocacionais">
          <div className="flex flex-col gap-[8px]">
            {callings.slice(0, 5).map((c, i) => {
              const max = callings[0].score || 1;
              return (
                <div key={c.key} className="flex items-center gap-[10px]">
                  <span className="text-[13px] font-[700] text-newTextColor w-[28px]">
                    {i + 1}º
                  </span>
                  <span className="text-[13px] text-newTextColor flex-1">
                    {VOCATION_INFO[c.key]?.name ?? c.name}
                  </span>
                  <div className="w-[120px] h-[7px] rounded-full overflow-hidden bg-newBgColor">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.score / max) * 100}%`,
                        background: 'var(--voc-aurora)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {ikigai && (ikigai.loves || ikigai.goodAt || ikigai.worldNeeds || ikigai.paidFor) && (
        <Section title="Ikigai">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {(
              [
                ['Ama', ikigai.loves],
                ['É bom em', ikigai.goodAt],
                ['O mundo precisa', ikigai.worldNeeds],
                ['Pode ser pago por', ikigai.paidFor],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-[10px] p-[12px] bg-newBgColor border border-newTableBorder">
                <div className="text-[11px] font-[700] mb-[3px]" style={{ color: 'var(--voc-violet)' }}>
                  {label}
                </div>
                <div className="text-[13px] text-newTextColor">{value || '—'}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!profile.synthesis && (
        <p className="text-[13px]" style={{ color: 'var(--new-table-text)' }}>
          Leitura ainda não calculada.
        </p>
      )}
    </>
  );
};

const TzolkinTab: FC<{
  profile: ReturnType<typeof useReligareProfile>['data'];
  moonName?: string;
  moonEmoji?: string;
  moonDesc?: string;
}> = ({ profile, moonName, moonEmoji, moonDesc }) => {
  if (!profile) return null;
  const kin = profile.kinData;
  return (
    <>
      <Section title="Kin natal (Tzolkin)">
        {kin ? (
          <div className="flex items-center gap-[16px]">
            <div
              className="w-[64px] h-[64px] rounded-[18px] flex items-center justify-center text-[24px] font-[900] text-white flex-shrink-0"
              style={{ background: kin.accent }}
            >
              {kin.kin}
            </div>
            <div>
              <div className="text-[18px] font-[800] text-newTextColor">
                {kin.tone} {kin.seal}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--new-table-text)' }}>
                Kin {kin.kin} · Selo {kin.seal} · Tom {kin.tone}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--new-table-text)' }}>
            Sem data de nascimento para calcular o Kin.
          </p>
        )}
      </Section>

      {moonName && (
        <Section title="Lua natal">
          <div className="flex items-center gap-[12px]">
            <span className="text-[32px] leading-none">{moonEmoji}</span>
            <div>
              <div className="text-[15px] font-[700] text-newTextColor">{moonName}</div>
              <div className="text-[12px]" style={{ color: 'var(--new-table-text)' }}>
                {moonDesc}
              </div>
            </div>
          </div>
        </Section>
      )}
    </>
  );
};

const ComingSoon: FC<{ name: string }> = ({ name }) => (
  <div className="rounded-[16px] border border-dashed border-newTableBorder p-[40px] text-center">
    <Lock size={20} className="mx-auto mb-[10px]" style={{ color: 'var(--voc-violet)' }} />
    <p className="text-[15px] font-[700] text-newTextColor mb-[4px]">{name} em breve</p>
    <p className="text-[13px]" style={{ color: 'var(--new-table-text)' }}>
      Esta leitura será liberada numa próxima atualização do Religare.
    </p>
  </div>
);
