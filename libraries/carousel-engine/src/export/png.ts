import { STAGE_WIDTH } from '../schema';

/**
 * Estrutura mínima de um Konva.Stage necessária para rasterizar — mantém o core
 * livre de dependência de runtime do Konva (a camada React injeta o Stage real).
 */
export interface RasterStage {
  width(): number;
  height(): number;
  toDataURL(config?: {
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
  }): string;
}

/**
 * Exporta um slide para PNG em resolução nativa (1080px de largura), independente
 * do zoom de tela. O segredo: pixelRatio = larguraAlvo / larguraDoStage, então
 * mesmo um stage renderizado a 40% na tela sai com 1080×1350 exatos no arquivo.
 */
export function slideToDataUrl(
  stage: RasterStage,
  targetWidth: number = STAGE_WIDTH
): string {
  const pixelRatio = targetWidth / stage.width();
  return stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
}

/** dataURL (base64) → Uint8Array, para empacotar em ZIP ou PDF. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Dispara o download de um único dataURL no browser. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  // libera o object URL no próximo tick
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
