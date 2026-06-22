// Multi-idioma congelado (2026-06-21): pt fixo p/ todos, en em stand-by como
// fallback de chave ausente (sem preload, sem seletor na UI). Demais 12
// idiomas movidos para locales-archived/ para nao pesar build/scan/boot.
// Para retomar: mover os locales de volta, restaurar este array e o seletor
// em language.component.tsx (ver git log deste arquivo).
export const fallbackLng = 'pt';
export const languages = [fallbackLng, 'en'];

export const defaultNS = 'translation';
export const cookieName = 'i18next';
export const headerName = 'x-i18next-current-language';
