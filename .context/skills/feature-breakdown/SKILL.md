---
type: skill
name: Feature Breakdown
description: Decompose a feature into incrementally shippable, reviewable tasks with API-First and Document-First discipline. Use at the start of a non-trivial feature, when scoping a sprint, or when a single proposed PR is too large. Outputs a PRD-style plan in docs/planning and a ranked task list ready for implementation.
skillSlug: feature-breakdown
phases: [P]
generated: 2026-02-20
status: filled
scaffoldVersion: "2.0.0"
---

## Output of this skill

When invoked, produce **two artifacts**:

1. A planning doc at `docs/planning/<feature-slug>.md` (pt-BR), with the PRD sections below.
2. A ranked task list (in chat or `TodoWrite`) where each task = one PR.

Don't write code in this phase. Code starts when the plan is approved.

## PRD sections (use as-is)

```markdown
# <Feature name>

## Contexto
Por que este trabalho está sendo feito agora. Qual problema do usuário,
qual restrição operacional, qual oportunidade. 3–5 linhas.

## Objetivo e métrica
O que precisa ser verdade ao final. Métrica concreta quando possível.

## Escopo
Lista de capacidades incluídas, agrupadas por camada
(backend, frontend, orchestrator, agent, etc.).

## Fora do escopo
Lista explícita do que NÃO entra agora. Útil para evitar reabrir o
debate em PR review.

## Riscos e premissas
Tudo que pode dar errado. Premissas em que o plano se apoia.

## Plano por fase
Bloco A — <descrição>: arquivos tocados, contrato API, testes,
definition of done. Um PR por bloco.
Bloco B — ...

## Definition of Done
Lista de checkboxes do que precisa estar verdade no merge final.

## Pendências e iterações futuras
O que vai ficar para depois (se aceitável).
```

## API-First discipline

Antes de planejar UI, **defina o contrato API**:

- Endpoint(s): `<METHOD> <path>` com payload e response.
- Códigos de erro: 412 (config), 401 (auth), 429 (rate limit), 422 (validação).
- DTOs com `class-validator` para validação de input.
- Rate limit explícito (`@Throttle`) quando o endpoint custa dinheiro (AI, external APIs).
- Auth/permissions: qual guard, qual policy.

Se você ainda não consegue desenhar o endpoint, a feature não está pronta para começar.

## Document-First discipline

A planning doc não é opcional — é o input do plano. Sem ela, a feature começa no escuro e a primeira revisão de PR vai pedir o doc.

- Se a feature for cross-cutting, a planning doc também aponta para o `docs/architecture/<feature>.md` que será criado/atualizado durante a entrega.
- Se a feature mudar contratos públicos (env vars, schema, endpoints), a planning doc lista *exatamente* o que muda.

## Granularidade dos blocos

- **Cada bloco = 1 PR mergeable.** Se um bloco não pode ser mergeado sem o próximo, eles deveriam ser um bloco só.
- **Cada bloco preserva a app funcionando.** Behind a feature flag se necessário (env var booleana, ex: `FEATURE_PERSONA_KB_ENABLED`).
- Cobertura ideal por bloco: 100–500 linhas. Maior que isso, divida.
- Ordem natural: schema/migration → repository → service → controller/endpoint → frontend hook → frontend UI → docs/changelog. Esse é o "stack" típico para PRs em sequência.

## Estimativa de escala (PREVC scale)

Calibre a expectativa do usuário/time:

| Escala | Tamanho típico | Exemplo |
|---|---|---|
| QUICK | 1 PR, <100 linhas | typo, rename, env default |
| SMALL | 1–2 PRs, <500 linhas | bug fix com regression spec, novo endpoint trivial |
| MEDIUM | 3–6 PRs, 500–2000 linhas | nova provider integration, refactor de área |
| LARGE | 6+ PRs, 2000+ linhas, multi-semana | feature cross-cutting com schema, UI, agent, docs |

LARGE features merecem PRD completo + ADR (`docs/architecture/decisions/`); QUICK não precisam de planning doc.

## Sequenciamento dos blocos

1. **Schema e migration** primeiro — a forma do dado dita o resto.
2. **Repositories e services** — a camada testável.
3. **Endpoint REST** — o contrato API.
4. **Frontend hooks** (SWR) — antes da UI.
5. **UI** — última, depois que o backend está estável.
6. **Docs e CHANGELOG** — atualizados em cada bloco, consolidados antes do release.

Inverter essa ordem é tentar pintar a casa antes de construir as paredes.

## Anti-padrões

- "Vamos só começar e ver onde dá" sem PRD — feature acaba refeita 3x.
- Bloco que mistura schema + UI + tests no mesmo PR — review impossível, rollback impossível.
- "Vou fazer tudo numa branch e mergear no fim" — incompatível com GitLab Flow do projeto.
- Estimar em horas em vez de em escala (`QUICK/SMALL/MEDIUM/LARGE`) — horas não capturam complexidade real.
- Pular o "Fora do escopo" — leva a scope creep em PR review.
- Definir UI antes do contrato API — gera retrabalho quando o backend cabe diferente do imaginado.

## Quando invocar dotcontext

Para features MEDIUM/LARGE, considere:

```
plan "<feature>" using dotcontext
```

O workflow PREVC vai sequenciar agents (`architect-specialist` → `feature-developer` → `test-writer` → `code-reviewer`) e materializar o plan em `.context/plans/`.

## Canonical references

- `CLAUDE.md` (raiz) — Document-First e API-First non-negotiables.
- `docs/planning/` — exemplos do estilo PRD que o repo já adota.
- `docs/planning/dotcontext-bootstrap.md` — exemplo de planning doc detalhado.
- `feature-developer` agent (em `.context/agents/`) — quem pega o plano e implementa.
- `code-reviewer` agent + `code-review` skill — o que o reviewer vai cobrar.
