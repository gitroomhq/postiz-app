// Vocational test — callings (local scoring) + Ikigai pillars. Zero IA.
// Shared so the frontend renders the form and the backend scores the answers.

import {
  IkigaiAnswers,
  VocationInfo,
  VocationKey,
  VocationalQuestion,
  VocationalResult,
} from './types';

export const VOCATION_INFO: Record<VocationKey, VocationInfo> = {
  creative: { key: 'creative', name: 'Criação & Arte', description: 'Dar forma a ideias, estética e expressão original.' },
  analytical: { key: 'analytical', name: 'Análise & Estratégia', description: 'Investigar, estruturar e resolver problemas complexos.' },
  caregiving: { key: 'caregiving', name: 'Cuidado & Saúde', description: 'Acolher, curar e zelar pelo bem-estar das pessoas.' },
  leadership: { key: 'leadership', name: 'Liderança & Gestão', description: 'Conduzir pessoas, decidir e construir times.' },
  entrepreneurial: { key: 'entrepreneurial', name: 'Empreendedorismo', description: 'Criar negócios, assumir risco e gerar valor.' },
  communication: { key: 'communication', name: 'Comunicação & Influência', description: 'Conectar, contar histórias e mobilizar audiências.' },
  spiritual: { key: 'spiritual', name: 'Espiritualidade & Sentido', description: 'Guiar pela essência, propósito e desenvolvimento interior.' },
  technical: { key: 'technical', name: 'Tecnologia & Engenharia', description: 'Construir sistemas, automatizar e dominar o concreto.' },
  artisan: { key: 'artisan', name: 'Ofício & Mãos', description: 'Fazer com as mãos, com técnica e materialidade.' },
  educator: { key: 'educator', name: 'Educação & Mentoria', description: 'Ensinar, formar e despertar o potencial dos outros.' },
};

export const VOCATIONAL_QUESTIONS: VocationalQuestion[] = [
  {
    id: 'v1',
    prompt: 'Que tipo de problema você resolveria de graça, só pelo prazer?',
    options: [
      { id: 'v1o1', label: 'Inventar algo bonito ou original', weights: { creative: 2, artisan: 1 } },
      { id: 'v1o2', label: 'Decifrar dados e padrões', weights: { analytical: 2, technical: 1 } },
      { id: 'v1o3', label: 'Ajudar alguém a se sentir melhor', weights: { caregiving: 2, spiritual: 1 } },
      { id: 'v1o4', label: 'Organizar pessoas em torno de uma meta', weights: { leadership: 2, entrepreneurial: 1 } },
    ],
  },
  {
    id: 'v2',
    prompt: 'Onde você naturalmente se destaca?',
    options: [
      { id: 'v2o1', label: 'Explicar coisas difíceis de um jeito simples', weights: { educator: 2, communication: 1 } },
      { id: 'v2o2', label: 'Construir e consertar coisas', weights: { technical: 2, artisan: 1 } },
      { id: 'v2o3', label: 'Encantar e convencer', weights: { communication: 2, entrepreneurial: 1 } },
      { id: 'v2o4', label: 'Trazer calma e direção espiritual', weights: { spiritual: 2, caregiving: 1 } },
    ],
  },
  {
    id: 'v3',
    prompt: 'Num projeto em grupo, você é quem...',
    options: [
      { id: 'v3o1', label: 'Define a visão e lidera', weights: { leadership: 2, entrepreneurial: 1 } },
      { id: 'v3o2', label: 'Cuida da parte criativa', weights: { creative: 2, communication: 1 } },
      { id: 'v3o3', label: 'Garante o rigor e a qualidade técnica', weights: { analytical: 2, technical: 1 } },
      { id: 'v3o4', label: 'Mantém todos cuidados e motivados', weights: { caregiving: 2, educator: 1 } },
    ],
  },
  {
    id: 'v4',
    prompt: 'O reconhecimento que mais te toca é...',
    options: [
      { id: 'v4o1', label: '"Você mudou minha forma de ver isso."', weights: { educator: 2, spiritual: 1 } },
      { id: 'v4o2', label: '"Nunca vi algo tão original."', weights: { creative: 2, artisan: 1 } },
      { id: 'v4o3', label: '"Você construiu algo que funciona de verdade."', weights: { technical: 2, entrepreneurial: 1 } },
      { id: 'v4o4', label: '"Você cuidou de mim quando eu precisei."', weights: { caregiving: 2, communication: 1 } },
    ],
  },
  {
    id: 'v5',
    prompt: 'Que ambiente faz seus olhos brilharem?',
    options: [
      { id: 'v5o1', label: 'Um palco, um microfone, uma câmera', weights: { communication: 2, creative: 1 } },
      { id: 'v5o2', label: 'Um laboratório, uma planilha, um código', weights: { analytical: 2, technical: 1 } },
      { id: 'v5o3', label: 'Um espaço de acolhimento e escuta', weights: { caregiving: 2, spiritual: 1 } },
      { id: 'v5o4', label: 'Uma mesa de decisões e estratégia', weights: { leadership: 2, entrepreneurial: 1 } },
    ],
  },
  {
    id: 'v6',
    prompt: 'O legado que você quer deixar é...',
    options: [
      { id: 'v6o1', label: 'Obras que emocionam', weights: { creative: 2, artisan: 1 } },
      { id: 'v6o2', label: 'Pessoas formadas e inspiradas', weights: { educator: 2, leadership: 1 } },
      { id: 'v6o3', label: 'Um negócio ou solução que perdura', weights: { entrepreneurial: 2, technical: 1 } },
      { id: 'v6o4', label: 'Vidas curadas e despertas', weights: { caregiving: 2, spiritual: 1 } },
    ],
  },
  {
    id: 'v7',
    prompt: 'Quando perde a noção do tempo, é fazendo...',
    options: [
      { id: 'v7o1', label: 'Algo manual e detalhado', weights: { artisan: 2, creative: 1 } },
      { id: 'v7o2', label: 'Pesquisa e raciocínio', weights: { analytical: 2, educator: 1 } },
      { id: 'v7o3', label: 'Conversas profundas', weights: { communication: 2, spiritual: 1 } },
      { id: 'v7o4', label: 'Planejando o próximo passo', weights: { entrepreneurial: 2, leadership: 1 } },
    ],
  },
];

const ALL_KEYS = Object.keys(VOCATION_INFO) as VocationKey[];

const EMPTY_IKIGAI: IkigaiAnswers = { loves: '', goodAt: '', worldNeeds: '', paidFor: '' };

/**
 * Score vocational answers (questionId -> optionId) and attach the Ikigai
 * reflection. Returns callings ranked descending (top scores first).
 */
export function scoreVocational(
  answers: Record<string, string>,
  ikigai: IkigaiAnswers = EMPTY_IKIGAI
): VocationalResult {
  const scores = ALL_KEYS.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<VocationKey, number>
  );

  for (const question of VOCATIONAL_QUESTIONS) {
    const optionId = answers?.[question.id];
    if (!optionId) continue;
    const option = question.options.find((o) => o.id === optionId);
    if (!option) continue;
    for (const [key, weight] of Object.entries(option.weights)) {
      scores[key as VocationKey] += weight ?? 0;
    }
  }

  const callings = ALL_KEYS.map((key) => ({
    key,
    name: VOCATION_INFO[key].name,
    score: scores[key],
  }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    callings,
    ikigai: { ...EMPTY_IKIGAI, ...ikigai },
  };
}
