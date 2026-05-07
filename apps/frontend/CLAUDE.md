# Frontend (Next.js 14) — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — API que esta UI consome
  - [`libraries/react-shared-libraries/CLAUDE.md`](../../libraries/react-shared-libraries/CLAUDE.md) — componentes UI compartilhados (form, helpers, sentry, toaster, translation)
  - [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) — referência para componentes que consomem AI Provider System

## O que vive aqui

UI Next.js 14 com App Router, React 18, Tailwind 3. Roteamento em `src/app/`, componentes de feature em `src/components/`, hooks em `src/hooks/`. Componentes UI primitivos compartilhados estão em `libraries/react-shared-libraries/src/form/`.

## Padrões e Regras Específicas

### Data fetching — SWR + `useFetch` obrigatório

Toda chamada de API usa o hook `useFetch` exposto via `FetchWrapperComponent`. Origem: `libraries/helpers/src/utils/custom.fetch.tsx`. Não use `fetch` nativo nem `axios`.

**Cada hook SWR fica em sua própria função**, cumprindo `react-hooks/rules-of-hooks`. **Nunca** use `eslint-disable-next-line` para contornar.

✓ **Válido**:
```typescript
const useCommunity = () => {
  return useSWR<CommunitiesListResponse>('communities', getCommunities);
};
```

✗ **Inválido** (hooks dentro de objeto):
```typescript
const useCommunity = () => ({
  communities: () => useSWR<CommunitiesListResponse>('communities', getCommunities),
  providers:   () => useSWR<ProvidersListResponse>('providers', getProviders),
});
```

### Traduções — `useT()` obrigatório

Toda string visível ao usuário passa pelo hook `useT()`:

```typescript
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const t = useT();
return <button>{t('save_changes', 'Save changes')}</button>;
```

- **Sem string hardcoded em JSX.** Mesmo botão de "OK"/"Cancel" precisa de chave.
- Ao criar chave nova, adicionar em **`libraries/react-shared-libraries/src/translation/locales/pt/translation.json`** e **`locales/en/translation.json`**. Demais idiomas usam fallback inglês automático.
- Chaves em `snake_case`, descritivas (ex.: `select_late_profile`, `failed_to_add_channel`).
- Em prosa de tradução (valor): use **acentos completos em pt-BR**. Sem acentos só em chaves/identificadores.

### Tailwind e estilos

Antes de escrever qualquer componente, verificar:

- `src/app/colors.scss` — tokens de cor (`--new-bgColor`, `--new-textColor`, etc.)
- `src/app/global.scss` — utilitários globais
- `tailwind.config.js` — extensões e plugins ativos

Variáveis `--color-custom*` estão **depreciadas**. Usar tokens `--new-*` e classes Tailwind. Antes de inventar componente novo, ver outros do sistema para manter consistência visual.

### Componentes externos

**Nunca instalar bibliotecas de componente UI do npm** (Material UI, Chakra, Radix isolado, etc.) — escrever componentes nativos em React + Tailwind. Primitivos reutilizáveis ficam em `libraries/react-shared-libraries/src/form/` (button, input, select, checkbox, slider, color-picker, custom-select, textarea, canonical).

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `src/app/(app)/` | App Router — rotas autenticadas (layout principal) |
| `src/app/(extension)/` | Rotas para extensão de browser |
| `src/app/colors.scss` | Tokens de cor `--new-*` |
| `src/app/global.scss` | Estilos globais |
| `src/app/global-error.tsx` | Boundary de erro Next.js + Sentry capture |
| `src/components/launches/` | Maior surface — composer, calendar, providers de IA, modals (~60 componentes) |
| `src/components/settings/` | Settings panels (AI Provider, Credenciais, Profiles, etc.) |
| `src/components/new-layout/` | Sidebar + topbar atuais |
| `src/components/new-layout/sentry.feedback.component.tsx` | Widget de feedback Sentry |
| `src/sentry.server.config.ts` / `sentry.edge.config.ts` | Config Sentry para SSR/edge |
| `src/instrumentation.ts` | Hook de inicialização Next.js (Sentry) |
| `src/proxy.ts` | Proxy de requests para backend em dev |

## Workflows Comuns

### Adicionar componente nova feature

1. **Tradução primeiro:** definir as chaves novas em `pt/translation.json` e `en/translation.json`. Reusar chaves existentes quando possível.
2. **Hook SWR isolado** (se precisa de dados): nova função `useFoo` em `src/hooks/` ou no próprio arquivo do componente.
3. **Componente** em `src/components/<area>/<nome>.component.tsx`. Tailwind + tokens. Importar primitivos de `libraries/react-shared-libraries/src/form/` quando aplicável.
4. **Acessibilidade:** `aria-*` em botões/inputs, `role` em widgets custom.
5. **CHANGELOG.md** em `[Unreleased]`.

### Consumir endpoint novo do backend

```typescript
const fetch = useFetch();
const { data, mutate } = useSWR<MyDto>('my-endpoint', () =>
  fetch('/my-endpoint').then((r) => r.json())
);
```

Tipo `MyDto` deve vir de `libraries/nestjs-libraries/src/dtos/` (mesmo que o backend) — fonte única.

### Per-profile override (componente que respeita perfil ativo)

Use o hook `useCurrentProfile()` para detectar perfil ativo. Perfil default (`isDefault=true`) edita workspace; perfil secundário cria override em escopo PROFILE. Ver [`libraries/nestjs-libraries/src/ai/CLAUDE.md`](../../libraries/nestjs-libraries/src/ai/CLAUDE.md) para a cadeia de resolução.

## Sentry no Frontend (`@sentry/nextjs`)

Setup inicial em `instrumentation.ts` + `sentry.{server,edge}.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  integrations: [
    // captura console.log/error/warn como logs estruturados
    Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
  ],
});
```

### Logger estruturado

```typescript
import * as Sentry from '@sentry/nextjs';
const { logger } = Sentry;

logger.trace('Starting database connection', { database: 'users' });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info('Updated profile', { profileId: 345 });
logger.warn('Rate limit reached', { endpoint: '/api/results/', isEnterprise: false });
logger.error('Failed to process payment', { orderId: 'order_123', amount: 99.99 });
logger.fatal('Database connection pool exhausted', { activeConnections: 100 });
```

`logger.fmt` é template literal — use para interpolar variáveis em logs estruturados.

Setup do Sentry de **backend** (`@sentry/nestjs`, helper `initializeSentry`, `FILTER` global) está em [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md).

## Armadilhas Conhecidas

1. **Sintoma:** ESLint reclamando `react-hooks/rules-of-hooks` em hook custom → **Causa:** múltiplos `useSWR` dentro de um objeto retornado. **Correção:** quebrar em hooks isolados (`useCommunity`, `useProviders`).
2. **Sintoma:** texto aparecendo em inglês mesmo no `/pt` → **Causa:** chave nova só foi adicionada em `en/translation.json`. **Correção:** adicionar também em `pt/translation.json`.
3. **Sintoma:** componente quebra layout em dark mode → **Causa:** cor hardcoded ou uso de `--color-custom*`. **Correção:** usar tokens `--new-*` ou classes Tailwind do tema.
4. **Sintoma:** modal de billing abrindo em fluxo de IA quando deveria ser erro de configuração → **Causa:** backend retornou 402. **Correção:** isso é regra do backend (412) — ver [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md).
5. **Sintoma:** `useT() is undefined` em componente cliente → **Causa:** falta `'use client'` no topo do arquivo, ou import errado (`get.transation.service.client` no client; há outro `.server` para SSR).
6. **Sintoma:** PR rejeitado por sugerir `npm install @radix-ui/...` → **Causa:** regra "no npm UI". **Correção:** copiar/adaptar primitivo de `react-shared-libraries/src/form/` ou escrever nativo.

## Comandos

```bash
pnpm dev                  # Frontend + backend + orchestrator
pnpm build:frontend       # Build de produção do frontend
pnpm lint                 # Sempre da raiz
```

## Referências

- [`libraries/react-shared-libraries/CLAUDE.md`](../../libraries/react-shared-libraries/CLAUDE.md) — primitivos UI e padrões de translation
- [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — contratos de API consumidos
- [`docs/architecture/ai-provider-system.md`](../../docs/architecture/ai-provider-system.md) — UI de Settings > AI Provider
