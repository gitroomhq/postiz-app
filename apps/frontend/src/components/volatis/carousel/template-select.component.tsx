'use client';

import { X, FileStack, Sparkles } from 'lucide-react';
import { CAROUSEL_TEMPLATES, FUNNEL_LABELS, type CarouselTemplate } from '@gitroom/carousel-engine';

/**
 * Modal de seleção de template (Fase 3) — aparece ao criar um novo carrossel
 * ("Novo carrossel" sempre pergunta, decisão Felipe 2026-06-19). Mostra os
 * modelos curados por funil (Fase 2) + "Começar em branco" (comportamento
 * antigo, preservado). Inspirado na referência BD, atmosfera Vocaccio.
 */
interface TemplateSelectModalProps {
  onSelect: (template: CarouselTemplate | null) => void;
  onClose: () => void;
}

export const TemplateSelectModal = ({ onSelect, onClose }: TemplateSelectModalProps) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-[24px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-[560px] max-h-[88vh] rounded-[16px] bg-newBgColorInner border border-newBorder overflow-hidden">
        <div className="flex items-center gap-[10px] px-[20px] h-[58px] shrink-0 border-b border-newBorder">
          <span
            className="grid place-items-center w-[30px] h-[30px] rounded-[9px] text-white"
            style={{ background: 'var(--voc-aurora)' }}
          >
            <FileStack size={16} />
          </span>
          <span className="text-[14px] font-[800] flex-1">Novo carrossel — escolher template</span>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center w-[30px] h-[30px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[10px]">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] border border-dashed border-newBorder text-left transition-colors hover:bg-boxHover"
          >
            <span className="grid place-items-center w-[34px] h-[34px] rounded-[9px] shrink-0 text-textItemBlur bg-newBgColor border border-newBorder">
              <Sparkles size={16} />
            </span>
            <div className="flex flex-col gap-[2px] min-w-0">
              <span className="text-[13px] font-[700]">Começar em branco</span>
              <span className="text-[11px] text-textItemBlur leading-[1.4]">
                Estrutura padrão (alternado claro/escuro) — você decide a diagramação depois.
              </span>
            </div>
          </button>

          <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-textItemBlur mt-[6px]">
            Modelos por funil
          </span>
          {CAROUSEL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl)}
              className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] border border-newBorder text-left transition-colors hover:bg-boxHover"
            >
              <div className="flex gap-[2px] shrink-0">
                {tpl.slots.map((slot, i) => (
                  <div
                    key={i}
                    className="rounded-[2px]"
                    style={{
                      width: '8px',
                      height: '16px',
                      background:
                        slot.kind === 'image'
                          ? '#555'
                          : slot.kind === 'dark'
                          ? '#1a1a1a'
                          : slot.kind === 'grad'
                          ? 'linear-gradient(135deg,#cf6295,#7b6cf6)'
                          : '#f0ede8',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-[2px] min-w-0">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[13px] font-[700]">{tpl.name}</span>
                  <span
                    className="text-[9px] font-[800] px-[5px] py-[1px] rounded-full uppercase tracking-wide"
                    style={{ background: 'rgba(207,98,149,0.15)', color: 'var(--voc-rose)' }}
                  >
                    {FUNNEL_LABELS[tpl.funnel]}
                  </span>
                  <span className="text-[10px] text-textItemBlur">{tpl.slots.length} slides</span>
                </div>
                <span className="text-[11px] text-textItemBlur leading-[1.4]">{tpl.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
