'use client';

import { FC } from 'react';

/**
 * Órbita Vocaccio — fundo decorativo sutil do Dashboard mágico. CSS puro (sem
 * deps): anéis elípticos concêntricos com pequenos planetas orbitando em ritmos
 * diferentes, nas cores aurora. Baixíssima opacidade para não competir com o
 * conteúdo. `pointer-events-none` + aria-hidden — puramente estético.
 */
export const HubOrbitBackground: FC = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 overflow-hidden"
    style={{ zIndex: 0 }}
  >
    <div className="voc-orbit-system">
      <div className="voc-orbit voc-orbit-1">
        <span className="voc-planet" style={{ background: 'var(--voc-peach)' }} />
      </div>
      <div className="voc-orbit voc-orbit-2">
        <span className="voc-planet" style={{ background: 'var(--voc-rose)' }} />
      </div>
      <div className="voc-orbit voc-orbit-3">
        <span className="voc-planet" style={{ background: 'var(--voc-violet)' }} />
      </div>
      <div className="voc-orbit voc-orbit-4">
        <span className="voc-planet" style={{ background: 'var(--voc-blue)' }} />
      </div>
      <div className="voc-orbit-core" />
    </div>

    <style>{`
      .voc-orbit-system {
        position: absolute;
        top: 50%;
        right: -180px;
        transform: translateY(-50%);
        width: 900px;
        height: 900px;
        opacity: 0.5;
      }
      .voc-orbit {
        position: absolute;
        top: 50%;
        left: 50%;
        border-radius: 50%;
        border: 1px solid rgba(115, 96, 170, 0.14);
        transform: translate(-50%, -50%);
        animation-name: voc-orbit-spin;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .voc-orbit-1 { width: 300px;  height: 300px;  animation-duration: 38s; }
      .voc-orbit-2 { width: 480px;  height: 480px;  animation-duration: 64s; }
      .voc-orbit-3 { width: 680px;  height: 680px;  animation-duration: 96s;  animation-direction: reverse; }
      .voc-orbit-4 { width: 880px;  height: 880px;  animation-duration: 140s; }
      .voc-planet {
        position: absolute;
        top: -5px;
        left: 50%;
        width: 10px;
        height: 10px;
        margin-left: -5px;
        border-radius: 50%;
        box-shadow: 0 0 16px 2px currentColor;
        opacity: 0.85;
      }
      .voc-orbit-core {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 120px;
        height: 120px;
        margin: -60px 0 0 -60px;
        border-radius: 50%;
        background: var(--voc-aurora);
        filter: blur(38px);
        opacity: 0.42;
        animation: voc-core-pulse 9s ease-in-out infinite;
      }
      @keyframes voc-orbit-spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes voc-core-pulse {
        0%, 100% { opacity: 0.34; transform: scale(1); }
        50%      { opacity: 0.5;  transform: scale(1.12); }
      }
      @media (prefers-reduced-motion: reduce) {
        .voc-orbit, .voc-orbit-core { animation: none; }
      }
    `}</style>
  </div>
);
