// Canonical theme vocabulary for the Religare interpretive engine.
// Every fragment (astrology, tzolkin, archetypes, vocational) tags itself with
// these themes; the convergence across tools drives the integrative synthesis.

import { ThemeKey } from './types';

export const THEME_LABELS: Record<ThemeKey, string> = {
  comunicacao: 'Comunicação',
  lideranca: 'Liderança',
  criacao: 'Criação',
  estrategia: 'Estratégia',
  servico: 'Serviço',
  introspeccao: 'Introspecção',
  conexao: 'Conexão',
  transformacao: 'Transformação',
  ensino: 'Ensino',
  liberdade: 'Liberdade',
  estrutura: 'Estrutura',
  intuicao: 'Intuição',
};

export const ALL_THEMES = Object.keys(THEME_LABELS) as ThemeKey[];

/** Short PT phrase per theme, used to weave the integrative narrative. */
export const THEME_PHRASE: Record<ThemeKey, string> = {
  comunicacao: 'a vocação de comunicar e dar voz às ideias',
  lideranca: 'a tendência natural a liderar e assumir a frente',
  criacao: 'o impulso de criar e dar forma ao novo',
  estrategia: 'a mente estratégica que enxerga padrões e caminhos',
  servico: 'o chamado ao cuidado e ao serviço ao outro',
  introspeccao: 'a profundidade introspectiva e a vida interior',
  conexao: 'a capacidade de criar vínculos e conexão genuína',
  transformacao: 'a força de transformar e catalisar mudança',
  ensino: 'a inclinação a ensinar e formar pessoas',
  liberdade: 'a busca por liberdade e novos horizontes',
  estrutura: 'o senso de ordem, estrutura e responsabilidade',
  intuicao: 'a intuição e a sensibilidade ao invisível',
};
