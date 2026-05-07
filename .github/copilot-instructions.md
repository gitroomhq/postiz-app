# Copilot Coding Agent Instructions for Robô MultiPost

Single source of truth: **[`CLAUDE.md`](../CLAUDE.md)** na raiz, com filhos
por subárea (`apps/backend`, `apps/frontend`, `apps/orchestrator`,
`libraries/nestjs-libraries` e filhos `ai/`, `chat/`, `integrations/social/`,
`libraries/react-shared-libraries`).

Antes de sugerir qualquer código:

1. Ler `CLAUDE.md` da raiz — princípios não-negociáveis e mapa do monorepo.
2. Ler `CLAUDE.md` mais próximo do diretório onde está sugerindo (cascata).
3. Conferir [`docs/`](../docs/) para arquitetura detalhada (AI Provider System,
   Instagram automations, persona de IA, knowledge base, etc.) — os CLAUDE.md
   referenciam por link.

Regras chave (não-exaustivas; ver `CLAUDE.md` para o conjunto completo):

- **PNPM only** — nunca sugerir `npm` ou `yarn`.
- **Controller → Service → Repository** sem shortcut entre camadas.
- **TDD obrigatório**: spec primeiro (`.spec.ts`), depois implementação.
- **Sem `eslint-disable-next-line`**, sem componente UI do npm, sem string
  hardcoded em JSX (sempre `useT()`).
- **`AGENTS.md`** na raiz aponta para `CLAUDE.md` como single source of truth.

Conteúdo de Sentry (frontend) está em
[`apps/frontend/CLAUDE.md`](../apps/frontend/CLAUDE.md). Conteúdo de Sentry
(backend) está em [`apps/backend/CLAUDE.md`](../apps/backend/CLAUDE.md).
Detalhes do provedor Zernio (ex-Late, mesma empresa rebrandeada) estão em
[`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md).
