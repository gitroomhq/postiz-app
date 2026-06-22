# Idiomas congelados (2026-06-21)

Estes 14 locales (`ar`, `bn`, `de`, `es`, `fr`, `he`, `it`, `ja`, `ka_ge`, `ko`, `ru`, `tr`, `vi`, `zh`) foram movidos para fora de `../locales/` a pedido do Felipe, para que o webpack pare de escanear/empacotar esses arquivos no build (o import dinâmico em `i18next.ts` resolve por diretório, então só o que está dentro de `../locales/` é considerado).

Hoje só `pt` (fixo) e `en` (fallback de chave ausente, sem preload) estão ativos — ver `../i18n.config.ts`.

**Para retomar multi-idioma no futuro:**
1. Mover as pastas necessárias de volta para `../locales/`.
2. Adicionar os idiomas de volta ao array `languages` em `../i18n.config.ts`.
3. Restaurar `order: ['cookie', 'header']` em `../i18next.ts` se quiser auto-detecção por navegador.
4. Restaurar o seletor (`<LanguageComponent />`) em `apps/frontend/src/components/new-layout/layout.component.tsx` e `apps/frontend/src/components/billing/first.billing.component.tsx` (o componente em si não foi removido, só deixou de ser renderizado).
