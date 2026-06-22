// DNA Religare → export serialization (Markdown for external AI context,
// stable JSON for archival/integration). Pure string building, no deps — safe
// in the barrel, reused by the frontend PDF/export menu.

import { ReligareDNA } from '../types';

export interface ExportProfileMeta {
  name?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
}

/**
 * Markdown rendering of the canonical DNA, meant to be pasted into a Claude
 * Project / GPT custom instructions as the person's vocational/cosmological
 * context (see project memory "Uso com agentes externos").
 */
export function dnaToMarkdown(profile: ExportProfileMeta, dna: ReligareDNA): string {
  const name = profile.name?.trim() || 'Esta essência';
  const lines: string[] = [];

  lines.push(`# DNA Religare — ${name}`);
  if (profile.birthDate || profile.birthPlace) {
    const meta = [profile.birthDate, profile.birthPlace].filter(Boolean).join(' · ');
    lines.push(`_${meta}_`);
  }
  lines.push('');

  lines.push('## Essência');
  if (dna.essence.bigThree) {
    const { sun, moon, rising } = dna.essence.bigThree;
    lines.push(`- **Sol:** ${sun.signPt}`);
    lines.push(`- **Lua:** ${moon.signPt}`);
    lines.push(`- **Ascendente:** ${rising.signPt}`);
  }
  if (dna.essence.kin) {
    lines.push(`- **Kin natal:** ${dna.essence.kin.kin} (${dna.essence.kin.tone} ${dna.essence.kin.seal})`);
  }
  if (dna.essence.archetypes) {
    lines.push(`- **Arquétipos:** ${dna.essence.archetypes.primary} / ${dna.essence.archetypes.secondary}`);
  }
  if (dna.essence.callings.length) {
    lines.push(`- **Chamados vocacionais:** ${dna.essence.callings.slice(0, 4).map((c) => c.name).join(', ')}`);
  }
  lines.push('');

  lines.push('## Fios condutores (temas convergentes)');
  for (const t of dna.themes.slice(0, 6)) {
    lines.push(`- ${t.label} (peso ${t.weight})`);
  }
  lines.push('');

  lines.push(`## Tom de voz`);
  lines.push(dna.toneOfVoice);
  lines.push('');

  lines.push('## Síntese integrativa');
  lines.push(dna.narrative.integrative);
  lines.push('');

  const sections: [string, string][] = [
    ['Astrologia', dna.narrative.astrology],
    ['Tzolkin', dna.narrative.tzolkin],
    ['Arquétipos', dna.narrative.archetypes],
    ['Vocação', dna.narrative.vocational],
    ['Human Design', dna.narrative.humanDesign],
  ];
  for (const [title, text] of sections) {
    if (!text) continue;
    lines.push(`## ${title}`);
    lines.push(text);
    lines.push('');
  }

  return lines.join('\n');
}

export interface DnaExportJson {
  meta: { name: string | null; birthDate: string | null; birthPlace: string | null; generatedAt: string };
  dna: ReligareDNA;
}

/**
 * Compact, copy-oriented Religare block for embedding INSIDE another document
 * (e.g. the Volatis carousel briefing exported to an external copy GPT). Uses
 * H3/bullets so it nests under the briefing's own H1/H2 without clashing. Keeps
 * only what helps copywriting — essence one-liner, tone of voice, convergent
 * themes and the jargon-free integrative synthesis — and deliberately drops the
 * raw per-tool (astrology/Tzolkin/HD) narratives, which belong in the full
 * PDF/Markdown export, not in a copy brief.
 */
export function dnaToBriefingSection(dna: ReligareDNA): string {
  const lines: string[] = [];

  lines.push('### Leitura Religare (essência)');

  const essenceBits: string[] = [];
  if (dna.essence.bigThree) {
    const { sun, moon, rising } = dna.essence.bigThree;
    essenceBits.push(`Sol em ${sun.signPt}, Lua em ${moon.signPt}, Ascendente em ${rising.signPt}`);
  }
  if (dna.essence.archetypes) {
    essenceBits.push(`arquétipos ${dna.essence.archetypes.primary}/${dna.essence.archetypes.secondary}`);
  }
  if (dna.essence.callings.length) {
    essenceBits.push(`chamados: ${dna.essence.callings.slice(0, 3).map((c) => c.name).join(', ')}`);
  }
  if (essenceBits.length) {
    lines.push(`- Essência: ${essenceBits.join('; ')}.`);
  }

  if (dna.toneOfVoice) {
    lines.push(`- Tom de voz: ${dna.toneOfVoice}`);
  }

  if (dna.themes.length) {
    lines.push(`- Fios condutores: ${dna.themes.slice(0, 5).map((t) => t.label).join(', ')}.`);
  }

  if (dna.narrative.integrative) {
    lines.push('');
    lines.push('Síntese integrativa (use como direção de voz e ângulo de conteúdo):');
    lines.push(dna.narrative.integrative);
  }

  return lines.join('\n');
}

/** Self-contained JSON payload (not just a raw `dna` dump) for archival/integration. */
export function dnaToExportJson(profile: ExportProfileMeta, dna: ReligareDNA): DnaExportJson {
  return {
    meta: {
      name: profile.name ?? null,
      birthDate: profile.birthDate ?? null,
      birthPlace: profile.birthPlace ?? null,
      generatedAt: new Date().toISOString(),
    },
    dna,
  };
}
