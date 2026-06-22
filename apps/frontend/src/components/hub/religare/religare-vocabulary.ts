import type { ReligareContext } from './use-religare-context.hook';

export interface ReligareVocabulary {
  /** singular, ex. "expert" / "paciente" */
  person: string;
  /** plural, ex. "experts" / "pacientes" */
  persons: string;
  /** rótulo da ação de criar */
  newProfile: string;
  /** subtítulo da home */
  subtitle: string;
}

const VOCAB: Record<ReligareContext, ReligareVocabulary> = {
  agency: {
    person: 'expert',
    persons: 'experts',
    newProfile: 'Novo Religare',
    subtitle: 'A essência vocacional de cada expert da sua operação.',
  },
  therapy: {
    person: 'paciente',
    persons: 'pacientes',
    newProfile: 'Novo Religare',
    subtitle: 'A leitura de essência de cada paciente em acompanhamento.',
  },
};

export const vocabularyFor = (context: ReligareContext): ReligareVocabulary =>
  VOCAB[context] ?? VOCAB.agency;
