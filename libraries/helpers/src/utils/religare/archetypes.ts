// 12 Jung archetypes — questionnaire definition + local scoring (zero IA).
// Shared so the frontend renders the form and the backend scores the answers.

import {
  ArchetypeInfo,
  ArchetypeKey,
  ArchetypeQuestion,
  ArchetypeResult,
} from './types';

export const ARCHETYPE_INFO: Record<ArchetypeKey, ArchetypeInfo> = {
  innocent: {
    key: 'innocent',
    name: 'Inocente',
    tagline: 'Fé e otimismo',
    description:
      'Busca a felicidade e a simplicidade. Acredita no bem e inspira esperança e leveza.',
  },
  sage: {
    key: 'sage',
    name: 'Sábio',
    tagline: 'Verdade e compreensão',
    description:
      'Move-se pela busca do conhecimento e da verdade. Analisa, ensina e oferece clareza.',
  },
  explorer: {
    key: 'explorer',
    name: 'Explorador',
    tagline: 'Liberdade e descoberta',
    description:
      'Anseia por autenticidade e novos horizontes. Foge do tédio e abre caminhos.',
  },
  outlaw: {
    key: 'outlaw',
    name: 'Rebelde',
    tagline: 'Ruptura e revolução',
    description:
      'Questiona o status quo e quebra o que não serve mais. Transforma pela disrupção.',
  },
  magician: {
    key: 'magician',
    name: 'Mago',
    tagline: 'Transformação e visão',
    description:
      'Conecta mundos e realiza o que parece impossível. Catalisa mudança e significado.',
  },
  hero: {
    key: 'hero',
    name: 'Herói',
    tagline: 'Coragem e maestria',
    description:
      'Supera desafios com disciplina e força de vontade. Prova seu valor pela ação.',
  },
  lover: {
    key: 'lover',
    name: 'Amante',
    tagline: 'Conexão e beleza',
    description:
      'Vive pela intimidade, sensualidade e paixão. Cria vínculos e celebra a beleza.',
  },
  jester: {
    key: 'jester',
    name: 'Bobo da Corte',
    tagline: 'Alegria e presença',
    description:
      'Traz leveza e humor ao momento presente. Desarma pela espontaneidade.',
  },
  everyman: {
    key: 'everyman',
    name: 'Companheiro',
    tagline: 'Pertencimento e empatia',
    description:
      'Valoriza a igualdade e a conexão genuína. Realista, acessível e solidário.',
  },
  caregiver: {
    key: 'caregiver',
    name: 'Cuidador',
    tagline: 'Serviço e compaixão',
    description:
      'Protege e nutre os outros. Generoso, presente e atento às necessidades alheias.',
  },
  ruler: {
    key: 'ruler',
    name: 'Governante',
    tagline: 'Ordem e responsabilidade',
    description:
      'Busca estabilidade e excelência. Lidera, organiza e cria estruturas duradouras.',
  },
  creator: {
    key: 'creator',
    name: 'Criador',
    tagline: 'Imaginação e expressão',
    description:
      'Dá forma ao novo. Inventivo e expressivo, realiza visões em algo concreto.',
  },
};

export const ARCHETYPE_QUESTIONS: ArchetypeQuestion[] = [
  {
    id: 'a1',
    prompt: 'O que mais te energiza no dia a dia?',
    options: [
      { id: 'a1o1', label: 'Aprender e entender como as coisas funcionam', weights: { sage: 2, magician: 1 } },
      { id: 'a1o2', label: 'Criar algo novo do zero', weights: { creator: 2, magician: 1 } },
      { id: 'a1o3', label: 'Cuidar e apoiar quem está ao meu redor', weights: { caregiver: 2, everyman: 1 } },
      { id: 'a1o4', label: 'Encarar um desafio difícil e vencê-lo', weights: { hero: 2, ruler: 1 } },
    ],
  },
  {
    id: 'a2',
    prompt: 'Como as pessoas costumam te descrever?',
    options: [
      { id: 'a2o1', label: 'Otimista e leve', weights: { innocent: 2, jester: 1 } },
      { id: 'a2o2', label: 'Intenso e apaixonado', weights: { lover: 2, magician: 1 } },
      { id: 'a2o3', label: 'Confiável e organizado', weights: { ruler: 2, caregiver: 1 } },
      { id: 'a2o4', label: 'Livre e aventureiro', weights: { explorer: 2, outlaw: 1 } },
    ],
  },
  {
    id: 'a3',
    prompt: 'Diante de uma regra que não faz sentido, você...',
    options: [
      { id: 'a3o1', label: 'Questiona e propõe quebrar', weights: { outlaw: 2, explorer: 1 } },
      { id: 'a3o2', label: 'Estuda o porquê antes de agir', weights: { sage: 2, ruler: 1 } },
      { id: 'a3o3', label: 'Encontra um jeito divertido de contornar', weights: { jester: 2, creator: 1 } },
      { id: 'a3o4', label: 'Segue, mas cuida para ninguém se prejudicar', weights: { caregiver: 2, everyman: 1 } },
    ],
  },
  {
    id: 'a4',
    prompt: 'Seu maior medo seria...',
    options: [
      { id: 'a4o1', label: 'Ficar preso, sem liberdade', weights: { explorer: 2, outlaw: 1 } },
      { id: 'a4o2', label: 'Ser comum, sem deixar marca', weights: { creator: 2, hero: 1 } },
      { id: 'a4o3', label: 'Ficar sozinho, sem conexão', weights: { lover: 2, everyman: 1 } },
      { id: 'a4o4', label: 'Perder o controle e o caos vencer', weights: { ruler: 2, sage: 1 } },
    ],
  },
  {
    id: 'a5',
    prompt: 'Numa equipe, seu papel natural é...',
    options: [
      { id: 'a5o1', label: 'Liderar e definir o rumo', weights: { ruler: 2, hero: 1 } },
      { id: 'a5o2', label: 'Trazer ideias e visão', weights: { magician: 2, creator: 1 } },
      { id: 'a5o3', label: 'Manter o astral e unir as pessoas', weights: { jester: 2, everyman: 1 } },
      { id: 'a5o4', label: 'Apoiar e garantir que ninguém fique para trás', weights: { caregiver: 2, innocent: 1 } },
    ],
  },
  {
    id: 'a6',
    prompt: 'O que te faz sentir realizado?',
    options: [
      { id: 'a6o1', label: 'Transformar a vida de alguém', weights: { magician: 2, caregiver: 1 } },
      { id: 'a6o2', label: 'Superar meus próprios limites', weights: { hero: 2, explorer: 1 } },
      { id: 'a6o3', label: 'Criar beleza e momentos memoráveis', weights: { lover: 2, creator: 1 } },
      { id: 'a6o4', label: 'Compreender algo profundamente', weights: { sage: 2, innocent: 1 } },
    ],
  },
  {
    id: 'a7',
    prompt: 'Seu jeito de lidar com o novo é...',
    options: [
      { id: 'a7o1', label: 'Mergulhar com curiosidade', weights: { explorer: 2, innocent: 1 } },
      { id: 'a7o2', label: 'Planejar cada passo', weights: { ruler: 2, sage: 1 } },
      { id: 'a7o3', label: 'Improvisar e me divertir no processo', weights: { jester: 2, creator: 1 } },
      { id: 'a7o4', label: 'Buscar quem já passou por isso', weights: { everyman: 2, caregiver: 1 } },
    ],
  },
  {
    id: 'a8',
    prompt: 'Qual frase mais combina com você?',
    options: [
      { id: 'a8o1', label: '"O mundo precisa mudar — e eu começo agora."', weights: { outlaw: 2, hero: 1 } },
      { id: 'a8o2', label: '"Tudo é possível se você acredita."', weights: { innocent: 2, magician: 1 } },
      { id: 'a8o3', label: '"A vida é feita de conexões."', weights: { lover: 2, everyman: 1 } },
      { id: 'a8o4', label: '"Conhecimento é a maior riqueza."', weights: { sage: 2, ruler: 1 } },
    ],
  },
  {
    id: 'a9',
    prompt: 'Quando ajuda alguém, sua motivação é...',
    options: [
      { id: 'a9o1', label: 'Aliviar o sofrimento do outro', weights: { caregiver: 2, lover: 1 } },
      { id: 'a9o2', label: 'Mostrar um caminho ou ensinar', weights: { sage: 2, magician: 1 } },
      { id: 'a9o3', label: 'Inspirar pela coragem', weights: { hero: 2, ruler: 1 } },
      { id: 'a9o4', label: 'Simplesmente estar junto', weights: { everyman: 2, innocent: 1 } },
    ],
  },
];

const ALL_KEYS = Object.keys(ARCHETYPE_INFO) as ArchetypeKey[];

/**
 * Score archetype answers. `answers` maps questionId -> selected optionId.
 * Returns the two highest-scoring archetypes plus the full score map.
 */
export function scoreArchetypes(answers: Record<string, string>): ArchetypeResult {
  const scores = ALL_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<ArchetypeKey, number>
  );

  for (const question of ARCHETYPE_QUESTIONS) {
    const optionId = answers?.[question.id];
    if (!optionId) continue;
    const option = question.options.find((o) => o.id === optionId);
    if (!option) continue;
    for (const [key, weight] of Object.entries(option.weights)) {
      scores[key as ArchetypeKey] += weight ?? 0;
    }
  }

  const ranked = ALL_KEYS.slice().sort((a, b) => scores[b] - scores[a]);
  return { primary: ranked[0], secondary: ranked[1], scores };
}
