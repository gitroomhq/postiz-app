import { buildCarousel } from './layout';
import { deriveBrandKit } from './palettes';
import type { Carousel } from './schema';

/**
 * Carrossel mock para desenvolvimento editor-first — antes do Cedrico estar
 * plugado, o editor abre com este conteúdo de exemplo (tema real do banco de
 * headlines Vocaccio) para validar render + export.
 */
export function createMockCarousel(
  crmClientId: string | null = null,
  id?: string
): Carousel {
  const brand = deriveBrandKit({
    brandName: 'Vocaccio',
    handle: '@vocacc.io',
    copyright: '® Copyright 2026',
    niche: 'marketing digital',
    visualStyle: 'modern',
  });

  return buildCarousel({
    id: id ?? `mock-${Date.now()}`,
    title: 'A Morte do Gosto Pessoal',
    crmClientId,
    aspectRatio: '4:5',
    brand,
    content: {
      headline: 'A Morte do <em>Gosto Pessoal</em>: como a dopamina digital nos tornou indiferentes',
      coverImageUrl: undefined,
      cta: 'Comenta <em>GUIA</em> que eu te mando o mapa completo',
      slides: [
        { title: 'O algoritmo virou curador', body: 'A escolha do que assistir, vestir e ouvir passou de uma decisão pessoal para uma sugestão calculada. O feed aprendeu o seu gosto antes de você.' },
        { title: 'Como a indiferença se instala', body: 'Quando tudo é recomendado, nada é escolhido. O esforço de formar opinião própria some — e com ele, o prazer da descoberta.' },
        { title: '<em>73%</em> consomem só o recomendado', body: 'Estudo de comportamento digital aponta que a maioria não busca ativamente: aceita o que aparece. (Fonte: relatório de hábitos, 2025)' },
        { title: 'O custo invisível', body: 'Perder o gosto pessoal é perder a assinatura. Marcas, criadores e pessoas viram intercambiáveis quando ninguém escolhe de verdade.' },
        { title: 'O que ainda escapa do algoritmo', body: 'A curadoria humana volta como diferencial. Quem assume uma posição clara reconquista a atenção que o feed dissolveu.' },
        { title: 'Recuperar a escolha', body: 'Selecionar com intenção é o novo ato de identidade. O gosto pessoal não morreu — está esperando ser reivindicado.' },
        { title: 'Gosto é posição.' }, // slide gradient (direction)
      ],
    },
  });
}
