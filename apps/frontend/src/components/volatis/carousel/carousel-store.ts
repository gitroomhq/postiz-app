'use client';

import {
  buildCarousel,
  createMockCarousel,
  deriveBrandKit,
  reskinCarousel,
  safeParseCarousel,
  type AspectRatio,
  type Carousel,
  type CarouselTemplate,
} from '@gitroom/carousel-engine';

/**
 * Persistência multi-carrossel (localStorage-first, Fase 1 do motor — sem backend).
 *
 * Modelo:
 *  - Cada documento em `vocaccio:carousel:{id}` (JSON do schema completo).
 *  - Um índice por cliente em `vocaccio:carousel:index:{clientId|__none__}` →
 *    lista leve de entradas (id, título, contagem, capa) para a Galeria não ter
 *    que abrir todos os docs.
 *  - `vocaccio:carousel:project-defaults:{crmClientId|__none__}` → brand padrão por
 *    PROJETO (cores + campos globais). Cada projeto guarda o seu; um carrossel
 *    pode sempre sobrescrever individualmente (os defaults só são lidos na criação).
 *  - `vocaccio:carousel:favorite-fonts:{crmClientId|__none__}` → fontes marcadas
 *    como favoritas do projeto — aparecem em destaque no seletor, mas NUNCA são
 *    herdadas automaticamente (fonte afeta diagramação por nó, é sempre escolha
 *    explícita).
 *
 * O id do documento (`doc.id`) é a chave canônica: a URL do editor usa `?id=`,
 * a chave do localStorage é `docKey(doc.id)`, e a entrada do índice referencia
 * o mesmo id. Nada de `'draft'` fixo.
 */

const DOC_PREFIX = 'vocaccio:carousel:';
const INDEX_PREFIX = 'vocaccio:carousel:index:';
const PROJECT_DEFAULTS_PREFIX = 'vocaccio:carousel:project-defaults:';
const FAVORITE_FONTS_PREFIX = 'vocaccio:carousel:favorite-fonts:';
/** Chave legada (global, pré per-projeto) — migrada uma vez para o bucket __none__. */
const LEGACY_BRAND_DEFAULTS_KEY = 'vocaccio:carousel:brand-defaults';
const NO_CLIENT = '__none__';

function projectDefaultsKey(clientId: string | null): string {
  return `${PROJECT_DEFAULTS_PREFIX}${clientId || NO_CLIENT}`;
}

function favoriteFontsKey(clientId: string | null): string {
  return `${FAVORITE_FONTS_PREFIX}${clientId || NO_CLIENT}`;
}

/** Migra a chave global legada para o bucket __none__, uma única vez. Idempotente. */
function migrateLegacyBrandDefaults(): void {
  if (typeof window === 'undefined') return;
  const legacy = window.localStorage.getItem(LEGACY_BRAND_DEFAULTS_KEY);
  if (!legacy) return;
  const targetKey = projectDefaultsKey(null);
  if (!window.localStorage.getItem(targetKey)) {
    window.localStorage.setItem(targetKey, legacy);
  }
  window.localStorage.removeItem(LEGACY_BRAND_DEFAULTS_KEY);
}

/** Entrada leve do índice — o suficiente para renderizar um card sem abrir o doc. */
export interface CarouselIndexEntry {
  id: string;
  title: string;
  updatedAt: string;
  slideCount: number;
  aspectRatio: AspectRatio;
  crmClientId: string | null;
  /** Capa renderizada (dataURL) — capturada pelo editor; pode faltar em docs novos. */
  coverDataUrl?: string;
}

function docKey(id: string): string {
  return `${DOC_PREFIX}${id}`;
}

function indexKey(clientId: string | null): string {
  return `${INDEX_PREFIX}${clientId || NO_CLIENT}`;
}

export function newCarouselId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ índice */

function readIndex(clientId: string | null): CarouselIndexEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(indexKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CarouselIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(clientId: string | null, entries: CarouselIndexEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(indexKey(clientId), JSON.stringify(entries));
}

function entryFromDoc(doc: Carousel): CarouselIndexEntry {
  return {
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
    slideCount: doc.slides.length,
    aspectRatio: doc.aspectRatio,
    crmClientId: doc.crmClientId ?? null,
  };
}

/** Lista os carrosséis de um cliente (mais recentes primeiro). */
export function listCarousels(clientId: string | null): CarouselIndexEntry[] {
  return readIndex(clientId).sort(
    (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

/** Agrega os carrosséis de vários buckets (clientes + sem-cliente) p/ a aba "Todos". */
export function listAllCarousels(clientIds: (string | null)[]): CarouselIndexEntry[] {
  const buckets = [null, ...clientIds.filter((c): c is string => !!c)];
  const seen = new Set<string>();
  const all: CarouselIndexEntry[] = [];
  for (const cid of buckets) {
    for (const e of readIndex(cid)) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      all.push(e);
    }
  }
  return all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function upsertIndexEntry(doc: Carousel): void {
  const clientId = doc.crmClientId ?? null;
  const entries = readIndex(clientId);
  const prev = entries.find((e) => e.id === doc.id);
  const next: CarouselIndexEntry = { ...entryFromDoc(doc), coverDataUrl: prev?.coverDataUrl };
  writeIndex(clientId, [next, ...entries.filter((e) => e.id !== doc.id)]);
}

/* --------------------------------------------------------------- documentos */

export function loadDoc(id: string): Carousel | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(docKey(id));
    if (!raw) return null;
    const parsed = safeParseCarousel(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Grava o doc (carimba updatedAt) e mantém o índice em sincronia. Retorna o doc salvo. */
export function saveDoc(doc: Carousel): Carousel {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  if (typeof window === 'undefined') return next;
  window.localStorage.setItem(docKey(next.id), JSON.stringify(next));
  upsertIndexEntry(next);
  return next;
}

/** Atualiza só a capa (dataURL) da entrada do índice — barato, fora do save do doc. */
export function setCover(clientId: string | null, id: string, coverDataUrl: string): void {
  const entries = readIndex(clientId);
  const i = entries.findIndex((e) => e.id === id);
  if (i < 0) return;
  entries[i] = { ...entries[i], coverDataUrl };
  writeIndex(clientId, entries);
}

/**
 * Migra docs legados salvos sob a chave 'draft' (antes da persistência multi-doc).
 * Gera um UUID real, move o doc e atualiza todos os índices. Idempotente.
 */
export function migrateLegacyDraft(): void {
  if (typeof window === 'undefined') return;
  const legacyKey = `${DOC_PREFIX}draft`;
  const raw = window.localStorage.getItem(legacyKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const result = safeParseCarousel({ ...parsed, id: parsed.id === 'draft' ? newCarouselId() : parsed.id });
    if (!result.success) { window.localStorage.removeItem(legacyKey); return; }
    const migrated = result.data;
    // salva sob novo id
    window.localStorage.setItem(docKey(migrated.id), JSON.stringify(migrated));
    window.localStorage.removeItem(legacyKey);
    // substitui nos índices: remove entrada 'draft' de todos os buckets, adiciona nova
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(INDEX_PREFIX)) continue;
      try {
        const entries: CarouselIndexEntry[] = JSON.parse(window.localStorage.getItem(key) ?? '[]');
        const hadDraft = entries.some((e) => e.id === 'draft');
        if (!hadDraft) continue;
        const next = entries.filter((e) => e.id !== 'draft');
        next.push(entryFromDoc(migrated));
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch { /* ignore */ }
    }
    // garante que está no índice do cliente correto
    upsertIndexEntry(migrated);
  } catch { window.localStorage.removeItem(legacyKey); }
}

export function renameCarousel(id: string, title: string): void {
  const doc = loadDoc(id);
  if (!doc) return;
  saveDoc({ ...doc, title });
}

export function deleteCarousel(clientId: string | null, id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(docKey(id));
  writeIndex(
    clientId,
    readIndex(clientId).filter((e) => e.id !== id)
  );
}

/** Clona um carrossel sob um novo id. Retorna a entrada criada (ou null). */
export function duplicateCarousel(id: string): CarouselIndexEntry | null {
  const doc = loadDoc(id);
  if (!doc) return null;
  const now = new Date().toISOString();
  const copy: Carousel = {
    ...doc,
    id: newCarouselId(),
    title: `${doc.title} (cópia)`,
    createdAt: now,
    updatedAt: now,
  };
  const saved = saveDoc(copy);
  return entryFromDoc(saved);
}

/* --------------------------------------------------- defaults por projeto */

export function loadBrandDefaults(clientId: string | null): Partial<Carousel['brand']> | null {
  if (typeof window === 'undefined') return null;
  migrateLegacyBrandDefaults();
  try {
    const raw = window.localStorage.getItem(projectDefaultsKey(clientId));
    return raw ? (JSON.parse(raw) as Partial<Carousel['brand']>) : null;
  } catch {
    return null;
  }
}

export function hasBrandDefaults(clientId: string | null): boolean {
  if (typeof window === 'undefined') return false;
  migrateLegacyBrandDefaults();
  return window.localStorage.getItem(projectDefaultsKey(clientId)) !== null;
}

export function saveBrandDefaults(clientId: string | null, brand: Carousel['brand']): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(projectDefaultsKey(clientId), JSON.stringify(brand));
}

export function clearBrandDefaults(clientId: string | null): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(projectDefaultsKey(clientId));
}

/* --------------------------------------------------- fontes favoritas */

export function loadFavoriteFonts(clientId: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(favoriteFontsKey(clientId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteFont(clientId: string | null, font: string): string[] {
  const current = loadFavoriteFonts(clientId);
  const next = current.includes(font) ? current.filter((f) => f !== font) : [...current, font];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(favoriteFontsKey(clientId), JSON.stringify(next));
  }
  return next;
}

function saveFavoriteFonts(clientId: string | null, fonts: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(favoriteFontsKey(clientId), JSON.stringify(fonts));
}

/* --------------------------------------------------- projetos (ativação) */

/**
 * Um cliente CRM só conta como "projeto de carrossel" quando já tem ao menos um
 * carrossel OU uma configuração global salva. Evita que toda conta do CRM polua a
 * galeria como aba vazia (decisão Felipe 2026-06-19, ver [[feedback-plan-before-building]]).
 */
export function isProjectActivated(clientId: string | null): boolean {
  return readIndex(clientId).length > 0 || hasBrandDefaults(clientId);
}

/** Copia config global (brand defaults + fontes favoritas) de um projeto para outro. */
export function copyProjectConfig(fromClientId: string | null, toClientId: string | null): void {
  const defaults = loadBrandDefaults(fromClientId);
  if (defaults && typeof window !== 'undefined') {
    window.localStorage.setItem(projectDefaultsKey(toClientId), JSON.stringify(defaults));
  }
  const fonts = loadFavoriteFonts(fromClientId);
  if (fonts.length) saveFavoriteFonts(toClientId, fonts);
}

/**
 * Propaga um BrandKit (config global atual) a TODOS os carrosséis já criados do
 * projeto, recolorindo fundos/textos baked via `reskinCarousel`. Sobrescreve
 * personalizações de cor por carrossel — quem chama avisa o usuário. Retorna
 * quantos carrosséis foram atualizados.
 */
export function applyBrandToProjectCarousels(
  clientId: string | null,
  brand: Carousel['brand']
): number {
  if (typeof window === 'undefined') return 0;
  const entries = readIndex(clientId);
  let count = 0;
  for (const e of entries) {
    const doc = loadDoc(e.id);
    if (!doc) continue;
    saveDoc(reskinCarousel(doc, brand));
    count += 1;
  }
  return count;
}

/**
 * Cria um carrossel novo (mock do Cedrico ainda não plugado) com id estável e o
 * brand padrão DO PROJETO aplicado, se houver. NÃO persiste — quem chama decide salvar.
 */
export function createNewCarousel(clientId: string | null, id?: string): Carousel {
  const cid = id ?? newCarouselId();
  const mock = createMockCarousel(clientId, cid);
  const defaults = loadBrandDefaults(clientId);
  if (!defaults) return mock;
  // aplica a config do projeto recolorindo o conteúdo já montado (fundos, fills e
  // as cores de palavra que eram o accent padrão) — não só troca o brand, senão as
  // palavras de destaque continuam na cor antiga (laranja do mock).
  const merged = { ...mock.brand, ...defaults };
  return reskinCarousel(mock, merged);
}

/**
 * Cria um carrossel novo a partir de um template nomeado (Fase 2/3) — slides
 * vazios já com a diagramação do template, identidade do projeto aplicada.
 * Usado pelo modal de seleção ao criar (Fase 3): a alternativa a "Começar em
 * branco" (que continua sendo `createNewCarousel`).
 */
export function createNewCarouselFromTemplate(
  clientId: string | null,
  template: CarouselTemplate,
  id?: string
): Carousel {
  const cid = id ?? newCarouselId();
  const defaults = loadBrandDefaults(clientId);
  const brand = defaults ? { ...deriveBrandKit({}), ...defaults } : deriveBrandKit({});
  const innerCount = Math.max(0, template.slots.length - 2);
  const innerSlides = Array.from({ length: innerCount }, () => ({}));
  return buildCarousel({
    id: cid,
    title: template.name,
    crmClientId: clientId,
    brand,
    content: { headline: template.name, slides: innerSlides, cta: 'Comenta GUIA' },
    sequence: template.slots,
  });
}
