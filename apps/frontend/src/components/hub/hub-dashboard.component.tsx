'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Sparkles, Clock, CheckCircle2, Lock } from 'lucide-react';

// ── Tzolkin / Kin ──────────────────────────────────────────────────────────

const SEALS = [
  'Dragão', 'Vento', 'Noite', 'Semente', 'Serpente',
  'Transformador', 'Veado', 'Estrela', 'Lua', 'Cão',
  'Macaco', 'Humano', 'Andarilho Celeste', 'Mago', 'Águia',
  'Guerreiro', 'Terra', 'Espelho', 'Tempestade', 'Sol',
];

const TONES = [
  'Magnético', 'Lunar', 'Elétrico', 'Auto-Existente', 'Radiante',
  'Rítmico', 'Ressonante', 'Galático', 'Solar', 'Planetário',
  'Espectral', 'Cristal', 'Cósmico',
];

const SEAL_ACCENT = [
  '#cf6295', '#dcd0c3', '#2897bf', '#e89a7b',
];

function getTodayKin() {
  // Anchor: 26/Jul/1987 = Kin 34 (Dreamspell)
  const anchor = new Date('1987-07-26T00:00:00Z').getTime();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - anchor) / 86400000);
  const kin = ((34 - 1 + days) % 260 + 260) % 260 + 1;
  const sealIdx = (kin - 1) % 20;
  const toneIdx = (kin - 1) % 13;
  return {
    kin,
    seal: SEALS[sealIdx],
    tone: TONES[toneIdx],
    accent: SEAL_ACCENT[sealIdx % 4],
  };
}

// ── Moon phase ─────────────────────────────────────────────────────────────

const MOON_PHASES = [
  { name: 'Lua Nova',        emoji: '🌑', desc: 'Intenções e novos começos' },
  { name: 'Lua Crescente',   emoji: '🌒', desc: 'Expansão e ação' },
  { name: 'Quarto Crescente',emoji: '🌓', desc: 'Decisões produtivas' },
  { name: 'Gibosa Crescente',emoji: '🌔', desc: 'Refinamento e crescimento' },
  { name: 'Lua Cheia',       emoji: '🌕', desc: 'Culminação e revelação' },
  { name: 'Gibosa Minguante',emoji: '🌖', desc: 'Gratidão e integração' },
  { name: 'Quarto Minguante',emoji: '🌗', desc: 'Reflexão e liberação' },
  { name: 'Lua Minguante',   emoji: '🌘', desc: 'Descanso e entrega' },
];

function getMoonPhase() {
  const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
  const cycle = 29.53058867 * 86400000;
  const elapsed = ((Date.now() - knownNew) % cycle + cycle) % cycle;
  return MOON_PHASES[Math.floor((elapsed / cycle) * 8) % 8];
}

// ── Oracle ─────────────────────────────────────────────────────────────────

const ORACLE = [
  'A voz que você mais precisa ouvir é a sua própria. — Jung',
  'Não te tornes quem és — sê quem sempre foste. — Rumi',
  'A jornada de mil milhas começa com um único passo. — Lao Tzu',
  'Você só perde aquilo a que se apega. — Buda',
  'O presente momento sempre terá sido. — Eckhart Tolle',
  'O silêncio é uma fonte que nunca seca. — Rumi',
  'O coração tem razões que a razão desconhece. — Pascal',
  'Aquilo a que resistes, persiste. O que aceitas, transforma-te. — Jung',
  'Seja a mudança que você quer ver no mundo. — Gandhi',
  'Não somos seres humanos tendo uma experiência espiritual — somos seres espirituais tendo uma experiência humana. — Teilhard de Chardin',
  'Conheça-te a ti mesmo e conhecerás os deuses e o universo. — Sócrates',
  'A vida não examinada não merece ser vivida. — Sócrates',
  'Onde a atenção vai, a energia flui. — James Redfield',
  'A maior aventura é viver a vida dos seus sonhos. — Oprah',
  'Tudo que tem começo tem um fim. Faz a paz com isso e tudo fica bem. — Buda',
  'O que é essencial é invisível aos olhos. — Antoine de Saint-Exupéry',
  'Não há caminho para a paz — a paz é o caminho. — Gandhi',
  'Quando você muda a forma de ver as coisas, as coisas que você vê mudam. — Wayne Dyer',
  'A consciência é o sol do interior. — Alan Watts',
  'Você já é o que está procurando. — Alan Watts',
];

function getDailyOracle() {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return ORACLE[dayOfYear % ORACLE.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────

const Card = ({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`rounded-[18px] p-[20px] flex flex-col gap-[10px] ${className}`}
    style={{
      background: 'var(--voc-paper-raised)',
      border: '1px solid var(--voc-line)',
      boxShadow: 'var(--voc-shadow-soft)',
      ...style,
    }}
  >
    {children}
  </div>
);

const WidgetLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    className="text-[10px] font-[700] uppercase tracking-[0.1em]"
    style={{ color: 'var(--voc-ink-soft)' }}
  >
    {children}
  </span>
);

const MoonWidget = ({ moon }: { moon: typeof MOON_PHASES[0] }) => (
  <Card>
    <WidgetLabel>Fase da Lua</WidgetLabel>
    <div className="flex items-center gap-[12px]">
      <span className="text-[36px] leading-none">{moon.emoji}</span>
      <div>
        <div className="text-[15px] font-[700]" style={{ color: 'var(--voc-ink)' }}>
          {moon.name}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
          {moon.desc}
        </div>
      </div>
    </div>
  </Card>
);

const KinWidget = ({ kin }: { kin: ReturnType<typeof getTodayKin> }) => (
  <Card>
    <WidgetLabel>Kin do Dia</WidgetLabel>
    <div className="flex items-center gap-[12px]">
      <div
        className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[15px] font-[800] text-white flex-shrink-0"
        style={{ background: kin.accent }}
      >
        {kin.kin}
      </div>
      <div>
        <div className="text-[15px] font-[700]" style={{ color: 'var(--voc-ink)' }}>
          {kin.tone} {kin.seal}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
          Tzolkin · Kin {kin.kin}
        </div>
      </div>
    </div>
  </Card>
);

const OracleWidget = ({ oracle }: { oracle: string }) => {
  const [quote, author] = oracle.split(' — ');
  return (
    <Card>
      <WidgetLabel>Oráculo do Dia</WidgetLabel>
      <div>
        <p
          className="text-[13px] italic leading-[1.5]"
          style={{ color: 'var(--voc-ink)' }}
        >
          "{quote}"
        </p>
        {author && (
          <p className="text-[11px] mt-[6px]" style={{ color: 'var(--voc-ink-soft)' }}>
            — {author}
          </p>
        )}
      </div>
    </Card>
  );
};

const MetricCard = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <Card>
    <WidgetLabel>{label}</WidgetLabel>
    <div className="text-[32px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
      {value}
    </div>
    {sub && (
      <div className="text-[11px]" style={{ color: 'var(--voc-ink-soft)' }}>
        {sub}
      </div>
    )}
  </Card>
);

const PendingWidget = ({ count }: { count: number }) => (
  <Card>
    <WidgetLabel>Aprovações Pendentes</WidgetLabel>
    <div className="flex items-center gap-[12px]">
      <CheckCircle2
        size={28}
        style={{ color: count > 0 ? 'var(--voc-peach)' : 'var(--voc-ink-soft)' }}
      />
      <div>
        <div className="text-[28px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
          {count}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
          {count === 0 ? 'Tudo em dia' : `${count} aguardando revisão`}
        </div>
      </div>
    </div>
    {count > 0 && (
      <Link
        href="/hub/crm"
        className="text-[12px] font-[600] mt-[4px]"
        style={{ color: 'var(--voc-violet)' }}
      >
        Ver pendências →
      </Link>
    )}
  </Card>
);

const TodayWidget = ({ count }: { count: number }) => (
  <Card>
    <WidgetLabel>Publicações Hoje</WidgetLabel>
    <div className="flex items-center gap-[12px]">
      <Clock
        size={28}
        style={{ color: count > 0 ? 'var(--voc-blue)' : 'var(--voc-ink-soft)' }}
      />
      <div>
        <div className="text-[28px] font-[800]" style={{ color: 'var(--voc-ink)' }}>
          {count}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--voc-ink-soft)' }}>
          {count === 0 ? 'Nenhuma agendada' : `${count} agendada${count > 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  </Card>
);

const ReligareCTA = () => (
  <Card
    style={{
      background: 'linear-gradient(135deg, rgba(232,154,123,0.08), rgba(115,96,170,0.12))',
      border: '1px solid rgba(115,96,170,0.24)',
    }}
  >
    <div className="flex items-center gap-[8px]">
      <Lock size={14} style={{ color: 'var(--voc-violet)' }} />
      <WidgetLabel>Religare</WidgetLabel>
    </div>
    <div>
      <div className="text-[14px] font-[700]" style={{ color: 'var(--voc-ink)' }}>
        Conexão com sua Essência Vocacional
      </div>
      <p className="text-[12px] mt-[6px] leading-[1.5]" style={{ color: 'var(--voc-ink-soft)' }}>
        Descubra seus arquétipos Jung, Kin Tzolkin e Desenho Humano. Ative para ver o pulso cosmológico do seu negócio.
      </p>
    </div>
    <div className="flex items-center gap-[8px] mt-[4px]">
      <Sparkles size={14} style={{ color: 'var(--voc-rose)' }} />
      <span className="text-[12px] font-[600]" style={{ color: 'var(--voc-violet)' }}>
        Conheça o Religare →
      </span>
    </div>
  </Card>
);

// ── Main dashboard ─────────────────────────────────────────────────────────

export const HubDashboard = () => {
  const user = useUser();

  // Phase 1: ADMIN/SUPERADMIN org roles see Religare widgets for demo.
  // Phase 5: replace with actual subscription plan check.
  const hasReligare = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const kin   = useMemo(() => getTodayKin(), []);
  const moon  = useMemo(() => getMoonPhase(), []);
  const oracle = useMemo(() => getDailyOracle(), []);

  const firstName = (user as any)?.name?.split(' ')[0] ?? '';

  return (
    <div
      className="flex-1 p-[28px] flex flex-col gap-[20px] overflow-y-auto"
      style={{ background: 'var(--voc-paper)' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-[4px]">
        <h1
          className="text-[26px] font-[800]"
          style={{ color: 'var(--voc-ink)' }}
        >
          {firstName ? `Bom dia, ${firstName}.` : 'Bem-vindo ao Hub.'}
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--voc-ink-soft)' }}>
          Aqui está o pulso do seu ecossistema.
        </p>
      </div>

      {hasReligare ? (
        <>
          {/* Row 1 — cosmological widgets */}
          <div className="grid grid-cols-3 gap-[16px]">
            <MoonWidget moon={moon} />
            <KinWidget kin={kin} />
            <OracleWidget oracle={oracle} />
          </div>

          {/* Row 2 — social metrics (mock — dados reais na Fase 3) */}
          <div className="grid grid-cols-3 gap-[16px]">
            <MetricCard label="Posts 30 dias"  value="—" sub="dados reais na Fase 3" />
            <MetricCard label="Alcance"         value="—" sub="dados reais na Fase 3" />
            <MetricCard label="Engajamento"     value="—" sub="dados reais na Fase 3" />
          </div>

          {/* Row 3 — operational widgets */}
          <div className="grid grid-cols-2 gap-[16px]">
            <PendingWidget count={0} />
            <TodayWidget count={0} />
          </div>
        </>
      ) : (
        <>
          {/* Row 1 — social metrics */}
          <div className="grid grid-cols-3 gap-[16px]">
            <MetricCard label="Posts 30 dias" value="—" sub="dados reais na Fase 3" />
            <MetricCard label="Alcance"        value="—" sub="dados reais na Fase 3" />
            <MetricCard label="Engajamento"    value="—" sub="dados reais na Fase 3" />
          </div>

          {/* Row 2 — operational + Religare CTA */}
          <div className="grid grid-cols-3 gap-[16px]">
            <PendingWidget count={0} />
            <TodayWidget count={0} />
            <ReligareCTA />
          </div>
        </>
      )}
    </div>
  );
};
