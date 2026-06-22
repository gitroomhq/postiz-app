'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bodySlideNodes,
  type AspectRatio,
  type Carousel,
  type CarouselNode,
  type SlideBackground,
  type SlideLayout,
  type TemplateSlot,
} from '@gitroom/carousel-engine';
import {
  clearBrandDefaults,
  createNewCarousel,
  hasBrandDefaults,
  loadDoc,
  loadFavoriteFonts,
  saveBrandDefaults,
  saveDoc,
  toggleFavoriteFont,
} from './carousel-store';

const HISTORY_LIMIT = 50;

/**
 * Estado do documento de carrossel — persistência localStorage-first (Fase 1 do
 * motor, sem backend) via carousel-store. Toda mutação passa por aqui e é salva
 * com debounce (atualizando o índice por cliente). O `doc.id` é a chave canônica
 * (= `?id=` da URL = chave do localStorage), por isso normalizamos docs legados.
 *
 * History stack: `past` (últimas 50 versões) + `future` para undo/redo.
 */
export function useCarouselDoc(id: string, crmClientId: string | null = null) {
  const [doc, setDocRaw] = useState<Carousel>(() => {
    const stored = loadDoc(id);
    if (stored) return stored.id === id ? stored : { ...stored, id };
    return createNewCarousel(crmClientId, id);
  });
  const [past, setPast] = useState<Carousel[]>([]);
  const [future, setFuture] = useState<Carousel[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [useAsDefault, setUseAsDefaultState] = useState(() => hasBrandDefaults(crmClientId));
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(() => loadFavoriteFonts(crmClientId));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // persiste com debounce a cada mudança (e mantém o brand padrão DO PROJETO sincronizado se ativo)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDoc(doc);
      if (hasBrandDefaults(crmClientId)) saveBrandDefaults(crmClientId, doc.brand);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, crmClientId]);

  /**
   * Setter interno: toda mutação que deve entrar no history passa por aqui.
   * `skipHistory` é usado por undo/redo para não criar entradas em loop.
   */
  const setDoc = useCallback(
    (updater: Carousel | ((prev: Carousel) => Carousel), skipHistory = false) => {
      setDocRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (!skipHistory) {
          setPast((p) => {
            const capped = p.length >= HISTORY_LIMIT ? p.slice(1) : p;
            return [...capped, prev];
          });
          setFuture([]);
        }
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      const newPast = p.slice(0, -1);
      setDocRaw((current) => {
        setFuture((f) => [...f, current]);
        return prev;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      const newFuture = f.slice(0, -1);
      setDocRaw((current) => {
        setPast((p) => {
          const capped = p.length >= HISTORY_LIMIT ? p.slice(1) : p;
          return [...capped, current];
        });
        return next;
      });
      return newFuture;
    });
  }, []);

  /** Liga/desliga "usar este brand como padrão em novos carrosséis DESTE projeto". */
  const setUseAsDefault = useCallback(
    (on: boolean) => {
      setUseAsDefaultState(on);
      if (on) saveBrandDefaults(crmClientId, doc.brand);
      else clearBrandDefaults(crmClientId);
    },
    [doc.brand, crmClientId]
  );

  /** Marca/desmarca uma fonte como favorita DESTE projeto (só destaque no seletor). */
  const toggleFavoriteFontFamily = useCallback(
    (font: string) => {
      setFavoriteFonts(toggleFavoriteFont(crmClientId, font));
    },
    [crmClientId]
  );

  const updateNode = useCallback(
    (slideIndex: number, nodeId: string, patch: Partial<CarouselNode>) => {
      setDoc((prev) => {
        const slides = prev.slides.map((slide, i) => {
          if (i !== slideIndex) return slide;
          return {
            ...slide,
            nodes: slide.nodes.map((n) =>
              n.id === nodeId ? ({ ...n, ...patch } as CarouselNode) : n
            ),
          };
        });
        return { ...prev, slides };
      });
    },
    [setDoc]
  );

  const updateBrand = useCallback((patch: Partial<Carousel['brand']>) => {
    setDoc((prev) => ({ ...prev, brand: { ...prev.brand, ...patch } }));
  }, [setDoc]);

  const setAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    setDoc((prev) => ({ ...prev, aspectRatio }));
  }, [setDoc]);

  const updateSlideBackground = useCallback(
    (slideIndex: number, patch: Partial<SlideBackground>) => {
      setDoc((prev) => ({
        ...prev,
        slides: prev.slides.map((slide, i) =>
          i === slideIndex
            ? { ...slide, background: { ...slide.background, ...patch } }
            : slide
        ),
      }));
    },
    [setDoc]
  );

  /**
   * Troca o fundo de um slide reajustando a cor base dos textos para garantir
   * contraste: fundo 'light' → texto na cor escura da marca; 'image'/'dark'/'grad'
   * → texto branco. As cores de palavra (word-accent nos runs) são preservadas.
   * Usado ao aplicar/remover imagem num slot (evita texto escuro sobre foto).
   */
  const setSlideBackgroundContrast = useCallback(
    (slideIndex: number, patch: Partial<SlideBackground>) => {
      setDoc((prev) => ({
        ...prev,
        slides: prev.slides.map((slide, i) => {
          if (i !== slideIndex) return slide;
          const background = { ...slide.background, ...patch };
          const fill = background.kind === 'light' ? prev.brand.bgDark : '#FFFFFF';
          const nodes = slide.nodes.map((n) =>
            n.kind === 'text' ? { ...n, fill } : n
          );
          return { ...slide, background, nodes };
        }),
      }));
    },
    [setDoc]
  );

  /**
   * Aplica uma cor de fundo a todos os slides do mesmo tom (`kind`) — recolore só
   * os slides 'light' OU só os 'dark', preservando o contraste do texto baked.
   */
  const setAllSlidesColor = useCallback((color: string, kind: 'light' | 'dark') => {
    setDoc((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.background.kind === kind
          ? { ...slide, background: { ...slide.background, color } }
          : slide
      ),
    }));
  }, [setDoc]);

  const patchDoc = useCallback((patch: Partial<Carousel>) => {
    setDoc((prev) => ({ ...prev, ...patch }));
  }, [setDoc]);

  /**
   * Troca a diagramação (vocabulário de slide, Fase 1) de um slide interno e
   * recalcula seus nós a partir do conteúdo atual (texto dos nós existentes vira
   * title/body de entrada). Capa e CTA não usam `layout` — só slides internos.
   */
  const setSlideLayout = useCallback(
    (slideIndex: number, layout: SlideLayout) => {
      setDoc((prev) => {
        const slide = prev.slides[slideIndex];
        if (!slide) return prev;
        const textNodes = slide.nodes.filter((n) => n.kind === 'text');
        const plain = (n: (typeof textNodes)[number] | undefined) =>
          n ? n.runs.map((r) => r.text).join('') : undefined;
        const content = { title: plain(textNodes[0]), body: plain(textNodes[1]) };
        // 'image' não ocorre em slides internos (capa não tem layout) — fallback 'dark'
        const bgKind = slide.background.kind === 'image' ? 'dark' : slide.background.kind;
        const slot: TemplateSlot = { kind: bgKind, role: slide.role, tag: slide.tag ?? '' };
        const nodes = bodySlideNodes(slot, content, prev.brand, prev.aspectRatio, layout);
        return {
          ...prev,
          slides: prev.slides.map((s, i) =>
            i === slideIndex ? { ...s, layout, nodes } : s
          ),
        };
      });
    },
    [setDoc]
  );

  const duplicateSlide = useCallback((index: number) => {
    setDoc((prev) => {
      const slide = prev.slides[index];
      if (!slide) return prev;
      const copy = { ...slide, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      const slides = [...prev.slides.slice(0, index + 1), copy, ...prev.slides.slice(index + 1)];
      return { ...prev, slides };
    });
    setActiveSlide(index + 1);
  }, [setDoc]);

  const deleteSlide = useCallback((index: number) => {
    setDoc((prev) => {
      if (prev.slides.length <= 1) return prev;
      const slides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides };
    });
    setActiveSlide((prev) => Math.min(prev, Math.max(0, index - 1)));
  }, [setDoc]);

  /** Liga/desliga a identidade da marca (avatar+nome+@+copyright) só num slide. */
  const toggleSlideBrandFields = useCallback((index: number) => {
    setDoc((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i === index ? { ...slide, hideBrandFields: !slide.hideBrandFields } : slide
      ),
    }));
  }, [setDoc]);

  /** Liga/desliga o rodapé (barra de progresso + paginação) só num slide. */
  const toggleSlideFooter = useCallback((index: number) => {
    setDoc((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i === index ? { ...slide, hideFooter: !slide.hideFooter } : slide
      ),
    }));
  }, [setDoc]);

  /** Liga/desliga o número decorativo gigante de fundo só num slide. */
  const toggleSlideBgNumber = useCallback((index: number) => {
    setDoc((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i === index ? { ...slide, hideBgNumber: !slide.hideBgNumber } : slide
      ),
    }));
  }, [setDoc]);

  const reorderSlide = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setDoc((prev) => {
      const slides = [...prev.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return { ...prev, slides };
    });
    setActiveSlide(toIndex);
  }, [setDoc]);

  /** Substitui o doc inteiro (ex: aplicar autofill ou template). Sempre entra no history. */
  const replaceDoc = useCallback((next: Carousel) => {
    setDoc(next);
    setActiveSlide(0);
    setSelectedNodeId(null);
  }, [setDoc]);

  /** Substitui o doc sem registro no history (usado por undo/redo). */
  const replaceDocSilent = useCallback((next: Carousel) => {
    setDocRaw(next);
    setActiveSlide(0);
    setSelectedNodeId(null);
  }, []);

  return {
    doc,
    past,
    future,
    undo,
    redo,
    activeSlide,
    setActiveSlide,
    selectedNodeId,
    setSelectedNodeId,
    updateNode,
    updateBrand,
    setAspectRatio,
    updateSlideBackground,
    setSlideBackgroundContrast,
    setAllSlidesColor,
    setSlideLayout,
    patchDoc,
    replaceDoc,
    replaceDocSilent,
    duplicateSlide,
    deleteSlide,
    reorderSlide,
    toggleSlideBrandFields,
    toggleSlideFooter,
    toggleSlideBgNumber,
    useAsDefault,
    setUseAsDefault,
    favoriteFonts,
    toggleFavoriteFontFamily,
  };
}
