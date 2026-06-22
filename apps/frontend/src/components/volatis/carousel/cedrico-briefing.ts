import type { Carousel } from '@gitroom/carousel-engine';
import {
  dnaToBriefingSection,
  type ReligareDNA,
} from '@gitroom/helpers/utils/religare';

/** Dados mínimos do expert atribuído — evita import direto do hook de CRM no engine/UI desacoplados. */
export interface BriefingExpert {
  name: string;
  role?: string | null;
  bio?: string | null;
  toneOfVoice?: string | null;
  audience?: string | null;
  keywords?: string | null;
  dna?: string | null;
  /** Leitura Religare (essência) do expert — alimenta o briefing automaticamente. */
  religareDna?: ReligareDNA | null;
}

/** Briefing de marca do Projeto CRM atribuído — preenche a seção Marca. */
export interface BriefingBrand {
  businessArea?: string | null;
  productsServices?: string | null;
  toneOfVoice?: string | null;
  slogan?: string | null;
  briefing?: string | null;
  cta1?: string | null;
  cta2?: string | null;
  cta3?: string | null;
  persona?: { name?: string; pains?: string[]; desires?: string[] } | null;
}

const TONE_PT: Record<string, string> = {
  FORMAL: 'Formal',
  CASUAL: 'Casual',
  INSPIRATIONAL: 'Inspiracional',
  TECHNICAL: 'Técnico',
  PLAYFUL: 'Descontraído',
  AUTHORITATIVE: 'Autoritativo',
};

function personaLine(p?: BriefingBrand['persona']): string | null {
  if (!p) return null;
  const parts: string[] = [];
  if (p.name?.trim()) parts.push(p.name.trim());
  if (p.pains?.length) parts.push(`dores: ${p.pains.join('; ')}`);
  if (p.desires?.length) parts.push(`desejos: ${p.desires.join('; ')}`);
  return parts.length ? parts.join(' — ') : null;
}

/**
 * Gera o "DNA do Projeto" em markdown — o documento de contexto (Marca + Expert)
 * que a pessoa anexa na conversa com o Volatis | Redator (GPT). Estrutura: por
 * MARCA, com o expert ATRIBUÍDO a este carrossel dentro (N:N marca↔expert,
 * decisão Felipe 2026-06-19) — se nenhum expert estiver atribuído, mantém o
 * placeholder genérico para o usuário preencher manualmente. Pré-preenche o que
 * existe no BrandKit/Expert; NÃO inclui dados visuais (cor/estilo) — o visual é
 * construído no gerador, não no agente. Ver `cedrico-briefing-template.md`.
 */
export function buildBriefing(
  doc: Carousel,
  expert?: BriefingExpert | null,
  brand?: BriefingBrand | null
): string {
  const total = doc.slides.length;
  const ctaFromBrand = [brand?.cta1, brand?.cta2, brand?.cta3]
    .map((c) => c?.trim())
    .filter(Boolean)
    .join(' · ');
  const cta =
    doc.ctaButton?.label?.trim() ||
    ctaFromBrand ||
    '{ex: "Marque um café virtual comigo", "Comenta GUIA"}';
  const brandName = doc.brand.brandName?.trim() || '{nome da marca}';
  const handle = doc.brand.handle?.trim() || '{@handle}';
  const nicho = brand?.businessArea?.trim() || '{preencher — ex: liderança e RH, fitness, imobiliário}';
  const tom =
    (brand?.toneOfVoice && TONE_PT[brand.toneOfVoice]) ||
    '{ex: jornalístico sóbrio, provocativo, acolhedor}';
  const persona = personaLine(brand?.persona) || '{para quem é — cargo, momento, dor central}';
  const produtos = brand?.productsServices?.trim();
  const slogan = brand?.slogan?.trim();
  const briefingLivre = brand?.briefing?.trim();

  const religareBlock = expert?.religareDna
    ? `\n\n${dnaToBriefingSection(expert.religareDna)}`
    : '';

  const expertsBlock = expert
    ? `- ${expert.name}${expert.role ? ` — ${expert.role}` : ''}
  - Especialidade / autoridade: ${expert.bio?.trim() || '{preencher}'}
  - Voz / posicionamento: ${expert.toneOfVoice?.trim() || '{ex: jornalístico sóbrio, provocativo, acolhedor}'}
  - Público: ${expert.audience?.trim() || '{para quem é — cargo, momento, dor central}'}
  - Palavras-chave: ${expert.keywords?.trim() || '{termos/jargões que esse expert usa}'}
  ${expert.dna?.trim() ? `- DNA adicional: ${expert.dna.trim()}` : ''}${religareBlock}`
    : `> Uma marca pode ter vários experts. Liste um bloco por expert (ou atribua um Expert ao
> carrossel no painel "Expert" do editor para isto preencher automaticamente).
- Expert 1
  - Nome: {nome do expert}
  - Especialidade / autoridade: {ex: psicóloga organizacional, 15 anos em RH}
  - Voz / posicionamento: {o que esse expert defende, o ângulo dele}
- Expert 2 (se houver): {...}`;

  return `# DNA do Projeto — ${brandName}

## Marca
- Nome: ${brandName}
- @handle: ${handle}
- Nicho: ${nicho}
- Público / persona: ${persona}
- Tom de voz: ${tom}${slogan ? `\n- Slogan: ${slogan}` : ''}${produtos ? `\n- Produtos e serviços: ${produtos}` : ''}
- CTA padrão do último slide: ${cta}${briefingLivre ? `\n- Briefing livre: ${briefingLivre}` : ''}

## Experts (autoridades que falam pela marca)
${expertsBlock}

## Este carrossel
- Tema / insumo: {colar texto, link de referência ou descrever a ideia}
- Nº de slides: ${total} (${total} slides = ${total * 2} textos)
- Headline preferida (opcional): {se já tiver uma}

## Instrução final
Gere o carrossel no formato pareado "texto N" (ímpar = título, par = corpo), pronto para colar
no campo "Aplicar texto" do gerador Vocaccio. ${total} slides = ${total * 2} textos.
`;
}

/** Dispara o download do DNA do Projeto como arquivo .md. */
export function downloadBriefing(
  doc: Carousel,
  expert?: BriefingExpert | null,
  brand?: BriefingBrand | null
): void {
  const md = buildBriefing(doc, expert, brand);
  const slug = (doc.brand.brandName || doc.title || 'projeto')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dna-projeto-${slug || 'volatis'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
