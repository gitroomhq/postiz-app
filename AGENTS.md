# AGENTS.md — Robô MultiPost

Entrypoint para qualquer agente de IA (Claude Code, Cursor, Antigravity, Codex,
Copilot) trabalhando neste repositório.

## Source-of-truth do contexto

O contexto operacional para agentes vive em `.context/`, gerenciado pelo
[dotcontext](https://github.com/dotcontext/cli) via MCP (configurado em
`.mcp.json` na raiz). O `.context/` é a **fonte única de verdade** para
portabilidade entre IDEs.

Estrutura:

| Caminho | Conteúdo |
|---|---|
| `.context/agents/` | 14 playbooks de especialistas (architect, backend, frontend, db, devops, security, etc.) |
| `.context/skills/` | 10 skills do ciclo PREVC (commit-message, code-review, test-generation, etc.) |
| `.context/docs/` | Docs técnicos (architecture, data-flow, security, glossary, project-overview, testing-strategy, tooling) e `codebase-map.json` |

> **Nota:** os skills em `.context/skills/` estão `unfilled` (apenas
> frontmatter) até a sessão de bootstrap rodar via MCP. Veja
> `docs/planning/dotcontext-bootstrap.md`.

## Hierarquia de instruções

1. **`AGENTS.md` (este arquivo)** — entrypoint neutro, lido primeiro.
2. **`.context/`** — contexto profundo, portátil entre IDEs (via dotcontext MCP).
3. **`CLAUDE.md`** — instruções específicas do Claude Code (stack, padrões,
   Comandos Úteis, regras de TDD/i18n/SWR, hierarquia GitLab Flow).
4. **`.cursor/rules`, `.windsurfrules`, `.github/copilot-instructions.md`** —
   exports/stubs gerados a partir do `.context/` (não editar à mão; rodar
   `sync.export*` do dotcontext quando precisar atualizar).
5. **Docs específicos** em `docs/architecture/` e `docs/operations/` para
   subsistemas críticos (Instagram automations, AI Provider system, AI Credits,
   etc.) — referenciados em `CLAUDE.md`.

## Como invocar agentes e skills (Claude Code com MCP do dotcontext carregado)

```
use the security-auditor agent to audit the new webhook handler
use the commit-message skill to draft a commit for staged changes
plan "<descrição>" using dotcontext            # workflow PREVC completo
```

## Regras essenciais (resumo)

- Stack: NestJS + Next.js 14 + Temporal.io + Prisma/Postgres + Mastra/MCP. Detalhes em `CLAUDE.md`.
- Package manager: **PNPM apenas** (nunca npm/yarn).
- Backend: `Controller → Service → Repository`, sem shortcuts.
- Frontend: SWR + `useT()` para todo texto; sem strings hardcoded.
- TDD obrigatório: `.spec.ts` antes do código de produção.
- Branch postiz é mirror do upstream; toda customização vai em `main`.
- Atualizar `## [Unreleased]` no `CHANGELOG.md` em cada commit não-trivial.

## Bootstrap e uso diário

- Ativar / preencher `.context/`: `docs/planning/dotcontext-bootstrap.md`.
- Workflow diário com dotcontext: `docs/planning/dotcontext-daily-usage.md`.
