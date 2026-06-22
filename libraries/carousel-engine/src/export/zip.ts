import JSZip from 'jszip';
import { dataUrlToBytes } from './png';

export interface NamedSlide {
  /** Nome do arquivo dentro do zip, ex: "slide_01.png". */
  name: string;
  dataUrl: string;
}

/** Empacota os PNGs dos slides num único .zip (gerado 100% no browser). */
export async function slidesToZip(slides: NamedSlide[]): Promise<Blob> {
  const zip = new JSZip();
  for (const slide of slides) {
    zip.file(slide.name, dataUrlToBytes(slide.dataUrl));
  }
  return zip.generateAsync({ type: 'blob' });
}

/** Gera o nome padrão de arquivo de um slide (1-indexado, zero-padded). */
export function slideFileName(index: number, ext = 'png'): string {
  return `slide_${String(index + 1).padStart(2, '0')}.${ext}`;
}
