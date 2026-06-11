import { PrismaClient, VocaccioRole, ProjectStatus, ToneOfVoice, Role, Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ─── User (upsert) ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Vocaccio@2024!', 10);

  const owner = await prisma.user.upsert({
    where: { email_providerName: { email: 'admin@vocaccio.com.br', providerName: Provider.LOCAL } },
    update: {},
    create: {
      email: 'admin@vocaccio.com.br',
      password: passwordHash,
      providerName: Provider.LOCAL,
      name: 'Admin',
      lastName: 'Vocaccio',
      timezone: -180,
      activated: true,
      mustChangePassword: true,
    },
  });

  // ─── Org: use the user's existing org, or create the seed org ────────────────
  const existingMemberships = await prisma.userOrganization.findMany({
    where: { userId: owner.id },
    include: { organization: true },
    orderBy: { organization: { createdAt: 'asc' } },
  });

  let org: { id: string; name: string };
  if (existingMemberships.length > 0) {
    org = existingMemberships[0].organization;
    console.log(`ℹ️  Usando org existente: ${org.name} (${org.id})`);

    // Ensure the owner has vocaccioRole in this org
    await prisma.userOrganization.update({
      where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
      data: { vocaccioRole: VocaccioRole.OWNER },
    });
  } else {
    org = await prisma.organization.upsert({
      where: { id: 'vocaccio-org-seed' },
      update: {},
      create: { id: 'vocaccio-org-seed', name: 'Vocaccio | Soul 2 Soul' },
    });

    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
      update: {},
      create: {
        userId: owner.id,
        organizationId: org.id,
        role: Role.ADMIN,
        vocaccioRole: VocaccioRole.OWNER,
      },
    });
    console.log(`✅ Org criada: ${org.name} (${org.id})`);
  }

  // ─── Clientes + Projetos dummy ────────────────────────────────────────────────
  const clients = [
    {
      name: 'Camila Caeron',
      project: 'Camila Caeron',
      businessArea: 'Coaching de carreira',
      toneOfVoice: ToneOfVoice.INSPIRATIONAL,
      slogan: 'Sua vocação é seu diferencial',
      briefing: 'Coach especializada em transição de carreira para profissionais 30+. Foco em autenticidade e propósito.',
      socialHandles: { instagram: '@camilacaeron', linkedin: 'camilacaeron', tiktok: '@camilacaeron' },
      persona: { name: 'Mariana, 35 anos', pains: ['Sem clareza de propósito', 'Medo de mudar de carreira'], desires: ['Trabalhar com o que ama', 'Ter renda e liberdade'] },
      cta1: 'Agende sua sessão gratuita',
      cta2: 'Baixe o guia de transição',
      contacts: [
        { name: 'Camila Caeron', role: 'Fundadora', email: 'camila@camilacaeron.com.br', phone: '(11) 99999-0001' },
        { name: 'Rafael Assistente', role: 'Assistente', email: 'rafael@camilacaeron.com.br', phone: '' },
      ],
      interactions: [
        { type: 'CALL', summary: 'Onboarding inicial — alinhamento de estratégia de conteúdo para Q3.' },
        { type: 'WHATSAPP', summary: 'Enviou briefing atualizado da campanha de lançamento.' },
        { type: 'MEETING', summary: 'Sprint de conteúdo: 12 posts aprovados para julho.' },
      ],
    },
    {
      name: 'PlanGroup',
      project: 'PlanGroup',
      businessArea: 'Consultoria empresarial',
      toneOfVoice: ToneOfVoice.AUTHORITATIVE,
      slogan: 'Estratégia que transforma',
      briefing: 'Grupo de consultoria com foco em PMEs do interior de SP. Serviços: planejamento estratégico, gestão financeira e RH.',
      socialHandles: { instagram: '@plangroup', linkedin: 'plangroup-br' },
      persona: { name: 'Carlos, 45 anos, dono de PME', pains: ['Gestão desorganizada', 'Falta de visão de crescimento'], desires: ['Escalar o negócio', 'Ter time alinhado'] },
      cta1: 'Fale com um consultor',
      cta2: 'Diagnóstico gratuito',
      contacts: [
        { name: 'Marcos Plan', role: 'CEO', email: 'marcos@plangroup.com.br', phone: '(14) 98888-0002' },
        { name: 'Fernanda RH', role: 'Gerente de RH', email: 'fernanda@plangroup.com.br', phone: '' },
      ],
      interactions: [
        { type: 'EMAIL', summary: 'Recebeu proposta de social media para Q4.' },
        { type: 'MEETING', summary: 'Reunião de kickoff — definidos 4 pilares de conteúdo.' },
        { type: 'NOTE', summary: 'Cliente prefere posts mais formais e sem uso de gírias.' },
      ],
    },
    {
      name: 'Nanda Biolchini',
      project: 'Nanda Biolchini',
      businessArea: 'Nutrição funcional',
      toneOfVoice: ToneOfVoice.CASUAL,
      slogan: 'Saúde que cabe na sua rotina',
      briefing: 'Nutricionista funcional com método próprio de emagrecimento saudável. Forte presença no Instagram e Tiktok.',
      socialHandles: { instagram: '@nandabiolchini', tiktok: '@nandabiolchini', youtube: 'NandaBiolchini' },
      persona: { name: 'Juliana, 28 anos', pains: ['Dietas que não sustentam', 'Falta de energia'], desires: ['Emagrecer sem sofrimento', 'Ter saúde de verdade'] },
      cta1: 'Quero meu plano personalizado',
      cta2: 'Assistir aula gratuita',
      contacts: [
        { name: 'Fernanda Biolchini', role: 'Gestora', email: 'gestao@nandabiolchini.com', phone: '(11) 97777-0003' },
        { name: 'Nanda Biolchini', role: 'Nutricionista', email: 'nanda@nandabiolchini.com', phone: '' },
      ],
      interactions: [
        { type: 'CALL', summary: 'Briefing do lançamento do programa Detox 21 dias.' },
        { type: 'WHATSAPP', summary: 'Aprovação dos criativos de stories da semana.' },
        { type: 'EMAIL', summary: 'Relatório de métricas de maio — 42% crescimento no reach.' },
      ],
    },
    {
      name: 'Plan10',
      project: 'Plan10',
      businessArea: 'Treinamento corporativo',
      toneOfVoice: ToneOfVoice.TECHNICAL,
      slogan: 'Resultados em 10 passos',
      briefing: 'Empresa de treinamento e desenvolvimento para equipes de vendas. Metodologia proprietária com foco em resultados mensuráveis.',
      socialHandles: { instagram: '@plan10br', linkedin: 'plan10-treinamentos' },
      persona: { name: 'Diretor comercial, 40 anos', pains: ['Time sem metodologia', 'Alta rotatividade em vendas'], desires: ['Time produtivo', 'Resultados previsíveis'] },
      cta1: 'Solicitar proposta',
      cta2: 'Ver cases de sucesso',
      contacts: [
        { name: 'Paulo Plan', role: 'Fundador', email: 'paulo@plan10.com.br', phone: '(21) 96666-0004' },
        { name: 'Ana Comercial', role: 'Executiva de contas', email: 'ana@plan10.com.br', phone: '' },
      ],
      interactions: [
        { type: 'MEETING', summary: 'Alinhamento do calendário editorial para o semestre.' },
        { type: 'CALL', summary: 'Revisão da identidade visual — novo logo aprovado.' },
        { type: 'NOTE', summary: 'Prioridade: LinkedIn e cases de cliente. Instagram secundário.' },
      ],
    },
    {
      name: 'Gigantes pela própria natureza',
      project: 'Gigantes',
      businessArea: 'Desenvolvimento pessoal',
      toneOfVoice: ToneOfVoice.INSPIRATIONAL,
      slogan: 'Desperte o gigante que há em você',
      briefing: 'Movimento de desenvolvimento pessoal com eventos presenciais e comunidade online. Tom inspiracional e energético.',
      socialHandles: { instagram: '@gigantespropria', youtube: 'GigantesPelaPropriaInstagram', tiktok: '@gigantespropria' },
      persona: { name: 'João, 32 anos', pains: ['Vive no automático', 'Sem propósito claro'], desires: ['Vida com significado', 'Alta performance'] },
      cta1: 'Participe do próximo evento',
      cta2: 'Entre para a comunidade',
      contacts: [
        { name: 'Thiago Gigantes', role: 'Fundador', email: 'thiago@gigantes.com.br', phone: '(31) 95555-0005' },
        { name: 'Bia Conteúdo', role: 'Produtora de conteúdo', email: 'bia@gigantes.com.br', phone: '' },
      ],
      interactions: [
        { type: 'CALL', summary: 'Planejamento da campanha do evento de setembro (500 vagas).' },
        { type: 'MEETING', summary: 'Workshop de identidade de marca — 3h de imersão.' },
        { type: 'WHATSAPP', summary: 'Aprovação urgente de post sobre inscrições abertas.' },
      ],
    },
    {
      name: 'Vocaccio',
      project: 'Vocaccio (interno)',
      businessArea: 'Social media & growth',
      toneOfVoice: ToneOfVoice.CASUAL,
      slogan: 'Resultados com autenticidade',
      briefing: 'Projeto interno da Vocaccio. Usado para testar fluxos, validar o produto e demonstrar para prospects.',
      socialHandles: { instagram: '@vocaccio', linkedin: 'vocaccio' },
      persona: { name: 'Agência de marketing, 2-10 pessoas', pains: ['Gestão de conteúdo manual', 'Aprovações por WhatsApp'], desires: ['Workflow automatizado', 'Clientes satisfeitos'] },
      cta1: 'Agendar demonstração',
      cta2: 'Ver funcionalidades',
      contacts: [
        { name: 'Felipe', role: 'Fundador', email: 'felipe@vocaccio.com.br', phone: '(11) 94444-0006' },
        { name: 'Equipe Vocaccio', role: 'Operações', email: 'ops@vocaccio.com.br', phone: '' },
      ],
      interactions: [
        { type: 'NOTE', summary: 'Projeto interno — usado para demos e testes do produto.' },
        { type: 'MEETING', summary: 'Sprint de planejamento Q3 — 8 projetos de clientes em andamento.' },
        { type: 'CALL', summary: 'Revisão da estratégia de conteúdo orgânico no LinkedIn.' },
      ],
    },
  ];

  for (const data of clients) {
    // Use name as idempotency key (find existing client in this org by name)
    const existing = await prisma.client.findFirst({
      where: { orgId: org.id, name: data.name, deletedAt: null },
    });

    const client = existing ?? await prisma.client.create({
      data: {
        orgId: org.id,
        name: data.name,
        status: 'ACTIVE',
        responsibleId: owner.id,
        notes: `Cliente seed — ${data.briefing.slice(0, 80)}`,
      },
    });

    if (existing) {
      console.log(`↩  ${data.name} já existe — pulando`);
      continue;
    }

    await prisma.project.create({
      data: {
        clientId: client.id,
        ownerId: owner.id,
        name: data.project,
        businessArea: data.businessArea,
        toneOfVoice: data.toneOfVoice,
        slogan: data.slogan,
        briefing: data.briefing,
        socialHandles: data.socialHandles,
        persona: data.persona,
        cta1: data.cta1,
        cta2: data.cta2,
        status: ProjectStatus.ACTIVE,
      },
    });

    for (const c of data.contacts) {
      await prisma.clientContact.create({
        data: { clientId: client.id, name: c.name, role: c.role, email: c.email || null, phone: c.phone || null },
      });
    }

    for (const i of data.interactions) {
      await prisma.clientInteraction.create({
        data: { clientId: client.id, userId: owner.id, type: i.type, summary: i.summary },
      });
    }

    await prisma.internalTask.createMany({
      data: [
        { orgId: org.id, clientId: client.id, assigneeId: owner.id, title: `Planejar calendário editorial — ${data.project}`, status: 'todo' },
        { orgId: org.id, clientId: client.id, assigneeId: owner.id, title: `Reunião de alinhamento mensal — ${data.name}`, status: 'doing' },
      ],
    });

    console.log(`✓ ${data.name}`);
  }

  console.log('\n✅ Seed concluído');
  console.log(`   Org: ${org.name} (${org.id})`);
  console.log(`   Owner: ${owner.email} / senha: Vocaccio@2024!`);
  console.log(`   Clientes: ${clients.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
