// DNA Religare — deterministic assembly engine (zero IA, zero token).
// Selects curated fragments per tool, weaves per-section narratives, sums their
// theme tags to find the convergent "fios condutores", and assembles a
// cross-tool integrative synthesis. This is the canonical artifact consumed by
// PDF 1/2, the external-AI export and the Volatis feed. The Sibila-IA (premium,
// Fatia 5) later rewrites this same structured input — it does not replace it.

import { ARCHETYPE_INFO } from './archetypes';
import {
  moonFragment,
  risingFragment,
  sunFragment,
} from './fragments/astrology';
import {
  primaryArchetypeFragment,
  secondaryArchetypeFragment,
} from './fragments/archetypes';
import {
  authorityFragment,
  definitionFragment,
  profileFragment,
  typeFragment,
} from './fragments/hd';
import { INTEGRATIVE_FRAGMENTS } from './fragments/integrative';
import { sealFragment, toneFragment } from './fragments/tzolkin';
import { vocationFragment } from './fragments/vocational';
import { THEME_LABELS } from './themes';
import {
  DNAInput,
  Fragment,
  RankedTheme,
  ReligareDNA,
  ThemeKey,
} from './types';

const THEME_VOICE: Record<ThemeKey, string> = {
  comunicacao: 'expressivo e articulado',
  lideranca: 'firme e inspirador',
  criacao: 'criativo e original',
  estrategia: 'analítico e perspicaz',
  servico: 'acolhedor e generoso',
  introspeccao: 'reflexivo e profundo',
  conexao: 'caloroso e próximo',
  transformacao: 'intenso e provocador',
  ensino: 'didático e esclarecedor',
  liberdade: 'livre e aventureiro',
  estrutura: 'sólido e confiável',
  intuicao: 'sensível e intuitivo',
};

function addTags(acc: Record<string, number>, frag: Fragment) {
  for (const [k, v] of Object.entries(frag.tags)) {
    acc[k] = (acc[k] || 0) + (v ?? 0);
  }
}

function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function buildDNA(input: DNAInput): ReligareDNA {
  const name = (input.name || '').trim() || 'Esta essência';
  const tagTotals: Record<string, number> = {};
  const used: Fragment[] = [];

  const collect = (frag: Fragment) => {
    used.push(frag);
    addTags(tagTotals, frag);
    return frag.text;
  };

  // ── Astrology ──
  let astrology = '';
  if (input.astrology) {
    const { sun, moon, rising } = input.astrology.bigThree;
    astrology = [
      collect(sunFragment(sun.sign)),
      collect(moonFragment(moon.sign)),
      collect(risingFragment(rising.sign)),
    ].join(' ');
  }

  // ── Tzolkin (+ moon phase flavor, untagged) ──
  let tzolkin = '';
  if (input.kin) {
    const parts = [
      collect(sealFragment(input.kin.sealIndex)),
      collect(toneFragment(input.kin.toneIndex)),
    ];
    if (input.moon) {
      parts.push(
        `Nasceu sob a ${input.moon.name} ${input.moon.emoji} — energia de ${input.moon.desc.toLowerCase()}.`
      );
    }
    tzolkin = parts.join(' ');
  }

  // ── Archetypes ──
  let archetypes = '';
  if (input.archetypes) {
    archetypes = [
      collect(primaryArchetypeFragment(input.archetypes.primary)),
      collect(secondaryArchetypeFragment(input.archetypes.secondary)),
    ].join(' ');
  }

  // ── Vocational ──
  let vocational = '';
  if (input.vocational && input.vocational.callings.length) {
    const top = input.vocational.callings.slice(0, 4);
    const lines = top.map((c, i) => collect(vocationFragment(c.key, i)));
    const names = joinPt(top.map((c) => c.name));
    vocational = `Seus chamados mais fortes apontam para ${names}. ${lines.join(' ')}`;
  }

  // ── Human Design ──
  let humanDesign = '';
  if (input.humanDesign) {
    const hd = input.humanDesign;
    humanDesign = [
      collect(typeFragment(hd.type)),
      collect(authorityFragment(hd.authority)),
      collect(profileFragment(hd.profile)),
      collect(definitionFragment(hd.definition)),
    ].join(' ');
  }

  // ── Convergence → ranked themes ──
  const themes: RankedTheme[] = (Object.keys(tagTotals) as ThemeKey[])
    .map((key) => ({ key, label: THEME_LABELS[key], weight: tagTotals[key] }))
    .sort((a, b) => b.weight - a.weight);

  // ── Integrative synthesis from the top convergent themes ──
  const topThemes = themes.slice(0, 4);
  let integrative = '';
  if (topThemes.length) {
    const intro = `Quando olhamos ${name} por inteiro — céu, Kin, arquétipos, vocação e desenho energético juntos —, alguns fios condutores se repetem e revelam o centro da sua essência:`;
    const passages = topThemes.map((t) => INTEGRATIVE_FRAGMENTS[t.key].text);
    integrative = [intro, ...passages].join('\n\n');
  } else {
    integrative = `${name} ainda está sendo revelada. Complete o onboarding para gerar a leitura integrativa.`;
  }

  // ── Tone of voice ──
  const voiceAdjs = topThemes.slice(0, 3).map((t) => THEME_VOICE[t.key]);
  let toneOfVoice = voiceAdjs.length
    ? `Uma voz ${joinPt(voiceAdjs)}.`
    : 'Voz a definir após o onboarding.';
  if (input.archetypes) {
    toneOfVoice += ` Fala a partir do ${ARCHETYPE_INFO[input.archetypes.primary].name}.`;
  }

  return {
    essence: {
      bigThree: input.astrology?.bigThree ?? null,
      kin: input.kin ?? null,
      archetypes: input.archetypes
        ? { primary: input.archetypes.primary, secondary: input.archetypes.secondary }
        : null,
      callings: input.vocational?.callings ?? [],
    },
    themes,
    toneOfVoice,
    narrative: { astrology, tzolkin, archetypes, vocational, humanDesign, integrative },
  };
}
