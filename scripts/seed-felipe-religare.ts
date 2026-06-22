/**
 * Dummy content — cria/atualiza o Expert "Felipe Kairós" e o seu Religare
 * completo (dados reais de nascimento + respostas dummy plausíveis), com Kin,
 * arquétipos, vocação/Ikigai e síntese já calculados pelos helpers.
 *
 * Rodar a partir da raiz do repo:
 *   npx tsx scripts/seed-felipe-religare.ts
 * (ou: npx ts-node --transpile-only scripts/seed-felipe-religare.ts)
 *
 * Toca o banco de PRODUÇÃO (insere só os dados do Felipe). Idempotente.
 */
import { PrismaClient } from '@prisma/client';
import {
  kinForDate,
  getMoonPhase,
  scoreArchetypes,
  scoreVocational,
  buildSynthesis,
} from '../libraries/helpers/src/utils/religare';

const prisma = new PrismaClient();

// Override opcional: `npx tsx scripts/seed-felipe-religare.ts outro@email.com`
const USER_EMAIL = process.argv[2] || 'felipeweb7@gmail.com';

// — Dados do Felipe —
const SOCIAL_NAME = 'Felipe Kairós';
const FULL_NAME = 'Felipe Pinheiro Silva';
const BIRTH_DATE = new Date('1987-12-11T00:00:00Z'); // 11/12/1987
const BIRTH_TIME = '07:45';
const BIRTH_PLACE = 'São Paulo, SP, Brasil';
const BIRTH_TZ = 'America/Sao_Paulo';

// Respostas dummy plausíveis (Sábio + Mago; vocação Comunicação/Empreendedorismo/Liderança)
const ARCH_ANSWERS: Record<string, string> = {
  a1: 'a1o2', a2: 'a2o2', a3: 'a3o2', a4: 'a4o4', a5: 'a5o2',
  a6: 'a6o1', a7: 'a7o2', a8: 'a8o4', a9: 'a9o2',
};
const VOC_ANSWERS: Record<string, string> = {
  v1: 'v1o4', v2: 'v2o3', v3: 'v3o1', v4: 'v4o1',
  v5: 'v5o1', v6: 'v6o3', v7: 'v7o3',
};
const IKIGAI = {
  loves: 'criar e ensinar sobre essência, marca e tecnologia',
  goodAt: 'comunicar ideias complexas de forma simples e inspiradora',
  worldNeeds: 'marcas autênticas e conscientes',
  paidFor: 'estratégia de conteúdo e construção de marcas',
};

async function main() {
  // match case-insensitive (emails às vezes gravados com maiúsculas)
  const user = await prisma.user.findFirst({
    where: { email: { equals: USER_EMAIL, mode: 'insensitive' } },
  });
  if (!user) {
    const all = await prisma.user.findMany({
      select: { email: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    console.log('Usuários encontrados no banco:');
    for (const u of all) console.log('  -', u.email);
    throw new Error(
      `Usuário ${USER_EMAIL} não encontrado. Rode de novo com um dos emails acima: npx tsx scripts/seed-felipe-religare.ts SEU_EMAIL`
    );
  }

  const membership = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!membership) throw new Error('Nenhuma organização para esse usuário.');
  const orgId = membership.organizationId;

  // 1) Expert "Felipe Kairós" (idempotente por nome dentro da org)
  let expert = await prisma.expert.findFirst({
    where: { orgId, name: SOCIAL_NAME, deletedAt: null },
  });
  if (!expert) {
    expert = await prisma.expert.create({
      data: {
        orgId,
        name: SOCIAL_NAME,
        role: 'Fundador',
        handle: 'felipekairos',
        bio: 'Fundador da Vocaccio. Estratégia, criação e essência de marca.',
      },
    });
  }

  // 2) Cálculos
  const archetypes = scoreArchetypes(ARCH_ANSWERS);
  const vocational = scoreVocational(VOC_ANSWERS, IKIGAI);
  const kin = kinForDate(BIRTH_DATE);
  const moon = getMoonPhase(BIRTH_DATE);
  const synthesis = buildSynthesis({
    name: SOCIAL_NAME,
    kin,
    moon,
    archetypes,
    vocational,
  });

  const data = {
    orgId,
    expertId: expert.id,
    name: SOCIAL_NAME,
    birthDate: BIRTH_DATE,
    birthTime: BIRTH_TIME,
    birthPlace: BIRTH_PLACE,
    birthTz: BIRTH_TZ,
    answers: { archetypes: ARCH_ANSWERS, vocational: VOC_ANSWERS, ikigai: IKIGAI },
    kinNatal: kin.kin,
    kinData: kin as any,
    archetypePrimary: archetypes.primary,
    archetypeSecondary: archetypes.secondary,
    archetypeScores: archetypes.scores as any,
    vocational: vocational as any,
    synthesis,
    // guarda os nomes p/ a futura numerologia (social + completo)
    brandProfile: { socialName: SOCIAL_NAME, fullName: FULL_NAME } as any,
    status: 'COMPLETE',
  };

  // 3) Religare (idempotente por expertId unique)
  const existing = await prisma.religareProfile.findFirst({
    where: { expertId: expert.id },
  });
  const profile = existing
    ? await prisma.religareProfile.update({ where: { id: existing.id }, data })
    : await prisma.religareProfile.create({ data });

  console.log('✓ Expert:', expert.name, expert.id);
  console.log(
    `✓ Religare: Kin ${kin.kin} (${kin.tone} ${kin.seal}) · ${archetypes.primary} + ${archetypes.secondary} · lua ${moon.name}`
  );
  console.log('✓ Perfil:', profile.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
