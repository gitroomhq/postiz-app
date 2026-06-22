// Deterministic narrative synthesis ("Sibila v0") — zero IA, zero token.
// Assembles a reading from the computed data via templates. A real Sibila
// (Sonnet + cache) is a future premium upgrade.

import { ARCHETYPE_INFO } from './archetypes';
import { SynthesisInput } from './types';

export function buildSynthesis(input: SynthesisInput): string {
  const name = (input.name || '').trim() || 'Esta essência';
  const parts: string[] = [];

  if (input.archetypes) {
    const primary = ARCHETYPE_INFO[input.archetypes.primary];
    const secondary = ARCHETYPE_INFO[input.archetypes.secondary];
    parts.push(
      `${name} expressa o arquétipo do ${primary.name} (${primary.tagline.toLowerCase()}), ` +
        `temperado pelo ${secondary.name} (${secondary.tagline.toLowerCase()}). ` +
        `${primary.description}`
    );
  }

  if (input.kin) {
    parts.push(
      `No Tzolkin, carrega o Kin ${input.kin.kin}: ${input.kin.seal} em tom ${input.kin.tone}. ` +
        `Esse selo natal aponta o pulso essencial que move sua expressão no mundo.`
    );
  }

  if (input.moon) {
    parts.push(
      `Nasceu sob a ${input.moon.name} ${input.moon.emoji} — energia de ${input.moon.desc.toLowerCase()}.`
    );
  }

  if (input.vocational && input.vocational.callings.length) {
    const top = input.vocational.callings.slice(0, 3).map((c) => c.name);
    const list =
      top.length > 1
        ? `${top.slice(0, -1).join(', ')} e ${top[top.length - 1]}`
        : top[0];
    parts.push(
      `Seus chamados vocacionais mais fortes apontam para ${list}. ` +
        `É aí que o talento encontra entrega.`
    );

    const { ikigai } = input.vocational;
    const filled = [ikigai.loves, ikigai.goodAt, ikigai.worldNeeds, ikigai.paidFor].filter(
      (s) => s && s.trim()
    );
    if (filled.length === 4) {
      parts.push(
        `No cruzamento do Ikigai: ama ${ikigai.loves.trim()}, é bom em ${ikigai.goodAt.trim()}, ` +
          `o mundo precisa de ${ikigai.worldNeeds.trim()} e pode ser reconhecido por ${ikigai.paidFor.trim()}. ` +
          `O ponto onde esses quatro se encontram é o seu propósito vivo.`
      );
    }
  }

  if (!parts.length) {
    return `${name} ainda está sendo revelada. Complete o onboarding para gerar a leitura.`;
  }

  return parts.join('\n\n');
}
