// Religare PDF export — client-only (jsPDF, same lib already used by the
// carousel export engine). Draws text/shapes directly (no HTML rasterization)
// so the output stays small and the text selectable. Not in the helpers
// barrel: this is frontend-specific rendering code, same split as
// carousel-engine/src/export/pdf.ts.

import { jsPDF } from 'jspdf';
import {
  ARCHETYPE_INFO,
  THEME_PHRASE,
  VOCATION_INFO,
  type ArchetypeKey,
  type ReligareDNA,
} from '@gitroom/helpers/utils/religare';
import type { ReligareProfileDetail } from './use-religare-profiles.hook';

// Vocaccio brand hex values, mirrored from apps/frontend/src/app/vocaccio-tokens.scss
// (jsPDF draws on a canvas-like surface — it can't read CSS variables).
const VOC_INK = '#201f1d';
const VOC_INK_SOFT = '#55536b';
const VOC_ROSE = '#cf6295';
const VOC_VIOLET = '#7360aa';
const VOC_PAPER = '#f5f4f0';
const VOC_LINE = '#d8d3e0';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

class PdfCursor {
  doc: jsPDF;
  y = MARGIN;
  profileName: string;

  constructor(doc: jsPDF, profileName: string) {
    this.doc = doc;
    this.profileName = profileName;
  }

  private ensureSpace(height: number) {
    if (this.y + height > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  spacer(mm: number) {
    this.y += mm;
  }

  heading(text: string, opts: { size?: number; color?: string } = {}) {
    this.ensureSpace(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(opts.size ?? 14);
    this.doc.setTextColor(opts.color ?? VOC_VIOLET);
    this.doc.text(text, MARGIN, this.y);
    this.y += 2;
    this.doc.setDrawColor(VOC_LINE);
    this.doc.line(MARGIN, this.y, MARGIN + CONTENT_W, this.y);
    this.y += 6;
  }

  subheading(text: string) {
    this.ensureSpace(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(VOC_INK);
    this.doc.text(text, MARGIN, this.y);
    this.y += 6;
  }

  bullet(label: string, value: string) {
    const text = `${label}: ${value}`;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10.5);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - 6);
    this.ensureSpace(lines.length * 5 + 2);
    this.doc.setTextColor(VOC_INK);
    this.doc.setFillColor(VOC_ROSE);
    this.doc.circle(MARGIN + 1, this.y - 1.3, 0.7, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${label}:`, MARGIN + 5, this.y);
    const labelWidth = this.doc.getTextWidth(`${label}: `);
    this.doc.setFont('helvetica', 'normal');
    const valueLines = this.doc.splitTextToSize(value, CONTENT_W - 5 - labelWidth);
    this.doc.text(valueLines, MARGIN + 5 + labelWidth, this.y);
    this.y += Math.max(1, valueLines.length) * 5 + 2;
  }

  paragraph(text: string) {
    if (!text) return;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(VOC_INK);
    const lines = this.doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      this.ensureSpace(5.2);
      this.doc.text(line, MARGIN, this.y);
      this.y += 5.2;
    }
    this.y += 3;
  }

  themeBars(themes: ReligareDNA['themes'], max = 6) {
    const top = themes.slice(0, max);
    if (!top.length) return;
    const maxWeight = top[0].weight || 1;
    const barAreaW = CONTENT_W - 45;
    for (const t of top) {
      this.ensureSpace(7);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(VOC_INK);
      this.doc.text(t.label, MARGIN, this.y);
      this.doc.setFillColor(VOC_LINE);
      this.doc.rect(MARGIN + 42, this.y - 3, barAreaW, 3, 'F');
      this.doc.setFillColor(VOC_ROSE);
      this.doc.rect(MARGIN + 42, this.y - 3, barAreaW * (t.weight / maxWeight), 3, 'F');
      this.y += 7;
    }
    this.y += 2;
  }
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function drawCover(doc: jsPDF, title: string, profile: ReligareProfileDetail) {
  doc.setFillColor(VOC_PAPER);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  const logo = await loadImageDataUrl('/vocaccio-symbol.png');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', PAGE_W / 2 - 12, 50, 24, 24);
    } catch {
      /* logo is a nice-to-have — never block the export */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(VOC_ROSE);
  doc.text('VOCACCIO · RELIGARE', PAGE_W / 2, 90, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(26);
  doc.setTextColor(VOC_INK);
  doc.text(title, PAGE_W / 2, 110, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(VOC_INK_SOFT);
  doc.text(profile.name, PAGE_W / 2, 122, { align: 'center' });

  const meta = [
    profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('pt-BR') : null,
    profile.birthPlace,
  ]
    .filter(Boolean)
    .join(' · ');
  if (meta) {
    doc.setFontSize(10);
    doc.text(meta, PAGE_W / 2, 129, { align: 'center' });
  }

  doc.setFontSize(9);
  doc.setTextColor(VOC_INK_SOFT);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    PAGE_W / 2,
    PAGE_H - 20,
    { align: 'center' }
  );
}

function drawTopics(cursor: PdfCursor, profile: ReligareProfileDetail, dna: ReligareDNA) {
  cursor.heading('Em resumo');

  cursor.subheading('Essência');
  if (dna.essence.bigThree) {
    const { sun, moon, rising } = dna.essence.bigThree;
    cursor.bullet('Sol', sun.signPt);
    cursor.bullet('Lua', moon.signPt);
    cursor.bullet('Ascendente', rising.signPt);
  }
  if (dna.essence.kin) {
    cursor.bullet('Kin natal', `${dna.essence.kin.kin} (${dna.essence.kin.tone} ${dna.essence.kin.seal})`);
  }
  if (dna.essence.archetypes) {
    const primary = ARCHETYPE_INFO[dna.essence.archetypes.primary as ArchetypeKey];
    const secondary = ARCHETYPE_INFO[dna.essence.archetypes.secondary as ArchetypeKey];
    cursor.bullet('Arquétipo primário', primary?.name ?? dna.essence.archetypes.primary);
    cursor.bullet('Arquétipo secundário', secondary?.name ?? dna.essence.archetypes.secondary);
  }
  if (dna.essence.callings.length) {
    const names = dna.essence.callings
      .slice(0, 3)
      .map((c) => VOCATION_INFO[c.key]?.name ?? c.name)
      .join(', ');
    cursor.bullet('Chamados vocacionais', names);
  }
  cursor.spacer(2);

  if (profile.humanDesign) {
    cursor.subheading('Human Design');
    cursor.bullet('Tipo', profile.humanDesign.type);
    cursor.bullet('Estratégia', profile.humanDesign.strategy);
    cursor.bullet('Autoridade', profile.humanDesign.authority);
    cursor.bullet('Perfil', profile.humanDesign.profile);
    cursor.spacer(2);
  }

  cursor.subheading('Fios condutores');
  cursor.themeBars(dna.themes);
}

function drawReading(cursor: PdfCursor, dna: ReligareDNA) {
  cursor.heading('Leitura completa');

  cursor.subheading('Síntese integrativa');
  cursor.paragraph(dna.narrative.integrative);

  const sections: [string, string][] = [
    ['Astrologia', dna.narrative.astrology],
    ['Tzolkin', dna.narrative.tzolkin],
    ['Arquétipos', dna.narrative.archetypes],
    ['Vocação', dna.narrative.vocational],
    ['Human Design', dna.narrative.humanDesign],
  ];
  for (const [title, text] of sections) {
    if (!text) continue;
    cursor.subheading(title);
    cursor.paragraph(text);
  }
}

function drawBrandSection(cursor: PdfCursor, dna: ReligareDNA) {
  cursor.heading('Comunicação & Marca');

  cursor.subheading('Tom de voz');
  cursor.paragraph(dna.toneOfVoice);

  cursor.subheading('Diretrizes de comunicação');
  for (const t of dna.themes.slice(0, 4)) {
    cursor.bullet(t.label, THEME_PHRASE[t.key]);
  }
  cursor.spacer(2);

  cursor.subheading('Paleta sugerida');
  const swatches = [VOC_ROSE, VOC_VIOLET, '#e89a7b', '#2897bf'];
  let x = MARGIN;
  for (const hex of swatches) {
    cursor.doc.setFillColor(hex);
    cursor.doc.rect(x, cursor.y, 14, 14, 'F');
    x += 18;
  }
  cursor.y += 20;
  cursor.doc.setFont('helvetica', 'italic');
  cursor.doc.setFontSize(9);
  cursor.doc.setTextColor(VOC_INK_SOFT);
  cursor.doc.text(
    'Sugestão inicial a partir do tema dominante — uma leitura de marca completa (negócio,',
    MARGIN,
    cursor.y
  );
  cursor.y += 4.5;
  cursor.doc.text('persona, nicho) chega numa fase futura do Vocaccio.', MARGIN, cursor.y);
  cursor.y += 6;
}

function drawFooters(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(VOC_INK_SOFT);
    doc.text('Religare · Vocaccio', MARGIN, PAGE_H - 10);
    doc.text(`${i - 1}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
  }
}

export async function buildVocacionalPdf(
  profile: ReligareProfileDetail,
  dna: ReligareDNA
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await drawCover(doc, 'Leitura Vocacional', profile);
  doc.addPage();
  const cursor = new PdfCursor(doc, profile.name);
  drawTopics(cursor, profile, dna);
  cursor.spacer(4);
  drawReading(cursor, dna);
  drawFooters(doc);
  return doc;
}

export async function buildMarcaPdf(
  profile: ReligareProfileDetail,
  dna: ReligareDNA
): Promise<jsPDF> {
  const doc = await buildVocacionalPdf(profile, dna);
  doc.addPage();
  const cursor = new PdfCursor(doc, profile.name);
  drawBrandSection(cursor, dna);
  drawFooters(doc);
  return doc;
}

export function downloadPdf(pdf: jsPDF, filename: string) {
  pdf.save(filename);
}
