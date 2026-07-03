'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Send,
  CalendarClock,
  Image as ImageIcon,
  FileArchive,
  FileText,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  LayoutTemplate,
  Instagram,
  Save,
  Check,
  Copy,
  Trash2,
  Star,
  GripVertical,
  Download,
  ExternalLink,
} from 'lucide-react';
import type Konva from 'konva';
import {
  parsePairedText,
  countPairs,
  lintPairedText,
  buildCarousel,
  stageHeight,
  STAGE_WIDTH,
  CAROUSEL_FONTS,
  fontWeightsFor,
  FONT_WEIGHT_LABELS,
  type AspectRatio,
  type CarouselContent,
  type TextNode,
} from '@gitroom/carousel-engine';
import { SEQUENCES, SUPPORTED_SLIDE_COUNTS } from '@gitroom/carousel-engine';
import { CAROUSEL_TEMPLATES, FUNNEL_LABELS, type CarouselTemplate } from '@gitroom/carousel-engine';
import { useCarouselDoc } from './use-carousel-doc.hook';
import { useFontLoader } from './use-font-loader.hook';
import { useCarouselExport } from './use-carousel-export.hook';
import { useElementSize } from './use-element-size.hook';
import { CarouselStage } from './carousel-stage.component';
import { SlideThumbnail } from './slide-thumbnail.component';
import { toggleWordColor } from './rich-text.component';
import { useCarouselPublish } from './use-carousel-publish.hook';
import { saveDoc, setCover } from './carousel-store';
import { downloadBriefing } from './cedrico-briefing';
import { useClientExperts } from '@gitroom/frontend/components/hub/crm/use-experts.hook';
import { useProjects } from '@gitroom/frontend/components/hub/crm/use-projects.hook';
import { useProject } from '@gitroom/frontend/components/hub/crm/use-project.hook';
import { useCrmMutations } from '@gitroom/frontend/components/hub/crm/use-crm-mutations.hook';
import { CarouselInstagramPreview } from './carousel-instagram-preview.component';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** GPT público "Volatis | Gerador de Carrosséis Virais" (gera o texto colado abaixo). */
const VIRAL_GPT_URL =
  'https://chatgpt.com/g/g-6a34b66d8cd08191950cac600f531b14-volatis-gerador-de-carrosseis-virais';

interface EditorProps {
  carouselId: string;
  crmClientId?: string | null;
}

export const CarouselEditor = ({ carouselId, crmClientId = null }: EditorProps) => {
  const {
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
  } = useCarouselDoc(carouselId, crmClientId);

  // carrega todas as fontes do motor — qualquer escolha no painel Texto já vem rasterizável
  const families = useMemo(() => [...CAROUSEL_FONTS], []);
  const fontsReady = useFontLoader(families);

  // experts vinculados à marca (N:N) — p/ atribuir um ao carrossel
  const { data: clientExperts, mutate: reloadClientExperts } = useClientExperts(doc.crmClientId ?? null);
  const { createExpert, linkExpert } = useCrmMutations();
  const [newExpertName, setNewExpertName] = useState('');
  const [creatingExpert, setCreatingExpert] = useState(false);
  const selectedExpert = clientExperts?.find((e) => e.id === doc.expertId) ?? null;
  // Map the CRM expert into the briefing shape, surfacing the Religare reading.
  const briefingExpert = selectedExpert
    ? { ...selectedExpert, religareDna: selectedExpert.religareProfile?.dna ?? null }
    : null;

  // projetos da marca (cliente) ativo — p/ atribuir um ao carrossel
  const { data: clientProjects } = useProjects({ clientId: doc.crmClientId ?? undefined });
  // detalhe do projeto atribuído — alimenta a seção Marca do briefing
  const { data: selectedProject } = useProject(doc.projectId ?? null);

  const thumbRefs = useRef<(Konva.Stage | null)[]>([]);
  const { exportPng, exportZip, exportPdf, captureAll } = useCarouselExport(doc, thumbRefs);
  const { publish, publishing } = useCarouselPublish(captureAll, doc);

  const [autofillText, setAutofillText] = useState('');
  const [zoom, setZoom] = useState(100);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showIgPreview, setShowIgPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slideMenu, setSlideMenu] = useState<number | null>(null);
  // interação de texto: editar o conteúdo vs destacar palavras (clique muda cor)
  const [textMode, setTextMode] = useState<'edit' | 'highlight'>('edit');
  // cor do destaque de palavra — pode variar por slide/fundo (default = accent da marca)
  const [highlightColor, setHighlightColor] = useState<string>(doc.brand.primary);
  const dragIndexRef = useRef<number | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const handleSave = useCallback(() => {
    saveDoc(docRef.current);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  // Captura a capa (slide 0) p/ os cards da Galeria — debounce maior, best-effort.
  useEffect(() => {
    if (!fontsReady) return;
    const t = setTimeout(() => {
      try {
        const url = thumbRefs.current[0]?.toDataURL({
          pixelRatio: 1,
          mimeType: 'image/jpeg',
          quality: 0.7,
        });
        if (url) setCover(doc.crmClientId ?? null, doc.id, url);
      } catch {
        /* render ainda não pronto — ignora */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, fontsReady]);

  // Atalhos de teclado: Ctrl+Z, Ctrl+Y, Ctrl+=/-, Ctrl+0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      if (e.key === 's') { e.preventDefault(); handleSave(); }
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom((z) => Math.min(200, z + 10)); }
      if (e.key === '-') { e.preventDefault(); setZoom((z) => Math.max(25, z - 10)); }
      if (e.key === '0') { e.preventDefault(); setZoom(100); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo, handleSave]);

  const root = useElementSize<HTMLDivElement>();
  const ratioFactor = STAGE_WIDTH / stageHeight(doc.aspectRatio);
  const LEFT = 320;
  const RIGHT = 208;
  const TOOLBAR = 56;
  const centerWidth = root.width - LEFT - RIGHT - 2;
  const canvasAreaHeight = root.availableHeight - TOOLBAR;
  // Largura base (100%) — depois multiplicamos pelo zoom
  const canvasWidthBase = Math.max(
    220,
    Math.min(centerWidth - 48, (canvasAreaHeight - 48) * ratioFactor)
  );
  const canvasWidth = Math.round(canvasWidthBase * (zoom / 100));

  const ctaButton = doc.ctaButton
    ? { show: !!doc.ctaButton.show, label: doc.ctaButton.label ?? '' }
    : undefined;

  const slide = doc.slides[activeSlide];
  const selectedNode =
    slide?.nodes.find((n) => n.id === selectedNodeId && n.kind === 'text') as
      | TextNode
      | undefined;

  const pairCount = useMemo(() => countPairs(autofillText), [autofillText]);
  const lengthWarnings = useMemo(() => lintPairedText(autofillText), [autofillText]);

  const applyAutofill = () => {
    const content: CarouselContent = parsePairedText(autofillText);
    if (!content.headline) return;
    const next = buildCarousel({
      id: doc.id,
      title: content.headline.replace(/<\/?em>/g, '').slice(0, 60),
      crmClientId: doc.crmClientId,
      aspectRatio: doc.aspectRatio,
      brand: doc.brand,
      content,
    });
    // Preserva a evolução visual: reaplica as imagens de fundo que o usuário já
    // tinha posto (por índice de slide) e mantém o texto legível sobre elas.
    // Cores e campos globais (brand) já são preservados por buildCarousel.
    const mergedSlides = next.slides.map((slide, i) => {
      const prev = doc.slides[i];
      if (prev?.background.kind === 'image' && prev.background.imageUrl) {
        return {
          ...slide,
          background: {
            kind: 'image' as const,
            imageUrl: prev.background.imageUrl,
            overlay: prev.background.overlay ?? 0.55,
          },
          nodes: slide.nodes.map((n) => (n.kind === 'text' ? { ...n, fill: '#FFFFFF' } : n)),
        };
      }
      return slide;
    });
    replaceDoc({ ...next, slides: mergedSlides });
  };

  const applyTemplate = (count: number) => {
    // buildCarousel gera capa + internos + CTA = slides.length + 2
    // para N slides totais precisamos de N-2 slides internos
    const innerCount = Math.max(0, count - 2);
    const innerSlides: CarouselContent['slides'] = Array.from({ length: innerCount }, () => ({}));
    const next = buildCarousel({
      id: doc.id,
      title: doc.title,
      crmClientId: doc.crmClientId,
      aspectRatio: doc.aspectRatio,
      brand: doc.brand,
      content: {
        headline: doc.title || 'Novo Carrossel',
        slides: innerSlides,
        cta: doc.ctaButton?.label ?? 'Comenta GUIA',
      },
    });
    replaceDoc(next);
    setShowTemplates(false);
  };

  /** Aplica um template nomeado (estrutura curada: fundos + diagramação por slide). */
  const applyNamedTemplate = (template: CarouselTemplate) => {
    const innerCount = Math.max(0, template.slots.length - 2);
    const innerSlides: CarouselContent['slides'] = Array.from({ length: innerCount }, () => ({}));
    const next = buildCarousel({
      id: doc.id,
      title: doc.title,
      crmClientId: doc.crmClientId,
      aspectRatio: doc.aspectRatio,
      brand: doc.brand,
      content: {
        headline: doc.title || 'Novo Carrossel',
        slides: innerSlides,
        cta: doc.ctaButton?.label ?? 'Comenta GUIA',
      },
      sequence: template.slots,
    });
    replaceDoc(next);
    setShowTemplates(false);
  };

  const toggleWordAccent = (nodeId: string, runIndex: number, segIndex: number) => {
    // no modo "editar texto" o clique só seleciona — não colore palavras
    if (textMode === 'edit') return;
    const node = slide?.nodes.find((n) => n.id === nodeId && n.kind === 'text') as
      | TextNode
      | undefined;
    if (!node) return;
    const runs = toggleWordColor(node.runs, runIndex, segIndex, highlightColor || doc.brand.primary);
    updateNode(activeSlide, nodeId, { runs });
  };

  /** Texto puro do nó (runs concatenados) — base p/ a edição direta no painel. */
  const nodePlainText = (node: TextNode) => node.runs.map((r) => r.text).join('');

  /** Substitui o texto do nó por um run único (perde destaques deste nó). */
  const setNodeText = (nodeId: string, text: string) => {
    updateNode(activeSlide, nodeId, { runs: [{ text }] });
  };

  const onUploadAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateBrand({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  /** Cria um expert novo, já vinculado a esta marca, e atribui ao carrossel. */
  const onCreateExpert = async () => {
    const name = newExpertName.trim();
    if (!name || creatingExpert || !doc.crmClientId) return;
    setCreatingExpert(true);
    try {
      const created = await createExpert({ name });
      await linkExpert(doc.crmClientId, created.id);
      await reloadClientExperts();
      patchDoc({ expertId: created.id });
      setNewExpertName('');
    } finally {
      setCreatingExpert(false);
    }
  };

  return (
    <div ref={root.ref} className="flex flex-col flex-1 min-h-0 min-w-0 text-newTextColor overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-[12px] px-[20px] h-[56px] shrink-0 bg-newBgColorInner border-b border-newBorder">
        <Link
          href={`/hub/volatis/carrosseis${doc.crmClientId ? `?clientId=${doc.crmClientId}` : ''}`}
          title="Voltar à galeria"
          className="grid place-items-center w-[30px] h-[30px] rounded-[8px] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
        >
          <ArrowLeft size={17} />
        </Link>
        <span className="text-[15px] font-[700]">Volatis</span>
        <span className="text-[13px] font-[600] text-textItemBlur">| Gerador de Carrosséis Virais</span>
        <span className="text-[12px] text-textItemBlur truncate max-w-[280px]">{doc.title}</span>

        {/* Separador */}
        <div className="w-[1px] h-[28px] bg-newBorder shrink-0" />

        {/* Undo / Redo */}
        <ToolbarIconBtn
          onClick={undo}
          disabled={past.length === 0}
          title="Desfazer (Ctrl+Z)"
          active={past.length > 0}
        >
          <Undo2 size={16} />
        </ToolbarIconBtn>
        <ToolbarIconBtn
          onClick={redo}
          disabled={future.length === 0}
          title="Refazer (Ctrl+Y)"
          active={future.length > 0}
        >
          <Redo2 size={16} />
        </ToolbarIconBtn>

        {/* Separador */}
        <div className="w-[1px] h-[28px] bg-newBorder shrink-0" />

        {/* Zoom */}
        <ToolbarIconBtn onClick={() => setZoom((z) => Math.max(25, z - 10))} title="Reduzir zoom (Ctrl+-)">
          <ZoomOut size={16} />
        </ToolbarIconBtn>
        <button
          type="button"
          onClick={() => setZoom(100)}
          title="Resetar zoom (Ctrl+0)"
          className="text-[12px] font-[700] min-w-[44px] h-[28px] px-[6px] rounded-[8px] border border-newBorder bg-newBgColor hover:bg-boxHover transition-colors"
          style={{ color: zoom !== 100 ? 'var(--voc-rose)' : 'var(--new-textColor)' }}
        >
          {zoom}%
        </button>
        <ToolbarIconBtn onClick={() => setZoom((z) => Math.min(200, z + 10))} title="Ampliar zoom (Ctrl+=)">
          <ZoomIn size={16} />
        </ToolbarIconBtn>

        {/* Separador */}
        <div className="w-[1px] h-[28px] bg-newBorder shrink-0" />

        {/* Templates */}
        <ToolbarIconBtn
          onClick={() => setShowTemplates((v) => !v)}
          title="Seletor de templates"
          active={showTemplates}
        >
          <LayoutTemplate size={16} />
        </ToolbarIconBtn>

        {/* Preview IG */}
        <ToolbarIconBtn
          onClick={() => setShowIgPreview(true)}
          title="Preview Instagram"
          disabled={!fontsReady}
        >
          <Instagram size={16} />
        </ToolbarIconBtn>

        <div className="ml-auto flex items-center gap-[8px]">
          {!fontsReady && <span className="text-[11px] text-textItemBlur">carregando fontes…</span>}
          <button
            type="button"
            onClick={handleSave}
            title="Salvar (Ctrl+S)"
            className="flex items-center gap-[6px] h-[30px] px-[12px] rounded-[8px] text-[12px] font-[700] border transition-colors"
            style={
              saved
                ? { borderColor: 'var(--voc-rose)', color: 'var(--voc-rose)', background: 'rgba(207,98,149,0.08)' }
                : { borderColor: 'var(--new-border)', color: 'var(--new-textColor)', background: 'transparent' }
            }
          >
            {saved ? <Check size={13} /> : <Save size={13} />}
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
          <PublishExportMenu
            disabled={!fontsReady}
            publishing={publishing}
            onPostNow={() => publish('now')}
            onSchedule={() => publish('schedule')}
            onPng={() => exportPng(activeSlide)}
            onZip={exportZip}
            onPdf={exportPdf}
          />
        </div>
      </div>

      <div
        className="flex min-h-0 gap-[1px] bg-newBgLineColor overflow-hidden"
        style={{ height: Math.max(360, canvasAreaHeight) }}
      >
        {/* Painel esquerdo */}
        <aside className="w-[320px] shrink-0 overflow-y-auto p-[14px] flex flex-col gap-[10px] bg-newBgColorInner">
          {/* Painel de Templates (drawer inline) */}
          {showTemplates && (
            <div className="shrink-0 rounded-[12px] bg-newBgColor border border-newBorder overflow-hidden">
              <div className="flex items-center justify-between px-[14px] py-[11px] border-b border-newBorder">
                <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-newTextColor">Templates</span>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="text-[10px] text-textItemBlur hover:text-newTextColor transition-colors"
                >
                  Fechar
                </button>
              </div>
              <div className="p-[14px] flex flex-col gap-[8px]">
                <p className="text-[11px] text-textItemBlur leading-[1.5]">
                  Selecionar um template redefine os slides, preservando a identidade visual atual.
                </p>

                {/* Modelos curados por funil (Fase 2) */}
                <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-textItemBlur mt-[2px]">
                  Modelos
                </span>
                {CAROUSEL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyNamedTemplate(tpl)}
                    className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-[10px] border border-newBorder text-left transition-colors hover:bg-boxHover"
                  >
                    {/* mini preview dos slots do modelo */}
                    <div className="flex gap-[2px] shrink-0">
                      {tpl.slots.map((slot, i) => (
                        <div
                          key={i}
                          className="rounded-[2px]"
                          style={{
                            width: '8px',
                            height: '14px',
                            background:
                              slot.kind === 'image'
                                ? '#555'
                                : slot.kind === 'dark'
                                ? '#1a1a1a'
                                : slot.kind === 'grad'
                                ? 'linear-gradient(135deg,var(--voc-rose),var(--voc-violet))'
                                : '#f0ede8',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-[2px] min-w-0">
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[12px] font-[700] text-newTextColor">{tpl.name}</span>
                        <span
                          className="text-[9px] font-[800] px-[5px] py-[1px] rounded-full uppercase tracking-wide"
                          style={{ background: 'rgba(207,98,149,0.15)', color: 'var(--voc-rose)' }}
                        >
                          {FUNNEL_LABELS[tpl.funnel]}
                        </span>
                      </div>
                      <span className="text-[10px] text-textItemBlur leading-[1.4]">{tpl.description}</span>
                    </div>
                  </button>
                ))}

                <span className="text-[10px] font-[800] uppercase tracking-[0.1em] text-textItemBlur mt-[6px]">
                  Por nº de slides
                </span>
                {SUPPORTED_SLIDE_COUNTS.map((count) => {
                  const seq = SEQUENCES[count];
                  const darkCount = seq.filter((s) => s.kind === 'dark').length;
                  const lightCount = seq.filter((s) => s.kind === 'light').length;
                  const isCurrent = doc.slides.length === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => applyTemplate(count)}
                      className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-[10px] border text-left transition-colors hover:bg-boxHover"
                      style={
                        isCurrent
                          ? { borderColor: 'var(--voc-rose)', background: 'rgba(207,98,149,0.08)' }
                          : { borderColor: 'var(--new-border)', background: 'transparent' }
                      }
                    >
                      {/* Mini preview visual dos slots */}
                      <div className="flex gap-[2px] shrink-0">
                        {seq.map((slot, i) => (
                          <div
                            key={i}
                            className="rounded-[2px]"
                            style={{
                              width: '8px',
                              height: '14px',
                              background:
                                slot.kind === 'image'
                                  ? '#555'
                                  : slot.kind === 'dark'
                                  ? '#1a1a1a'
                                  : slot.kind === 'grad'
                                  ? 'linear-gradient(135deg,var(--voc-rose),var(--voc-violet))'
                                  : '#f0ede8',
                              border: '1px solid rgba(255,255,255,0.12)',
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col gap-[2px] min-w-0">
                        <div className="flex items-center gap-[6px]">
                          <span className="text-[12px] font-[700] text-newTextColor">{count} slides</span>
                          {isCurrent && (
                            <span
                              className="text-[9px] font-[800] px-[5px] py-[1px] rounded-full uppercase tracking-wide"
                              style={{ background: 'var(--voc-rose)', color: '#fff' }}
                            >
                              atual
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-textItemBlur">
                          {darkCount}× escuro · {lightCount}× claro
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Panel title="Conteúdo (IA)" defaultOpen>
            <p className="text-[11px] text-textItemBlur leading-[1.5]">
              Cole o texto gerado pelo <span className="text-newTextColor font-[700]">Volatis | Redator</span> (seu GPT).
              Cada slide usa 2 textos: ímpar = primário, par = secundário. O nº de pares define os slides.
            </p>
            <a
              href={VIRAL_GPT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Abre o Volatis | Redator no ChatGPT"
              className="flex items-center justify-center gap-[6px] text-[12px] font-[800] px-[12px] py-[9px] rounded-[10px] text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--voc-aurora)', boxShadow: '0 6px 16px rgba(207,98,149,0.26)' }}
            >
              <ExternalLink size={13} />
              Abrir o Redator (GPT)
            </a>
            <button
              type="button"
              onClick={() => downloadBriefing(doc, briefingExpert, selectedProject)}
              title="Baixa o DNA do Projeto (marca + experts) para anexar no Redator"
              className="flex items-center justify-center gap-[6px] text-[12px] font-[700] px-[12px] py-[8px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor hover:bg-boxHover transition-colors"
            >
              <Download size={13} />
              Exportar DNA do Projeto
            </button>
            <textarea
              value={autofillText}
              onChange={(e) => setAutofillText(e.target.value)}
              placeholder={'texto 1 - HEADLINE DA CAPA\ntexto 2 - subtítulo da capa\ntexto 3 - TÍTULO DO SLIDE 2\ntexto 4 - corpo do slide 2\n…\ntexto 17 - TÍTULO DO CTA\ntexto 18 - corpo + chamada à ação'}
              className="w-full h-[200px] resize-none text-[12px] leading-[1.5] p-[10px] rounded-[10px] bg-newBgColor border border-newBorder text-newTextColor placeholder:text-textItemBlur outline-none font-mono"
            />
            {pairCount > 0 && (
              <span className="text-[11px] font-[700]" style={{ color: 'var(--voc-rose)' }}>
                {pairCount} {pairCount === 1 ? 'slide' : 'slides'} ao aplicar
              </span>
            )}
            {lengthWarnings.length > 0 && (
              <div
                className="flex flex-col gap-[3px] rounded-[8px] px-[10px] py-[8px]"
                style={{ background: 'rgba(232,164,74,0.1)', border: '1px solid rgba(232,164,74,0.35)' }}
              >
                <span className="text-[11px] font-[800]" style={{ color: '#e8a44a' }}>
                  {lengthWarnings.length} {lengthWarnings.length === 1 ? 'texto pode' : 'textos podem'} transbordar
                </span>
                {lengthWarnings.slice(0, 5).map((w, i) => (
                  <span key={i} className="text-[10px] text-textItemBlur leading-[1.4]">
                    Slide {w.slide} ({w.role}): {w.chars} caracteres · alvo até {w.max}
                  </span>
                ))}
                {lengthWarnings.length > 5 && (
                  <span className="text-[10px] text-textItemBlur">+{lengthWarnings.length - 5} outros…</span>
                )}
              </div>
            )}
            <PrimaryButton onClick={applyAutofill}>Aplicar texto</PrimaryButton>
          </Panel>

          {doc.crmClientId && (
            <Panel title="Projeto / Marca">
              <p className="text-[11px] text-textItemBlur leading-[1.5]">
                Briefing de marca deste carrossel (opcional). Alimenta a seção Marca do DNA do Projeto
                exportado pro Redator.
              </p>
              <select
                value={doc.projectId ?? ''}
                onChange={(e) => patchDoc({ projectId: e.target.value || null })}
                className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
              >
                <option value="">Nenhum / não atribuído</option>
                {clientProjects?.items?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.businessArea ? ` · ${p.businessArea}` : ''}
                  </option>
                ))}
              </select>
              {selectedProject ? (
                <p className="text-[11px] font-[700] leading-[1.5]" style={{ color: 'var(--voc-rose)' }}>
                  ✦ Briefing de marca será incluído
                </p>
              ) : null}
            </Panel>
          )}

          {doc.crmClientId && (
            <Panel title="Expert">
              <p className="text-[11px] text-textItemBlur leading-[1.5]">
                Voz/autor deste carrossel (opcional). Alimenta o DNA do Projeto exportado pro Redator.
              </p>
              <select
                value={doc.expertId ?? ''}
                onChange={(e) => patchDoc({ expertId: e.target.value || null })}
                className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
              >
                <option value="">Nenhum / não atribuído</option>
                {clientExperts?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}{e.role ? ` · ${e.role}` : ''}
                  </option>
                ))}
              </select>
              {selectedExpert?.religareProfile?.dna ? (
                <p className="text-[11px] font-[700] leading-[1.5]" style={{ color: 'var(--voc-rose)' }}>
                  ✦ Leitura Religare será incluída no briefing
                </p>
              ) : selectedExpert?.religareProfile ? (
                <p className="text-[11px] text-textItemBlur leading-[1.5]">
                  Leitura Religare pendente — recalcule no módulo Religare.
                </p>
              ) : null}
              <div className="flex items-center gap-[6px]">
                <input
                  value={newExpertName}
                  onChange={(ev) => setNewExpertName(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') onCreateExpert();
                  }}
                  placeholder="Nome do novo expert"
                  className="flex-1 text-[12px] px-[10px] py-[7px] rounded-[9px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none placeholder:text-textItemBlur"
                />
                <button
                  type="button"
                  onClick={onCreateExpert}
                  disabled={!newExpertName.trim() || creatingExpert}
                  className="shrink-0 text-[12px] font-[700] px-[12px] py-[7px] rounded-[9px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--voc-rose)' }}
                >
                  + Criar
                </button>
              </div>
            </Panel>
          )}

          <Panel title="Campos Globais" defaultOpen>
            <Field
              label="@ handle"
              value={doc.brand.handle}
              onChange={(v) => updateBrand({ handle: v })}
              visible={doc.brand.showHandle !== false}
              onToggleVisible={() => updateBrand({ showHandle: doc.brand.showHandle === false })}
            />
            <Field
              label="Marca"
              value={doc.brand.brandName}
              onChange={(v) => updateBrand({ brandName: v })}
              visible={doc.brand.showBrandName !== false}
              onToggleVisible={() => updateBrand({ showBrandName: doc.brand.showBrandName === false })}
            />
            <Field
              label="Copyright"
              value={doc.brand.copyright}
              onChange={(v) => updateBrand({ copyright: v })}
              visible={doc.brand.showCopyright !== false}
              onToggleVisible={() => updateBrand({ showCopyright: doc.brand.showCopyright === false })}
            />

            {/* Avatar */}
            <div className="flex flex-col gap-[5px]">
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                Avatar
                <button
                  type="button"
                  onClick={() => updateBrand({ showAvatar: doc.brand.showAvatar === false })}
                  title={doc.brand.showAvatar !== false ? 'Ocultar nos slides' : 'Mostrar nos slides'}
                  className="grid place-items-center w-[22px] h-[22px] rounded-[6px] hover:bg-boxHover transition-colors"
                  style={{ color: doc.brand.showAvatar !== false ? 'var(--voc-rose)' : 'var(--new-textItemBlur)' }}
                >
                  {doc.brand.showAvatar !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </span>
              <div className="flex items-center gap-[10px]">
                <div className="w-[44px] h-[44px] shrink-0 rounded-[12px] overflow-hidden bg-newBgColorInner border border-newBorder grid place-items-center">
                  {doc.brand.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.brand.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-textItemBlur">—</span>
                  )}
                </div>
                <label className="flex-1 text-[13px] font-[700] px-[14px] py-[10px] rounded-[10px] text-center cursor-pointer border border-dashed border-newBorder text-textItemBlur hover:bg-boxHover hover:text-newTextColor transition-colors">
                  Trocar
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadAvatar(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <label className="flex items-center gap-[8px] cursor-pointer pt-[2px]">
              <input
                type="checkbox"
                checked={useAsDefault}
                onChange={(e) => setUseAsDefault(e.target.checked)}
                className="w-[16px] h-[16px] accent-[var(--voc-rose)] cursor-pointer"
              />
              <span className="text-[12px] text-textItemBlur">Usar como padrão p/ novos carrosséis deste projeto</span>
            </label>
          </Panel>

          <Panel title="Cores Globais">
            <ColorField label="Primária (accent)" value={doc.brand.primary} onChange={(v) => updateBrand({ primary: v })} />
            <ColorField label="Barra de topo" value={doc.brand.accentBar ?? doc.brand.primary} onChange={(v) => updateBrand({ accentBar: v })} />
            <ColorField label="Fundo claro" value={doc.brand.bgLight} onChange={(v) => updateBrand({ bgLight: v })} />
            <ColorField label="Fundo escuro" value={doc.brand.bgDark} onChange={(v) => updateBrand({ bgDark: v })} />
          </Panel>

          {slide && slide.role !== 'cover' && slide.role !== 'cta' && (
            <Panel title="Diagramação">
              <p className="text-[11px] text-textItemBlur leading-[1.5]">
                Vocabulário do slide — troca como o conteúdo é montado em tela.
              </p>
              <div className="grid grid-cols-3 gap-[6px]">
                {([
                  ['default', 'Padrão'],
                  ['stat', 'Big Stat'],
                  ['card', 'Card'],
                  ['list', 'Lista'],
                  ['table', 'Tabela'],
                  ['img-box', 'Img-box'],
                ] as const).map(([val, label]) => {
                  const active = (slide.layout ?? 'default') === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSlideLayout(activeSlide, val)}
                      className="text-[11px] font-[700] px-[8px] py-[8px] rounded-[10px] border transition-colors"
                      style={
                        active
                          ? { borderColor: 'var(--voc-rose)', background: 'rgba(207,98,149,0.1)', color: 'var(--voc-rose)' }
                          : { borderColor: 'var(--new-border)', background: 'transparent', color: 'inherit' }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {(slide.layout === 'list' || slide.layout === 'table') && (
                <p className="text-[10px] text-textItemBlur leading-[1.5] mt-[2px]">
                  {slide.layout === 'list'
                    ? 'No modo Editar texto, escreva um item por linha (ou separados por ";").'
                    : 'No modo Editar texto, uma linha por linha da tabela, colunas separadas por "|". A 1ª linha é o cabeçalho.'}
                </p>
              )}
            </Panel>
          )}

          <Panel title="Texto" defaultOpen>
            {selectedNode ? (
              <div className="flex flex-col gap-[14px]">
                {/* Modo: editar texto vs destacar palavras */}
                <div className="flex gap-[6px] p-[3px] rounded-[10px] bg-newBgColor border border-newBorder">
                  {([
                    ['edit', 'Editar texto'],
                    ['highlight', 'Destacar palavras'],
                  ] as const).map(([val, label]) => {
                    const active = textMode === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTextMode(val)}
                        className="flex-1 text-[11px] font-[700] px-[8px] py-[7px] rounded-[8px] transition-colors"
                        style={
                          active
                            ? { background: 'var(--voc-rose)', color: '#fff' }
                            : { background: 'transparent', color: 'var(--new-textItemBlur)' }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Área principal do modo — abaixo do toggle (mesmo padrão nos dois modos) */}
                {textMode === 'edit' ? (
                  <label className="flex flex-col gap-[5px]">
                    <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                      Conteúdo
                    </span>
                    <textarea
                      value={nodePlainText(selectedNode)}
                      onChange={(e) => setNodeText(selectedNode.id, e.target.value)}
                      rows={3}
                      className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none resize-y leading-[1.4]"
                    />
                    <span className="text-[10px] text-textItemBlur leading-[1.4]">
                      Editar o texto remove os destaques de cor deste bloco — depois é só voltar para
                      "Destacar palavras".
                    </span>
                  </label>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
                      Cor do destaque
                    </span>
                    <div className="flex items-center gap-[8px]">
                      <input
                        value={highlightColor}
                        onChange={(e) => setHighlightColor(e.target.value)}
                        className="flex-1 text-[12px] px-[8px] py-[6px] rounded-[8px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
                      />
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(highlightColor) ? highlightColor : '#000000'}
                        onChange={(e) => setHighlightColor(e.target.value)}
                        className="w-[30px] h-[26px] bg-transparent border border-newBorder rounded-[6px] cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-[6px]">
                      {[doc.brand.primary, '#FFFFFF', doc.brand.bgDark].map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onClick={() => setHighlightColor(c)}
                          className="w-[22px] h-[22px] rounded-[6px] border"
                          style={{
                            background: c,
                            borderColor: highlightColor.toLowerCase() === c.toLowerCase() ? 'var(--voc-rose)' : 'var(--new-border)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-textItemBlur leading-[1.4]">
                      Clique numa palavra do slide para aplicar a cor. Troque a cor para destacar outras
                      palavras; clicar de novo na mesma cor remove.
                    </span>
                  </div>
                )}

                {/* Fonte */}
                <label className="flex flex-col gap-[5px]">
                  <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">Fonte</span>
                  <div className="flex items-center gap-[6px]">
                    <select
                      value={selectedNode.fontFamily}
                      onChange={(e) => updateNode(activeSlide, selectedNode.id, { fontFamily: e.target.value })}
                      className="flex-1 text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
                      style={{ fontFamily: selectedNode.fontFamily }}
                    >
                      {favoriteFonts.length > 0 && (
                        <optgroup label="Favoritas do projeto">
                          {favoriteFonts.map((f) => (
                            <option key={`fav-${f}`} value={f} style={{ fontFamily: f }}>
                              {f}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Todas as fontes">
                        {CAROUSEL_FONTS.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: f }}>
                            {f}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      type="button"
                      title={
                        favoriteFonts.includes(selectedNode.fontFamily)
                          ? 'Remover dos favoritos do projeto'
                          : 'Marcar como favorita do projeto'
                      }
                      onClick={() => toggleFavoriteFontFamily(selectedNode.fontFamily)}
                      className="shrink-0 w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-newBorder hover:bg-boxHover transition-colors"
                    >
                      <Star
                        size={15}
                        className={favoriteFonts.includes(selectedNode.fontFamily) ? '' : 'text-textItemBlur'}
                        style={
                          favoriteFonts.includes(selectedNode.fontFamily)
                            ? { color: 'var(--voc-rose)', fill: 'var(--voc-rose)' }
                            : undefined
                        }
                      />
                    </button>
                  </div>
                </label>

                {/* Alinhamento + estilo */}
                <div className="flex items-center justify-between gap-[8px]">
                  <div className="flex gap-[4px]">
                    {([
                      ['left', AlignLeft],
                      ['center', AlignCenter],
                      ['right', AlignRight],
                      ['justify', AlignJustify],
                    ] as const).map(([val, Icon]) => (
                      <IconToggle
                        key={val}
                        active={selectedNode.align === val}
                        onClick={() => updateNode(activeSlide, selectedNode.id, { align: val })}
                      >
                        <Icon size={15} />
                      </IconToggle>
                    ))}
                  </div>
                  <div className="flex gap-[4px]">
                    <IconToggle
                      active={selectedNode.fontWeight >= 700}
                      onClick={() =>
                        updateNode(activeSlide, selectedNode.id, {
                          fontWeight: selectedNode.fontWeight >= 700 ? 400 : 700,
                        })
                      }
                    >
                      <Bold size={15} />
                    </IconToggle>
                    <IconToggle
                      active={!!selectedNode.italic}
                      onClick={() => updateNode(activeSlide, selectedNode.id, { italic: !selectedNode.italic })}
                    >
                      <Italic size={15} />
                    </IconToggle>
                  </div>
                </div>

                {/* Peso da fonte */}
                <label className="flex flex-col gap-[5px]">
                  <span className="text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">Peso</span>
                  <select
                    value={selectedNode.fontWeight}
                    onChange={(e) => updateNode(activeSlide, selectedNode.id, { fontWeight: Number(e.target.value) })}
                    className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
                  >
                    {Array.from(new Set([...fontWeightsFor(selectedNode.fontFamily), selectedNode.fontWeight]))
                      .sort((a, b) => a - b)
                      .map((w) => (
                        <option key={w} value={w}>
                          {w}{FONT_WEIGHT_LABELS[w] ? ` · ${FONT_WEIGHT_LABELS[w]}` : ''}
                        </option>
                      ))}
                  </select>
                </label>

                {/* Tamanho */}
                <Slider
                  label="Tamanho"
                  unit="px"
                  min={20}
                  max={140}
                  step={1}
                  value={selectedNode.fontSize}
                  onChange={(v) => updateNode(activeSlide, selectedNode.id, { fontSize: v })}
                />

                {/* Entrelinha */}
                <Slider
                  label="Entrelinha"
                  min={0.9}
                  max={2}
                  step={0.01}
                  value={selectedNode.lineHeight}
                  display={selectedNode.lineHeight.toFixed(2)}
                  onChange={(v) => updateNode(activeSlide, selectedNode.id, { lineHeight: v })}
                />

                {/* Espaçamento (kerning) */}
                <Slider
                  label="Espaçamento"
                  unit="px"
                  min={-8}
                  max={20}
                  step={0.5}
                  value={selectedNode.letterSpacing}
                  onChange={(v) => updateNode(activeSlide, selectedNode.id, { letterSpacing: v })}
                />

                <ColorField
                  label="Cor base"
                  value={selectedNode.fill}
                  onChange={(v) => updateNode(activeSlide, selectedNode.id, { fill: v })}
                />
              </div>
            ) : (
              <p className="text-[12px] text-textItemBlur">Clique num texto do slide para editar.</p>
            )}
          </Panel>

          <Panel title="Mídia">
            <p className="text-[11px] text-textItemBlur leading-[1.5]">
              Clique num slot para selecionar o slide e trocar a imagem de fundo.
            </p>
            <div className="grid grid-cols-2 gap-[6px]">
              {doc.slides.map((s, i) => {
                const isActive = i === activeSlide;
                const hasImage = s.background.kind === 'image' && !!s.background.imageUrl;
                return (
                  <div key={s.id} className="flex flex-col gap-[4px]">
                    <label
                      title={`Slide ${i + 1} — clique para trocar imagem`}
                      className="relative cursor-pointer rounded-[8px] overflow-hidden"
                      style={{
                        aspectRatio: doc.aspectRatio === '9:16' ? '9/16' : '4/5',
                        border: isActive ? '2px solid var(--voc-rose)' : '2px solid var(--new-border)',
                      }}
                      onClick={() => { setActiveSlide(i); setSelectedNodeId(null); }}
                    >
                      {/* mini preview do fundo */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: hasImage
                            ? `url(${s.background.imageUrl}) center/cover`
                            : s.background.kind === 'grad'
                            ? 'linear-gradient(135deg,var(--voc-rose),var(--voc-violet))'
                            : s.background.kind === 'dark'
                            ? (s.background.color ?? doc.brand.bgDark)
                            : (s.background.color ?? doc.brand.bgLight),
                        }}
                      />
                      {hasImage && (
                        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${s.background.overlay ?? 0.55})` }} />
                      )}
                      {/* número */}
                      <span
                        className="absolute top-[4px] left-[4px] text-[9px] font-[800] w-[16px] h-[16px] rounded-full grid place-items-center leading-none"
                        style={{ background: isActive ? 'var(--voc-rose)' : 'rgba(0,0,0,0.55)', color: '#fff' }}
                      >
                        {i + 1}
                      </span>
                      {/* ícone de upload no hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <ImageIcon size={16} className="text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setActiveSlide(i);
                            setSlideBackgroundContrast(i, {
                              kind: 'image',
                              imageUrl: String(reader.result),
                              overlay: s.background.overlay ?? 0.55,
                            });
                          };
                          reader.readAsDataURL(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {/* remover imagem */}
                    {hasImage && isActive && (
                      <button
                        type="button"
                        onClick={() => setSlideBackgroundContrast(i, { kind: 'dark', color: doc.brand.bgDark, imageUrl: undefined })}
                        className="text-[9px] text-textItemBlur hover:text-newTextColor transition-colors text-center"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Fundo">
            {slide?.background.kind === 'image' ? (
              <div className="flex flex-col gap-[6px]">
                <span className="text-[11px] uppercase tracking-[0.08em] text-textItemBlur">
                  Escurecer · {Math.round((slide.background.overlay ?? 0.55) * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((slide.background.overlay ?? 0.55) * 100)}
                  onChange={(e) => updateSlideBackground(activeSlide, { overlay: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--voc-rose)]"
                />
              </div>
            ) : slide?.background.kind === 'grad' ? (
              <p className="text-[12px] text-textItemBlur">Slide com gradiente da marca.</p>
            ) : (
              <>
                <ColorField
                  label="Cor do slide"
                  value={slide?.background.color ?? '#000000'}
                  onChange={(v) => updateSlideBackground(activeSlide, { color: v })}
                />
                <button
                  type="button"
                  onClick={() =>
                    slide &&
                    (slide.background.kind === 'light' || slide.background.kind === 'dark') &&
                    setAllSlidesColor(slide.background.color ?? '#000000', slide.background.kind)
                  }
                  className="text-[12px] font-[700] px-[14px] py-[9px] rounded-full bg-newBgColorInner border border-newBorder text-newTextColor hover:bg-boxHover transition-colors"
                >
                  Aplicar a todos os slides
                </button>
                <p className="text-[11px] text-textItemBlur">Aplica esta cor a todos os slides do mesmo tom (preserva o contraste do texto).</p>
              </>
            )}
          </Panel>

          <Panel title="CTA">
            <label className="flex items-center justify-between gap-[10px] cursor-pointer">
              <span className="text-[12px] text-textItemBlur">Mostrar botão</span>
              <Toggle
                on={!!doc.ctaButton?.show}
                onChange={(on) =>
                  patchDoc({
                    ctaButton: { show: on, label: doc.ctaButton?.label ?? 'Comenta GUIA' },
                  })
                }
              />
            </label>
            {doc.ctaButton?.show && (
              <Field
                label="Texto do botão"
                value={doc.ctaButton?.label ?? ''}
                onChange={(v) => patchDoc({ ctaButton: { show: true, label: v } })}
              />
            )}
            <p className="text-[11px] text-textItemBlur">O botão aparece no rodapé de todos os frames, com a cor da barra de topo.</p>
          </Panel>

          <Panel title="Proporção">
            <div className="flex gap-[8px]">
              {(['4:5', '9:16'] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className="flex-1 text-[13px] font-[700] py-[9px] rounded-[10px] border transition-colors"
                  style={
                    doc.aspectRatio === r
                      ? { background: 'var(--voc-rose)', color: '#fff', borderColor: 'transparent' }
                      : { background: 'var(--new-bgColor)', borderColor: 'var(--new-border)' }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-textItemBlur">9:16 aumenta o fundo acima/abaixo sem mexer no conteúdo.</p>
          </Panel>
        </aside>

        {/* Canvas central — overflow-auto para zoom > 100% */}
        <main className="flex-1 min-w-0 grid place-items-center p-[24px] bg-newBgColor overflow-auto">
          {slide && canvasWidth > 0 && (
            <div className="rounded-[10px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] leading-[0] shrink-0">
              <CarouselStage
                slide={slide}
                brand={doc.brand}
                ratio={doc.aspectRatio}
                displayWidth={canvasWidth}
                index={activeSlide}
                total={doc.slides.length}
                interactive
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onNodeChange={(id, patch) => updateNode(activeSlide, id, patch)}
                onToggleWordAccent={toggleWordAccent}
                cta={ctaButton}
              />
            </div>
          )}
        </main>

        {/* Painel direito — frames */}
        <aside
          className="w-[208px] shrink-0 overflow-y-auto p-[16px] flex flex-col gap-[10px] bg-newBgColorInner items-center"
          onClick={() => slideMenu !== null && setSlideMenu(null)}
        >
          <span className="self-start text-[11px] font-[700] uppercase tracking-[0.1em] text-textItemBlur">
            Frames
          </span>
          {doc.slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => { dragIndexRef.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndexRef.current !== null && dragIndexRef.current !== i) {
                  reorderSlide(dragIndexRef.current, i);
                }
                dragIndexRef.current = null;
              }}
              className="w-full flex flex-col gap-[4px] items-center cursor-grab active:cursor-grabbing"
            >
              <div className="relative w-full flex items-start gap-[4px]">
                {/* grip */}
                <div className="mt-[4px] text-textItemBlur opacity-40 hover:opacity-80 transition-opacity shrink-0">
                  <GripVertical size={12} />
                </div>

                <div className="flex-1 min-w-0">
                  <SlideThumbnail
                    ref={(el) => { thumbRefs.current[i] = el; }}
                    slide={s}
                    brand={doc.brand}
                    ratio={doc.aspectRatio}
                    index={i}
                    total={doc.slides.length}
                    active={i === activeSlide}
                    displayWidth={148}
                    cta={ctaButton}
                    onClick={() => { setActiveSlide(i); setSelectedNodeId(null); }}
                  />
                </div>

                {/* ⋮ button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSlideMenu(slideMenu === i ? null : i); }}
                    className="mt-[4px] grid place-items-center w-[20px] h-[20px] rounded-[6px] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
                  >
                    <span className="flex flex-col gap-[2px] items-center">
                      {[0,1,2].map((d) => <span key={d} className="w-[3px] h-[3px] rounded-full bg-current" />)}
                    </span>
                  </button>

                  {slideMenu === i && (
                    <div
                      className="absolute right-0 top-[24px] z-[50] rounded-[10px] border border-newBorder bg-newBgColor shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden min-w-[148px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SlideMenuItem
                        icon={<Copy size={13} />}
                        label="Duplicar"
                        onClick={() => { duplicateSlide(i); setSlideMenu(null); }}
                      />
                      <SlideMenuItem
                        icon={<Star size={13} />}
                        label="Definir como capa"
                        onClick={() => { if (i !== 0) reorderSlide(i, 0); setSlideMenu(null); }}
                        disabled={i === 0}
                      />
                      <SlideMenuItem
                        icon={s.hideBrandFields ? <Eye size={13} /> : <EyeOff size={13} />}
                        label={s.hideBrandFields ? 'Mostrar marca' : 'Ocultar marca'}
                        onClick={() => { toggleSlideBrandFields(i); setSlideMenu(null); }}
                      />
                      <SlideMenuItem
                        icon={s.hideFooter ? <Eye size={13} /> : <EyeOff size={13} />}
                        label={s.hideFooter ? 'Mostrar rodapé' : 'Ocultar rodapé'}
                        onClick={() => { toggleSlideFooter(i); setSlideMenu(null); }}
                      />
                      {s.background.kind === 'dark' && (
                        <SlideMenuItem
                          icon={s.hideBgNumber ? <Eye size={13} /> : <EyeOff size={13} />}
                          label={s.hideBgNumber ? 'Mostrar nº de fundo' : 'Ocultar nº de fundo'}
                          onClick={() => { toggleSlideBgNumber(i); setSlideMenu(null); }}
                        />
                      )}
                      <div className="h-[1px] bg-newBorder mx-[8px]" />
                      <SlideMenuItem
                        icon={<Trash2 size={13} />}
                        label="Excluir"
                        onClick={() => { deleteSlide(i); setSlideMenu(null); }}
                        disabled={doc.slides.length <= 1}
                        danger
                      />
                    </div>
                  )}
                </div>
              </div>

              <span className="flex items-center gap-[5px] text-[10px] text-textItemBlur uppercase tracking-[0.06em] self-start ml-[16px]">
                {String(i + 1).padStart(2, '0')} · {s.tag || s.role}
                {s.hideBrandFields && (
                  <EyeOff size={11} style={{ color: 'var(--voc-rose)' }} aria-label="Marca oculta neste slide" />
                )}
              </span>
            </div>
          ))}
        </aside>
      </div>

      {/* Modal Preview Instagram */}
      {showIgPreview && (
        <CarouselInstagramPreview
          doc={doc}
          thumbRefs={thumbRefs}
          onClose={() => setShowIgPreview(false)}
        />
      )}
    </div>
  );
};

/* ─── Slide context menu item ────────────────────────────────────────────── */
const SlideMenuItem = ({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[12px] font-[600] transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-boxHover"
    style={{ color: danger ? '#e05a5a' : 'var(--new-textColor)' }}
  >
    {icon}
    {label}
  </button>
);

/* ─── Toolbar button helper ──────────────────────────────────────────────── */
const ToolbarIconBtn = ({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="grid place-items-center w-[30px] h-[30px] rounded-[8px] border border-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    style={
      active
        ? { color: 'var(--voc-rose)' }
        : { color: 'var(--new-textItemBlur)' }
    }
    onMouseEnter={(e) => {
      if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--new-bgColorInner)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
    }}
  >
    {children}
  </button>
);

/* ─── Sub-componentes de layout ──────────────────────────────────────────── */

const Panel = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="shrink-0 rounded-[12px] bg-newBgColor border border-newBorder overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-[14px] py-[11px]"
      >
        <span className="text-[11px] font-[800] uppercase tracking-[0.1em] text-newTextColor">{title}</span>
        <ChevronDown size={14} className={`text-textItemBlur transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-[14px] pb-[14px] flex flex-col gap-[12px]">{children}</div>}
    </section>
  );
};

const IconToggle = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="grid place-items-center w-[30px] h-[30px] rounded-[8px] border transition-colors"
    style={
      active
        ? { background: 'var(--voc-rose)', color: '#fff', borderColor: 'transparent' }
        : { background: 'var(--new-bgColorInner)', borderColor: 'var(--new-border)', color: 'var(--new-textColor)' }
    }
  >
    {children}
  </button>
);

const Toggle = ({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className="relative w-[40px] h-[22px] rounded-full transition-colors shrink-0"
    style={{ background: on ? 'var(--voc-rose)' : 'var(--new-border)' }}
  >
    <span
      className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all"
      style={{ left: on ? '20px' : '2px' }}
    />
  </button>
);

const Slider = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: string;
}) => (
  <div className="flex flex-col gap-[6px]">
    <span className="text-[11px] uppercase tracking-[0.08em] text-textItemBlur">
      {label} · {display ?? value}
      {unit}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[var(--voc-rose)]"
    />
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible?: boolean;
  onToggleVisible?: () => void;
}) => (
  <label className="flex flex-col gap-[5px]">
    <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] font-[700] text-textItemBlur">
      {label}
      {onToggleVisible && (
        <button
          type="button"
          onClick={onToggleVisible}
          title={visible ? 'Ocultar nos slides' : 'Mostrar nos slides'}
          className="grid place-items-center w-[22px] h-[22px] rounded-[6px] hover:bg-boxHover transition-colors"
          style={{ color: visible ? 'var(--voc-rose)' : 'var(--new-textItemBlur)' }}
        >
          {visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}
    </span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] px-[10px] py-[8px] rounded-[10px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
      style={visible === false ? { opacity: 0.5 } : undefined}
    />
  </label>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center justify-between gap-[10px]">
    <span className="text-[12px] text-textItemBlur">{label}</span>
    <div className="flex items-center gap-[8px]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[88px] text-[12px] px-[8px] py-[6px] rounded-[8px] bg-newBgColorInner border border-newBorder text-newTextColor outline-none"
      />
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-[30px] h-[26px] bg-transparent border border-newBorder rounded-[6px] cursor-pointer"
      />
    </div>
  </div>
);

const PublishExportMenu = ({
  disabled,
  publishing,
  onPostNow,
  onSchedule,
  onPng,
  onZip,
  onPdf,
}: {
  disabled?: boolean;
  publishing?: boolean;
  onPostNow: () => void;
  onSchedule: () => void;
  onPng: () => void;
  onZip: () => void;
  onPdf: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || publishing}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[7px] text-[12px] font-[800] px-[16px] py-[8px] rounded-full text-white disabled:opacity-40 transition-opacity hover:opacity-90"
        style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 20px rgba(207,98,149,0.28)' }}
      >
        {publishing ? 'Publicando…' : 'Postar / Exportar'}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[50] w-[230px] p-[6px] rounded-[12px] bg-newBgColorInner border border-newBorder shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col">
          <MenuItem icon={<Send size={15} />} onClick={run(onPostNow)} accent>
            Postar agora
          </MenuItem>
          <MenuItem icon={<CalendarClock size={15} />} onClick={run(onSchedule)} accent>
            Agendar publicação
          </MenuItem>
          <div className="my-[6px] border-t border-newBorder" />
          <span className="px-[10px] pb-[4px] text-[10px] uppercase tracking-[0.1em] text-textItemBlur">
            Exportar
          </span>
          <MenuItem icon={<ImageIcon size={15} />} onClick={run(onPng)}>
            PNG (slide atual)
          </MenuItem>
          <MenuItem icon={<FileArchive size={15} />} onClick={run(onZip)}>
            .zip (todos os slides)
          </MenuItem>
          <MenuItem icon={<FileText size={15} />} onClick={run(onPdf)}>
            PDF
          </MenuItem>
        </div>
      )}
    </div>
  );
};

const MenuItem = ({
  icon,
  children,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-[8px] text-[13px] font-[600] text-newTextColor hover:bg-boxHover transition-colors text-left"
  >
    <span style={accent ? { color: 'var(--voc-rose)' } : { color: 'var(--new-textItemBlur)' }}>
      {icon}
    </span>
    {children}
  </button>
);

const PrimaryButton = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-[13px] font-[800] px-[16px] py-[10px] rounded-full text-white"
    style={{ background: 'var(--voc-aurora)', boxShadow: '0 10px 26px rgba(207,98,149,0.3)' }}
  >
    {children}
  </button>
);

export default CarouselEditor;
