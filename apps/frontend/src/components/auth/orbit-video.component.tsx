'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Fundo de vídeo (loop boomerang, sem áudio) + palavras flutuantes em CSS puro
 * — substitui o TestimonialComponent (depoimentos reais do Postiz) na tela de
 * auth. As palavras ficam em componente/tradução, não gravadas no vídeo, pra
 * não travar tradução futura (ver docs/handoff-novo-design/vocaccio-system-design-final.md).
 *
 * Separado em dois componentes: o vídeo (OrbitVideoBackdrop) fica atrás de
 * TODA a tela — inclusive mobile, onde o card de login é translúcido por
 * cima dele — e as palavras (OrbitVideoWords) só aparecem no desktop
 * (espaço lateral dedicado; no mobile ficariam ilegíveis/poluídas).
 */

export const OrbitVideoBackdrop = () => (
  <video
    className="absolute inset-0 h-full w-full object-cover opacity-70"
    src="/auth/vocaccio-orbit-bg.mp4"
    autoPlay
    loop
    muted
    playsInline
  />
);

interface FloatingWord {
  key: string;
  fallback: string;
  top: string;
  left: string;
  delay: string;
  duration: string;
}

const WORDS: FloatingWord[] = [
  { key: 'orbit_word_authenticity', fallback: 'Autenticidade', top: '12%', left: '10%', delay: '0s', duration: '26s' },
  { key: 'orbit_word_insights', fallback: 'Insights', top: '22%', left: '68%', delay: '2.4s', duration: '27s' },
  { key: 'orbit_word_presence', fallback: 'Presença', top: '78%', left: '14%', delay: '4.8s', duration: '25s' },
  { key: 'orbit_word_community', fallback: 'Comunidade', top: '85%', left: '58%', delay: '7.2s', duration: '28s' },
  { key: 'orbit_word_growth', fallback: 'Growth', top: '8%', left: '42%', delay: '9.6s', duration: '24s' },
  { key: 'orbit_word_crm', fallback: 'CRM', top: '48%', left: '6%', delay: '12s', duration: '26s' },
  { key: 'orbit_word_automation', fallback: 'Automação', top: '55%', left: '74%', delay: '14.4s', duration: '29s' },
  { key: 'orbit_word_engagement', fallback: 'Engajamento', top: '35%', left: '20%', delay: '16.8s', duration: '25s' },
  { key: 'orbit_word_soul2soul', fallback: 'Soul 2 Soul', top: '65%', left: '38%', delay: '19.2s', duration: '30s' },
  { key: 'orbit_word_self_knowledge', fallback: 'Autoconhecimento', top: '18%', left: '80%', delay: '21.6s', duration: '27s' },
  { key: 'orbit_word_strategy', fallback: 'Estratégia', top: '40%', left: '52%', delay: '24s', duration: '26s' },
];

export const OrbitVideoWords = () => {
  const t = useT();

  return (
    <div className="relative flex-1 w-full my-[30px] max-w-[850px]">
      {WORDS.map((word) => (
        <span
          key={word.key}
          className="voc-orbit-word absolute text-[11px] font-[700] uppercase tracking-[0.14em] text-white/80"
          style={{
            top: word.top,
            left: word.left,
            animationDelay: word.delay,
            animationDuration: word.duration,
          }}
        >
          {t(word.key, word.fallback)}
        </span>
      ))}
    </div>
  );
};
