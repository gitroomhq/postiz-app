'use client';

/**
 * Protótipo — alternativa leve ao editor Polotno (docs/auditoria/plano-leveza-2026-07.md,
 * Fase C onda C2). Escopo DELIBERADAMENTE menor que o Polotno: o Polotno abre um canvas em
 * branco tipo mini-Canva (texto, formas, painel de geração de imagem por IA); este componente
 * cobre só o caso de uso "básico" que motivou a quarentena — upload de uma imagem, recorte e
 * rotação. Reaproveita Konva (já pago em peso de bundle pelo Volatis) em vez de instalar lib nova.
 *
 * Mesma interface de props do Polonto (setMedia/closeModal/width/height) para poder trocar
 * um pelo outro nos gatilhos de media.component.tsx sem mexer nos chamadores.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useImage } from '@gitroom/frontend/components/volatis/carousel/use-image.hook';

const MAX_STAGE_W = 640;
const MAX_STAGE_H = 480;

/** Roda uma imagem 90° via canvas offscreen — mais simples que combinar rotação+crop no Konva. */
function rotateImage90(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.height;
  canvas.height = img.width;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return Promise.resolve(canvas.toDataURL('image/png'));
}

/** Recorta a região `crop` (em coords naturais da imagem) e devolve um blob PNG. */
function cropToBlob(img: HTMLImageElement, crop: { x: number; y: number; w: number; h: number }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(crop.w));
  canvas.height = Math.max(1, Math.round(crop.h));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export default function MiniImageEditor(props: {
  setMedia: (media: { id: string; path: string }[]) => void;
  closeModal: () => void;
  width?: number;
  height?: number;
  type?: 'image' | 'video';
}) {
  const { setMedia, closeModal } = props;
  const t = useT();
  const fetch = useFetch();

  const [dataUrl, setDataUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const image = useImage(dataUrl);

  const stageRef = useRef<Konva.Stage>(null);
  const cropRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Escala de exibição: encaixa a imagem numa caixa máxima sem estourar a tela.
  const scale = useMemo(() => {
    if (!image) return 1;
    return Math.min(MAX_STAGE_W / image.width, MAX_STAGE_H / image.height, 1);
  }, [image]);

  const stageW = image ? Math.round(image.width * scale) : 0;
  const stageH = image ? Math.round(image.height * scale) : 0;

  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Inicializa o retângulo de recorte cobrindo 80% da imagem, centralizado.
  const resetCrop = useCallback((w: number, h: number) => {
    const cw = w * 0.8;
    const ch = h * 0.8;
    setCrop({ x: (w - cw) / 2, y: (h - ch) / 2, width: cw, height: ch });
  }, []);

  const onFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => setDataUrl(String(reader.result));
      reader.readAsDataURL(file);
    },
    []
  );

  const onRotate = useCallback(async () => {
    if (!image) return;
    const rotated = await rotateImage90(image);
    setDataUrl(rotated);
    // rotação troca largura/altura da imagem — o crop antigo fica desalinhado;
    // zera pra forçar o resetCrop (cobrindo 80% da nova imagem) na próxima render.
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
  }, [image]);

  const onApply = useCallback(async () => {
    if (!image || !crop.width || !crop.height) return;
    setUploading(true);
    try {
      const natural = {
        x: crop.x / scale,
        y: crop.y / scale,
        w: crop.width / scale,
        h: crop.height / scale,
      };
      const blob = await cropToBlob(image, natural);
      const formData = new FormData();
      formData.append('file', blob, 'media.png');
      const data = await (
        await fetch('/media/upload-simple', { method: 'POST', body: formData })
      ).json();
      setMedia([{ id: data.id, path: data.path }]);
      closeModal();
    } finally {
      setUploading(false);
    }
  }, [image, crop, scale, fetch, setMedia, closeModal]);

  return (
    <div className="bg-white text-black relative z-[400] p-[16px] flex flex-col gap-[12px]">
      {!image && (
        <label className="border-2 border-dashed border-gray-300 rounded-[8px] p-[40px] flex items-center justify-center cursor-pointer text-[13px]">
          {t('mini_editor_upload', 'Clique para escolher uma imagem')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      )}

      {image && (
        <>
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            onMouseDown={(e) => {
              // clique fora do crop desmarca o transformer
              if (e.target === e.target.getStage()) trRef.current?.nodes([]);
            }}
          >
            <Layer>
              <KonvaImage image={image} width={stageW} height={stageH} />
              <Rect
                ref={(node) => {
                  cropRef.current = node;
                  if (node && crop.width === 0) {
                    resetCrop(stageW, stageH);
                  }
                }}
                x={crop.x}
                y={crop.y}
                width={crop.width}
                height={crop.height}
                stroke="#cf6295"
                strokeWidth={2}
                dash={[6, 4]}
                fill="rgba(207,98,149,0.12)"
                draggable
                onClick={() => trRef.current?.nodes(cropRef.current ? [cropRef.current] : [])}
                onTap={() => trRef.current?.nodes(cropRef.current ? [cropRef.current] : [])}
                onDragEnd={(e) =>
                  setCrop((c) => ({ ...c, x: e.target.x(), y: e.target.y() }))
                }
                onTransformEnd={() => {
                  const node = cropRef.current;
                  if (!node) return;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  setCrop({
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(10, node.width() * scaleX),
                    height: Math.max(10, node.height() * scaleY),
                  });
                }}
              />
              <Transformer
                ref={trRef}
                rotateEnabled={false}
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
                }
              />
            </Layer>
          </Stage>

          <div className="flex gap-[8px]">
            <Button onClick={onRotate}>{t('mini_editor_rotate', 'Girar 90°')}</Button>
            <Button
              onClick={() => {
                setDataUrl(undefined);
                setCrop({ x: 0, y: 0, width: 0, height: 0 });
              }}
              secondary
            >
              {t('mini_editor_change', 'Trocar imagem')}
            </Button>
            <Button loading={uploading} onClick={onApply}>
              {t('use_this_media', 'Use this media')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
