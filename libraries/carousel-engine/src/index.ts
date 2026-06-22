/**
 * @gitroom/carousel-engine — motor de carrosséis Vocaccio.
 *
 * Núcleo TS puro (sem React, sem runtime Konva): schema (o contrato), templates,
 * paletas, layout, autofill e export. A camada React/Konva vive em
 * apps/frontend/src/components/volatis/carousel e consome só este barrel.
 */

export * from './schema';
export * from './templates';
export * from './palettes';
export * from './layout';
export * from './reskin';
export * from './autofill';
export * from './fonts';
export * from './seed';
export * from './export/png';
export * from './export/zip';
export * from './export/pdf';
