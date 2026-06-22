'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import type Konva from 'konva';
import { STAGE_WIDTH, slideToDataUrl } from '@gitroom/carousel-engine';
import type { Carousel } from '@gitroom/carousel-engine';

interface InstagramPreviewProps {
  doc: Carousel;
  thumbRefs: React.MutableRefObject<(Konva.Stage | null)[]>;
  onClose: () => void;
}

/** Mock de preview do Instagram usando as imagens capturadas dos stages Konva. */
export function CarouselInstagramPreview({ doc, thumbRefs, onClose }: InstagramPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Captura os slides como dataURL ao abrir
  useEffect(() => {
    const urls = thumbRefs.current
      .filter((s): s is Konva.Stage => !!s)
      .map((stage) => slideToDataUrl(stage, STAGE_WIDTH));
    setSlides(urls);
    setCapturing(false);
  }, [thumbRefs]);

  // Fecha com Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentSlide((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentSlide((i) => Math.min((slides.length || 1) - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, slides.length]);

  const prev = useCallback(() => setCurrentSlide((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrentSlide((i) => Math.min(slides.length - 1, i + 1)), [slides.length]);

  // Avatar do brand (se não tiver, usa inicial)
  const handle = doc.brand.handle || '@marca';
  const brandName = doc.brand.brandName || 'Marca';
  const avatarUrl = doc.brand.avatarUrl;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Botão fechar */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[20px] right-[20px] grid place-items-center w-[40px] h-[40px] rounded-full text-white hover:bg-white/10 transition-colors z-[110]"
        title="Fechar (Esc)"
      >
        <X size={22} />
      </button>

      {/* Card do post IG */}
      <div
        className="relative flex flex-col rounded-[8px] overflow-hidden"
        style={{
          background: '#000',
          width: 'min(420px, 92vw)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header do post */}
        <div className="flex items-center gap-[10px] px-[14px] py-[12px]" style={{ background: '#000' }}>
          {/* Avatar */}
          <div
            className="w-[36px] h-[36px] rounded-full shrink-0 overflow-hidden grid place-items-center text-white text-[14px] font-bold"
            style={{
              background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{brandName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white text-[13px] font-semibold leading-none truncate">{brandName}</span>
            <span className="text-white/50 text-[11px] leading-none mt-[2px] truncate">{handle}</span>
          </div>
          {/* Três pontos */}
          <div className="ml-auto flex gap-[3px] items-center">
            {[0,1,2].map((i) => (
              <span key={i} className="w-[4px] h-[4px] rounded-full bg-white/60" />
            ))}
          </div>
        </div>

        {/* Área de imagem do slide */}
        <div className="relative" style={{ background: '#111' }}>
          {capturing ? (
            <div className="flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
              <span className="text-white/40 text-[13px]">Capturando slides…</span>
            </div>
          ) : slides.length > 0 ? (
            <>
              {/* Imagem */}
              <div className="relative overflow-hidden" style={{ aspectRatio: doc.aspectRatio === '9:16' ? '9/16' : '4/5' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slides[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Setas de navegação */}
                {currentSlide > 0 && (
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-[10px] top-1/2 -translate-y-1/2 grid place-items-center w-[32px] h-[32px] rounded-full text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {currentSlide < slides.length - 1 && (
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 grid place-items-center w-[32px] h-[32px] rounded-full text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {/* Dots indicadores */}
              {slides.length > 1 && (
                <div className="absolute bottom-[10px] left-0 right-0 flex justify-center gap-[5px]">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentSlide(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentSlide ? '16px' : '6px',
                        height: '6px',
                        background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.45)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Contador de slides (canto superior direito) */}
              {slides.length > 1 && (
                <div
                  className="absolute top-[10px] right-[10px] text-white text-[12px] font-semibold px-[8px] py-[3px] rounded-full"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  {currentSlide + 1}/{slides.length}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
              <span className="text-white/40 text-[13px]">Sem slides para exibir</span>
            </div>
          )}
        </div>

        {/* Ações do IG */}
        <div className="px-[14px] pt-[10px] pb-[4px]" style={{ background: '#000' }}>
          <div className="flex items-center gap-[14px]">
            <Heart size={24} className="text-white cursor-pointer hover:text-red-500 transition-colors" />
            <MessageCircle size={24} className="text-white cursor-pointer hover:text-white/70 transition-colors" />
            <Send size={22} className="text-white cursor-pointer hover:text-white/70 transition-colors" />
            <Bookmark size={22} className="text-white cursor-pointer hover:text-white/70 transition-colors ml-auto" />
          </div>
        </div>

        {/* Curtidas mock */}
        <div className="px-[14px] py-[4px]" style={{ background: '#000' }}>
          <span className="text-white text-[13px] font-semibold">1.247 curtidas</span>
        </div>

        {/* Legenda */}
        <div className="px-[14px] pb-[12px]" style={{ background: '#000' }}>
          <p className="text-white text-[13px] leading-[1.4] line-clamp-2">
            <span className="font-semibold">{brandName}</span>
            {' '}
            <span className="text-white/80">{doc.title || 'Carrossel sem título'} ✨</span>
          </p>
          <p className="text-white/50 text-[12px] mt-[4px] uppercase tracking-wide">há 2 horas</p>
        </div>
      </div>

      {/* Hint de navegação */}
      <div className="absolute bottom-[24px] left-0 right-0 flex justify-center">
        <span className="text-white/30 text-[11px]">← → para navegar · Esc para fechar</span>
      </div>
    </div>
  );
}
