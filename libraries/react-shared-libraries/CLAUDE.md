# React Shared Libraries — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md) — principal consumidor desta lib
  - [`libraries/nestjs-libraries/CLAUDE.md`](../nestjs-libraries/CLAUDE.md) — counterpart no backend

## O que vive aqui

Componentes React + helpers compartilhados entre o frontend principal (`apps/frontend`), a extensão de browser (`apps/extension`) e a API pública.

| Subdiretório | Conteúdo |
|---|---|
| `form/` | Primitivos UI: `button`, `input`, `select`, `custom.select`, `checkbox`, `textarea`, `slider`, `color.picker`, `canonical`, `total` |
| `helpers/` | Hooks e utilitários: `useIsVisible`, `useMediaDirectory`, `usePreventWindowUnload`, `useStateCallback`, `useTrack`, `mantineWrapper`, `safeImage`, `imageWithFallback`, `videoFrame`, `videoOrImage`, `uppyUpload`, `utcDateRender`, `variableContext`, `posthog`, etc. |
| `sentry/` | Wrappers de Sentry (frontend) compartilhados |
| `toaster/` | Sistema de notificação toast |
| `translation/` | i18n: `i18n.config`, `i18next`, hooks `useT()` (client e server), `translated-label`, `locales/` (17 idiomas) |

## Padrões e Regras Específicas

### Translation — fonte única de verdade

Todos os arquivos de tradução do produto vivem em `src/translation/locales/<lang>/translation.json`. Idiomas atuais: `pt`, `en`, `es`, `fr`, `de`, `it`, `ru`, `tr`, `ja`, `ko`, `zh`, `vi`, `bn`, `ar`, `he`, `ka_ge`, etc. (17).

Hooks expostos:

- `useT()` de `get.transation.service.client` — para componentes client (`'use client'`)
- Função server de `get.translation.service.backend` — para SSR / Server Components

**Regras de chaves** (aplicáveis a quem cria nova chave):

- `snake_case` descritiva (ex.: `select_late_profile`, `failed_to_add_channel`).
- Adicionar **simultaneamente em `pt/translation.json` E `en/translation.json`**. Outros idiomas usam fallback inglês automático (não bloqueante).
- **Valores em pt-BR usam acentos completos** (a regra "sem acentos" do projeto vale só para CHAVES e código, não para conteúdo de tradução).
- Reuse antes de criar — verificar se já existe antes.

### Form primitives

Antes de criar componente novo no `apps/frontend/src/components/`, **veja se há primitivo aqui**. Os primitivos têm Tailwind + tokens `--new-*` integrados e cobrem a maioria dos casos:

| Primitivo | Para quê |
|---|---|
| `button.tsx` | Botão base com variantes |
| `input.tsx` | Input texto/número com label |
| `select.tsx` / `custom.select.tsx` | Select padrão e custom (com search/grupos) |
| `checkbox.tsx` | Checkbox |
| `textarea.tsx` | Textarea |
| `slider.tsx` | Slider numérico |
| `color.picker.tsx` | Color picker |
| `canonical.tsx` | Helper para slug/URL canônico |
| `total.tsx` | Display de totais formatados |

Se não existe primitivo adequado, **escreva nativo** — não instale do npm (regra do monorepo).

### Helpers reutilizáveis (não reinventar)

| Helper | Uso |
|---|---|
| `useIsVisible` | Lazy loading via IntersectionObserver |
| `useMediaDirectory` | Listagem da biblioteca de mídia |
| `usePreventWindowUnload` | Prompt antes de sair (form sujo) |
| `useStateCallback` | `useState` com callback após set |
| `useTrack` | Tracking PostHog |
| `safeImage` / `imageWithFallback` | `<img>` com fallback de erro |
| `videoFrame` / `videoOrImage` | Render condicional vídeo/imagem |
| `uppyUpload` | Upload via Uppy (com providers configurados) |
| `utcDateRender` | Formatação UTC consistente |
| `variableContext` | Context de variáveis globais (URL backend, flags) |
| `mantineWrapper` | Wrapper para componentes Mantine usados pontualmente |
| `posthog` | Inicialização de PostHog |
| `delete.dialog` | Modal de confirmação de delete |

### Sentry e Toaster

- `sentry/` — wrappers que padronizam captura no frontend (consumido por `apps/frontend/src/components/new-layout/sentry.feedback.component.tsx`).
- `toaster/` — único sistema de notificação. Não introduzir lib alternativa de toast.

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `src/form/button.tsx` | Botão base — extender via props/className em vez de criar variantes novas em outro lugar |
| `src/translation/get.transation.service.client.ts` | `useT()` para client components |
| `src/translation/get.translation.service.backend.ts` | Tradução em SSR/Server Components |
| `src/translation/i18n.config.ts` | Lista de locales suportadas |
| `src/translation/locales/pt/translation.json` | **Chaves em pt-BR (com acentos no valor)** |
| `src/translation/locales/en/translation.json` | **Chaves em inglês — fallback global** |
| `src/helpers/variable.context.tsx` | Context com `BACKEND_URL`, flags, etc. |
| `src/helpers/uppy.upload.ts` | Configuração canônica do Uppy |

## Workflows Comuns

### Adicionar string visível ao usuário

1. Definir chave `snake_case` descritiva.
2. Adicionar em `pt/translation.json` (com acentos no valor) **E** `en/translation.json` (em inglês).
3. Consumir via `useT()` no componente client (`'use client'`).
4. Para SSR, usar a função server de `get.translation.service.backend`.

### Adicionar primitivo de form novo

1. Confirmar que **não há** alternativa em `form/` ou no frontend.
2. Spec / story (se houver Storybook configurado) — caso contrário, escrever em `form/` direto.
3. Tokens `--new-*` do colors.scss (ver [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md)).
4. Suporte a dark mode automático (tokens já cobrem).
5. Exportar em `index.ts` se houver agregador.

### Adicionar idioma novo

1. Criar `src/translation/locales/<lang>/translation.json` (cópia de `en` e traduzir progressivamente).
2. Registrar em `i18n.config.ts`.
3. Chaves não traduzidas usam fallback inglês — não-bloqueante.

## Armadilhas Conhecidas

1. **Sintoma:** componente novo no frontend reimplementa botão/input do zero → **Causa:** dev não viu o primitivo daqui. **Correção:** importar de `@gitroom/react/form/<primitivo>`.
2. **Sintoma:** texto novo aparece em inglês mesmo no `/pt` → **Causa:** chave só em `en/translation.json`. **Correção:** adicionar em `pt/translation.json`.
3. **Sintoma:** `useT() is undefined` → **Causa:** falta `'use client'` no topo do componente, ou import errado (`get.translation.service.backend` em client). **Correção:** importar `get.transation.service.client` e marcar componente como client.
4. **Sintoma:** caracteres acentuados aparecem como `?` ou caixas → **Causa:** arquivo de tradução salvo em encoding errado. **Correção:** `pt/translation.json` deve ser UTF-8; valores **com acentos completos** (ex.: "Configurações", não "Configuracoes").
5. **Sintoma:** novo componente UI instalado via `pnpm add @<biblioteca>` → **Causa:** quebrou regra "no npm UI". **Correção:** desinstalar e escrever nativo ou usar primitivo de `form/`.

## Comandos

```bash
pnpm test:libs            # Specs de libs (incluindo esta)
```

## Referências

- [`apps/frontend/CLAUDE.md`](../../apps/frontend/CLAUDE.md) — `useT()`, Tailwind tokens, regra de hooks isolados
- [`libraries/nestjs-libraries/CLAUDE.md`](../nestjs-libraries/CLAUDE.md) — counterpart de domínio
