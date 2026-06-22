'use client';

import { forwardRef, useRef } from 'react';
import { Stage, Layer, Rect, Group, Text, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import {
  STAGE_WIDTH,
  stageHeight,
  type BrandKit,
  type CarouselNode,
  type ImageNode,
  type ShapeNode,
  type Slide,
} from '@gitroom/carousel-engine';
import { RichText } from './rich-text.component';
import { makeAxisLockBound } from './drag.util';
import { useImage } from './use-image.hook';

interface StageProps {
  slide: Slide;
  brand: BrandKit;
  ratio: '4:5' | '9:16';
  /** Largura de exibição em px (a altura segue a proporção). */
  displayWidth: number;
  index: number;
  total: number;
  interactive?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (id: string | null) => void;
  onNodeChange?: (id: string, patch: Partial<CarouselNode>) => void;
  onToggleWordAccent?: (id: string, runIndex: number, segIndex: number) => void;
  cta?: { show: boolean; label: string };
}

/** Crop "cover" — preenche a caixa mantendo proporção, centralizado. */
function coverCrop(img: HTMLImageElement, boxW: number, boxH: number) {
  const ar = img.width / img.height;
  const boxAr = boxW / boxH;
  let cw = img.width;
  let ch = img.height;
  if (ar > boxAr) {
    cw = img.height * boxAr;
  } else {
    ch = img.width / boxAr;
  }
  return { x: (img.width - cw) / 2, y: (img.height - ch) / 2, width: cw, height: ch };
}

const SlideImage = ({
  node,
  interactive,
  scale,
  canvasH,
  onSelect,
  onChange,
}: {
  node: ImageNode;
  interactive?: boolean;
  scale: number;
  canvasH: number;
  onSelect?: () => void;
  onChange?: (patch: Partial<CarouselNode>) => void;
}) => {
  const img = useImage(node.src);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  if (node.visible === false) return null;
  const crop = img ? coverCrop(img, node.width, node.height) : undefined;
  const draggable = !!(interactive && node.draggable);
  const dragBound = makeAxisLockBound({
    scale,
    canvasH,
    width: node.width,
    height: node.height,
    startRef,
  });
  return (
    <KonvaImage
      image={img}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      crop={crop}
      cornerRadius={node.cornerRadius}
      draggable={draggable}
      dragBoundFunc={draggable ? dragBound : undefined}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => {
        startRef.current = { x: node.x, y: node.y };
      }}
      onDragEnd={(e) => {
        onChange?.({ x: e.target.x(), y: e.target.y() });
        startRef.current = null;
      }}
    />
  );
};

/** Caixa retangular (cards/destaque) — borda esquerda de acento opcional. */
const SlideShape = ({ node }: { node: ShapeNode }) => {
  if (node.visible === false) return null;
  const radius = node.cornerRadius ?? 0;
  return (
    <Group
      x={node.x}
      y={node.y}
      clipFunc={
        radius
          ? (ctx) => {
              // clip com cantos arredondados — a borda esquerda fica contida
              // dentro do mesmo raio do card, sem destoar nos cantos.
              const w = node.width;
              const h = node.height;
              const r = Math.min(radius, w / 2, h / 2);
              ctx.beginPath();
              ctx.moveTo(r, 0);
              ctx.arcTo(w, 0, w, h, 0);
              ctx.arcTo(w, h, 0, h, 0);
              ctx.arcTo(0, h, 0, 0, r);
              ctx.arcTo(0, 0, w, 0, r);
              ctx.closePath();
            }
          : undefined
      }
    >
      <Rect
        width={node.width}
        height={node.height}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        cornerRadius={node.cornerRadius}
      />
      {node.borderLeftColor ? (
        <Rect
          x={0}
          y={0}
          width={node.borderLeftWidth ?? 6}
          height={node.height}
          fill={node.borderLeftColor}
        />
      ) : null}
    </Group>
  );
};

/** Avatar circular da marca no rodapé (chrome não editável). */
const AvatarCircle = ({ src, x, y, size }: { src?: string; x: number; y: number; size: number }) => {
  const img = useImage(src);
  if (!img) return null;
  const crop = coverCrop(img, size, size);
  return (
    <KonvaImage image={img} x={x} y={y} width={size} height={size} crop={crop} cornerRadius={size / 2} />
  );
};

/** Imagem de fundo full-bleed + overlay escuro (slide de capa). */
const BackgroundImage = ({
  src,
  overlay,
  width,
  height,
}: {
  src?: string;
  overlay?: number;
  width: number;
  height: number;
}) => {
  const img = useImage(src);
  const crop = img ? coverCrop(img, width, height) : undefined;
  return (
    <>
      {img ? (
        <KonvaImage image={img} x={0} y={0} width={width} height={height} crop={crop} />
      ) : (
        <Rect x={0} y={0} width={width} height={height} fill="#2b2b2b" />
      )}
      {overlay ? (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: height }}
          fillLinearGradientColorStops={[0, `rgba(0,0,0,${overlay * 0.3})`, 0.6, `rgba(0,0,0,${overlay * 0.85})`, 1, `rgba(0,0,0,${overlay})`]}
        />
      ) : null}
    </>
  );
};

export const CarouselStage = forwardRef<Konva.Stage, StageProps>(function CarouselStage(
  { slide, brand, ratio, displayWidth, index, total, interactive, selectedNodeId, onSelectNode, onNodeChange, onToggleWordAccent, cta },
  ref
) {
  const nativeH = stageHeight(ratio);
  const scale = displayWidth / STAGE_WIDTH;
  const displayHeight = nativeH * scale;
  const bg = slide.background;

  const chromeInk = bg.kind === 'light' ? brand.bgDark : '#FFFFFF';
  const chromeFaint = bg.kind === 'light' ? 'rgba(15,13,12,0.45)' : 'rgba(255,255,255,0.5)';
  const progress = ((index + 1) / total) * 100;
  // override por slide: oculta a identidade da marca só neste slide
  const showBrand = !slide.hideBrandFields;
  // com avatar visível, o texto da marca desloca para a direita do círculo
  const avatarShown = brand.showAvatar !== false && !!brand.avatarUrl && showBrand;
  const brandTextX = avatarShown ? 150 : 80;
  // cabeçalho: identidade da marca no topo (avatar + nome + @handle)
  const headerY = 44;

  return (
    <Stage
      ref={ref}
      width={displayWidth}
      height={displayHeight}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        if (interactive && e.target === e.target.getStage()) onSelectNode?.(null);
      }}
    >
      {/* Fundo */}
      <Layer listening={interactive}>
        {bg.kind === 'image' ? (
          <BackgroundImage src={bg.imageUrl} overlay={bg.overlay} width={STAGE_WIDTH} height={nativeH} />
        ) : bg.kind === 'grad' ? (
          <Rect
            x={0}
            y={0}
            width={STAGE_WIDTH}
            height={nativeH}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: STAGE_WIDTH, y: nativeH }}
            fillLinearGradientColorStops={brand.gradient.flatMap((c, i) => [
              i / (brand.gradient.length - 1),
              c,
            ])}
          />
        ) : (
          <Rect x={0} y={0} width={STAGE_WIDTH} height={nativeH} fill={bg.color} />
        )}
        {/* número decorativo gigante (profundidade visual) — só em slides escuros */}
        {bg.kind === 'dark' && !slide.hideBgNumber && (
          <Text
            x={STAGE_WIDTH - 460}
            y={nativeH - 600}
            width={420}
            align="right"
            text={`${index + 1}`}
            fontFamily={brand.fontHeadline}
            fontSize={380}
            fontStyle="900"
            letterSpacing={-14}
            fill="rgba(255,255,255,0.05)"
            listening={false}
          />
        )}
      </Layer>

      {/* Conteúdo editável */}
      <Layer listening={interactive}>
        {slide.nodes.map((node) =>
          node.kind === 'text' ? (
            <RichText
              key={node.id}
              node={node}
              selected={interactive && selectedNodeId === node.id}
              onSelect={interactive ? () => onSelectNode?.(node.id) : undefined}
              onToggleWord={
                interactive
                  ? (runIndex, segIndex) => onToggleWordAccent?.(node.id, runIndex, segIndex)
                  : undefined
              }
              draggable={interactive && node.draggable !== false}
              scale={scale}
              canvasH={nativeH}
              onDragEnd={(x, y) => onNodeChange?.(node.id, { x, y })}
            />
          ) : node.kind === 'image' ? (
            <SlideImage
              key={node.id}
              node={node}
              interactive={interactive}
              scale={scale}
              canvasH={nativeH}
              onSelect={() => onSelectNode?.(node.id)}
              onChange={(patch) => onNodeChange?.(node.id, patch)}
            />
          ) : (
            <SlideShape key={node.id} node={node} />
          )
        )}
      </Layer>

      {/* Chrome fixo do template (não editável) */}
      <Layer listening={false}>
        {/* accent bar — cor sólida definida pelo usuário (fallback: gradiente) */}
        {brand.accentBar ? (
          <Rect x={0} y={0} width={STAGE_WIDTH} height={7} fill={brand.accentBar} />
        ) : (
          <Rect
            x={0}
            y={0}
            width={STAGE_WIDTH}
            height={7}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: STAGE_WIDTH, y: 0 }}
            fillLinearGradientColorStops={brand.gradient.flatMap((c, i) => [
              i / (brand.gradient.length - 1),
              c,
            ])}
          />
        )}
        {/* cabeçalho — avatar + marca (bold) acima do @handle, no topo */}
        {brand.showAvatar !== false && !!brand.avatarUrl && showBrand && (
          <AvatarCircle src={brand.avatarUrl} x={80} y={headerY} size={56} />
        )}
        {brand.showBrandName !== false && !!brand.brandName && showBrand && (
          <Text
            x={brandTextX}
            y={avatarShown ? headerY + 2 : headerY}
            text={brand.brandName}
            fontFamily={brand.fontBody}
            fontSize={24}
            fontStyle="700"
            fill={chromeInk}
            opacity={0.9}
          />
        )}
        {brand.showHandle !== false && showBrand && (
          <Text
            x={brandTextX}
            y={avatarShown ? headerY + 34 : headerY + 30}
            text={`${brand.handle}`}
            fontFamily={brand.fontBody}
            fontSize={20}
            fontStyle="600"
            letterSpacing={1.5}
            fill={chromeFaint}
          />
        )}
        {/* tag do slide — logo abaixo do cabeçalho */}
        {slide.tag ? (
          <Text
            x={80}
            y={headerY + 84}
            text={slide.tag}
            fontFamily={brand.fontBody}
            fontSize={17}
            fontStyle="700"
            letterSpacing={3}
            fill={brand.primary}
          />
        ) : null}
        {/* copyright — topo direito, alinhado ao cabeçalho */}
        {brand.showCopyright !== false && showBrand && (
          <Text
            x={STAGE_WIDTH - 300}
            y={headerY + 6}
            width={220}
            align="right"
            text={brand.copyright}
            fontFamily={brand.fontBody}
            fontSize={20}
            fontStyle="600"
            fill={chromeFaint}
          />
        )}
        {/* rodapé: barra de progresso + paginação (toggle por slide) */}
        {!slide.hideFooter && (() => {
          const footerY = nativeH - 78;
          const trackW = STAGE_WIDTH - 256; // reserva ~96px à direita p/ a paginação
          return (
            <>
              <Rect
                x={80}
                y={footerY}
                width={trackW}
                height={4}
                cornerRadius={2}
                fill={bg.kind === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'}
              />
              <Rect
                x={80}
                y={footerY}
                width={(trackW * progress) / 100}
                height={4}
                cornerRadius={2}
                fill={bg.kind === 'light' ? brand.primary : '#FFFFFF'}
              />
              <Text
                x={STAGE_WIDTH - 156}
                y={footerY - 13}
                width={76}
                height={30}
                align="right"
                verticalAlign="middle"
                text={`${index + 1}/${total}`}
                fontFamily={brand.fontBody}
                fontSize={24}
                fontStyle="600"
                fill={chromeInk}
                opacity={0.65}
              />
            </>
          );
        })()}
        {/* botão de CTA (pill) — rodapé do último slide, quando ativo */}
        {cta?.show && cta.label.trim() && index === total - 1
          ? (() => {
              const fs = 30;
              const label = cta.label.toUpperCase();
              const pillW = Math.min(STAGE_WIDTH - 160, label.length * fs * 0.6 + 72);
              const pillH = 72;
              const x = (STAGE_WIDTH - pillW) / 2;
              const y = nativeH - 200;
              return (
                <>
                  <Rect
                    x={x}
                    y={y}
                    width={pillW}
                    height={pillH}
                    cornerRadius={pillH / 2}
                    fill={brand.accentBar || brand.primary}
                  />
                  <Text
                    x={x}
                    y={y}
                    width={pillW}
                    height={pillH}
                    align="center"
                    verticalAlign="middle"
                    text={label}
                    fontFamily={brand.fontBody}
                    fontSize={fs}
                    fontStyle="800"
                    letterSpacing={1}
                    fill="#FFFFFF"
                  />
                </>
              );
            })()
          : null}
      </Layer>
    </Stage>
  );
});
