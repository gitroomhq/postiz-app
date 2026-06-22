// Tzolkin fragment bank — one fragment per seal (20) and per tone (13), indexed
// by the sealIndex / toneIndex carried in KinResult. Reuses SEALS/TONES names.

import { SEALS, TONES } from '../tzolkin';
import { Fragment, ThemeKey } from '../types';

interface SealTrait {
  essence: string;
  tags: Partial<Record<ThemeKey, number>>;
}

// Index-aligned with SEALS in tzolkin.ts.
const SEAL_TRAITS: SealTrait[] = [
  { essence: 'nutre e dá origem — guarda o começo das coisas', tags: { servico: 1, criacao: 1 } }, // Dragão
  { essence: 'comunica e inspira — leva a palavra e o sopro adiante', tags: { comunicacao: 2 } }, // Vento
  { essence: 'sonha e abundância — acessa o intuitivo e o profundo', tags: { intuicao: 1, introspeccao: 1 } }, // Noite
  { essence: 'faz florescer — cultiva potencial e o leva a crescer', tags: { criacao: 1, ensino: 1 } }, // Semente
  { essence: 'instinto e força vital — move pelo corpo e pelo desejo', tags: { transformacao: 1, conexao: 1 } }, // Serpente
  { essence: 'faz a ponte — conecta mundos e iguala as pessoas', tags: { conexao: 2 } }, // Transformador
  { essence: 'realiza e cura — age com as mãos e conclui', tags: { servico: 1, transformacao: 1 } }, // Veado (Mão)
  { essence: 'embeleza e harmoniza — cria arte e elegância', tags: { criacao: 2 } }, // Estrela
  { essence: 'purifica e flui — sente a emoção como água', tags: { intuicao: 1, introspeccao: 1 } }, // Lua
  { essence: 'ama e é leal — fortalece os laços de coração', tags: { conexao: 2 } }, // Cão
  { essence: 'brinca e encanta — cria magia pela leveza', tags: { criacao: 1, comunicacao: 1 } }, // Macaco
  { essence: 'tem sabedoria e livre-arbítrio — influencia pelo entendimento', tags: { intuicao: 1, ensino: 1 } }, // Humano
  { essence: 'explora e expande — atravessa espaços e desperta', tags: { liberdade: 2 } }, // Andarilho Celeste
  { essence: 'encanta o tempo — recebe e irradia receptividade', tags: { intuicao: 2 } }, // Mago
  { essence: 'tem visão ampla — enxerga o todo e antecipa', tags: { estrategia: 2 } }, // Águia
  { essence: 'é inteligência destemida — questiona e abre caminho', tags: { lideranca: 1, transformacao: 1 } }, // Guerreiro
  { essence: 'navega pela sincronicidade — sintoniza com a vida', tags: { conexao: 1, intuicao: 1 } }, // Terra
  { essence: 'reflete e ordena — revela a verdade sem ilusão', tags: { introspeccao: 2 } }, // Espelho
  { essence: 'gera transformação — catalisa e renova por dentro', tags: { transformacao: 2 } }, // Tempestade
  { essence: 'ilumina e dá vida — irradia consciência', tags: { lideranca: 1, transformacao: 1 } }, // Sol
];

// Index-aligned with TONES in tzolkin.ts.
const TONE_TRAITS: SealTrait[] = [
  { essence: 'atrai o propósito', tags: { lideranca: 1 } }, // Magnético
  { essence: 'reconhece o desafio e a polaridade', tags: { introspeccao: 1 } }, // Lunar
  { essence: 'ativa pelo serviço', tags: { conexao: 1, servico: 1 } }, // Elétrico
  { essence: 'define a forma e a medida', tags: { estrutura: 1 } }, // Auto-Existente
  { essence: 'empodera e comanda o centro', tags: { lideranca: 1 } }, // Radiante
  { essence: 'organiza e equilibra', tags: { estrutura: 1 } }, // Rítmico
  { essence: 'sintoniza e canaliza', tags: { intuicao: 1 } }, // Ressonante
  { essence: 'harmoniza pela integridade', tags: { estrutura: 1, conexao: 1 } }, // Galático
  { essence: 'realiza a intenção', tags: { transformacao: 1 } }, // Solar
  { essence: 'manifesta e produz', tags: { criacao: 1 } }, // Planetário
  { essence: 'dissolve e liberta', tags: { liberdade: 1 } }, // Espectral
  { essence: 'dedica-se à cooperação', tags: { conexao: 1 } }, // Cristal
  { essence: 'transcende e perdura', tags: { transformacao: 1 } }, // Cósmico
];

export function sealFragment(sealIndex: number): Fragment {
  const t = SEAL_TRAITS[sealIndex] || SEAL_TRAITS[0];
  return {
    id: `tz-seal-${sealIndex}`,
    section: 'tzolkin',
    text: `Seu selo natal é o ${SEALS[sealIndex]}: ${t.essence}.`,
    tags: t.tags,
  };
}

export function toneFragment(toneIndex: number): Fragment {
  const t = TONE_TRAITS[toneIndex] || TONE_TRAITS[0];
  return {
    id: `tz-tone-${toneIndex}`,
    section: 'tzolkin',
    text: `Em tom ${TONES[toneIndex]}, esse pulso ${t.essence}.`,
    tags: t.tags,
  };
}
