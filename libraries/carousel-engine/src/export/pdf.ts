import { jsPDF } from 'jspdf';

/**
 * PDF (formato LinkedIn) — uma página por slide, na proporção nativa do carrossel.
 * O LinkedIn exibe carrosséis como documento PDF; cada página = um slide.
 */
export async function slidesToPdf(
  dataUrls: string[],
  opts: { width: number; height: number }
): Promise<Blob> {
  if (dataUrls.length === 0) {
    throw new Error('slidesToPdf: nenhum slide para exportar');
  }

  const orientation = opts.width >= opts.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [opts.width, opts.height],
    compress: true,
  });

  dataUrls.forEach((dataUrl, i) => {
    if (i > 0) pdf.addPage([opts.width, opts.height], orientation);
    pdf.addImage(dataUrl, 'PNG', 0, 0, opts.width, opts.height, undefined, 'FAST');
  });

  return pdf.output('blob');
}
