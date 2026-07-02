/**
 * Ateliê Virtual — AT-2. Catálogo de serviços (ServiceOffering), separado do seed.ts
 * principal de propósito: seed.ts semeia dados de CLIENTE reais e roda só uma vez
 * (ver docs/atelie/plano-atelie-virtual.md / feedback-schema-migrations na memória do
 * projeto). Este script é 100% idempotente (upsert por slug) — seguro rodar quantas
 * vezes for preciso, inclusive depois de editar a lista abaixo.
 *
 * Slugs espelham exatamente `docs/atelie/briefings/<slug>.md` (AT-1).
 */
import { PrismaClient, ServiceOfferingCategory, ServiceDeliveryMode } from '@prisma/client';

const prisma = new PrismaClient();

const OFFERINGS: {
  slug: string;
  name: string;
  category: ServiceOfferingCategory;
  deliveryMode: ServiceDeliveryMode;
}[] = [
  { slug: 'site-institucional', name: 'Site institucional', category: 'PRESENCA_DIGITAL', deliveryMode: 'BACKOFFICE' },
  { slug: 'landing-page', name: 'Landing page', category: 'PRESENCA_DIGITAL', deliveryMode: 'BACKOFFICE' },
  { slug: 'plano-comunicacao-marketing', name: 'Plano de comunicação/marketing', category: 'ESTRATEGIA', deliveryMode: 'BACKOFFICE' },
  { slug: 'plano-growth-negocios', name: 'Plano de growth/negócios', category: 'ESTRATEGIA', deliveryMode: 'BACKOFFICE' },
  { slug: 'funil-automacao', name: 'Funil de automação', category: 'ESTRATEGIA', deliveryMode: 'BACKOFFICE' },
  { slug: 'roteiro-script', name: 'Roteiro/script de conteúdo', category: 'CONTEUDO', deliveryMode: 'BACKOFFICE' },
  { slug: 'tutorial-documentacao', name: 'Tutorial/documentação', category: 'CONTEUDO', deliveryMode: 'BACKOFFICE' },
  { slug: 'analise-redes-concorrencia', name: 'Análise de redes/site/concorrência', category: 'INTELIGENCIA', deliveryMode: 'BACKOFFICE' },
  // Vídeo (deliveryMode NICOLAS) fica de fora até ele integrar de fato — ver AT-0,
  // seção de riscos/pendências. Adicionar aqui quando houver um fluxo real por trás.
];

async function main() {
  for (const offering of OFFERINGS) {
    await prisma.serviceOffering.upsert({
      where: { slug: offering.slug },
      update: { name: offering.name, category: offering.category, deliveryMode: offering.deliveryMode, active: true },
      create: offering,
    });
    console.log(`✓ ${offering.slug}`);
  }
  console.log(`\n✅ Catálogo do Ateliê Virtual: ${OFFERINGS.length} serviços`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
