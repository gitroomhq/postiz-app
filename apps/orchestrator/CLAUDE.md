# Orchestrator (NestJS + Temporal.io) — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`/CLAUDE.md`](../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`apps/backend/CLAUDE.md`](../backend/CLAUDE.md) — controllers que disparam workflows daqui
  - [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) — services que activities consomem
  - [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) — providers chamados pelas activities
  - [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) — webhook IG que cria PendingPostback resolvido aqui

## O que vive aqui

Worker Temporal.io que executa **workflows** (orquestração durável) e **activities** (chamadas reais a serviços externos). Cobre: agendamento de posts, autopost, repost, refresh de token OAuth, envio de email, missing-post, streaks, e o motor de **flows do Instagram** (follow-gate, comentários, DMs).

Não confundir com o `apps/backend`: o backend cria workflows (via `WorkflowClient`); o orchestrator é o **worker** que os executa.

## Padrões e Regras Específicas

### Workflows × Activities (regra de ouro Temporal)

- **Workflows** são determinísticos. Nunca chame APIs HTTP, leia/grave em DB ou use `Date.now()` direto dentro de workflow — isso quebra a re-execução determinística.
- **Activities** são onde o I/O acontece. Toda chamada a `IntegrationManager`, Prisma, Meta API, etc. é wrapada em activity.
- Workflows orquestram chamando activities via `proxyActivities<typeof import('../activities/...')>({ ... })`.

### Signals para fluxos pendentes

Sinais (`@SignalMethod`) só são despachados em workflow vivo. Padrão usado:

- `flow.execution.workflow.ts` cria um **PendingPostback** no DB e fica esperando.
- `follow-gate-resolve.workflow.ts` recebe o sinal de webhook (botão postback clicado) e resume o flow original.
- Sem sinal, o workflow expira por timeout configurado.

### Roteamento de host/token Instagram (`resolveIgRoute`)

**Decisão única** de qual host (`graph.facebook.com` vs `graph.instagram.com`) e qual token (Page Access Token, IG User Token cadastrado, IG User Token "standalone") usar para cada activity de comentário.

Função canônica: `resolveIgRoute` em `libraries/nestjs-libraries/src/integrations/social/instagram-route.resolver.ts`.
Wrapper local: `FlowActivity.resolveIgRoute(integration)` em `src/activities/flow.activity.ts` (linhas 29–36) que injeta `_instagramMessagingService`.

**Prioridade de resolução**:

1. `providerIdentifier === 'instagram-standalone'` → IG User Token do `Integration.token`, host `graph.instagram.com`
2. IG User Token cadastrado em `Credentials.instagramTokens` → host `graph.instagram.com`
3. Fallback: Page Access Token do `Integration.token`, host `graph.facebook.com`

**Nunca** hardcode host/token — sempre via `resolveIgRoute`.

### Follow-gate em 2 etapas (`comment_on_post`)

1. Comentário detectado pelo webhook IG (em `apps/backend/src/api/routes/ig-webhook.controller.ts`).
2. Backend dispara `flow.execution.workflow.ts` → activity envia `sendPrivateReply` UMA VEZ com botão postback ("Quero o link"). Salva `PendingPostback` no DB.
3. Usuário clica no botão → webhook IG entrega o postback → backend dispara `follow-gate-resolve.workflow.ts`.
4. `follow-gate-resolve.workflow.ts` valida que segue, faz lookup do `PendingPostback`, e dispara a entrega final (DM com payload, ou nova mensagem).

**Regra crítica**: `sendPrivateReply` só pode ser chamado **UMA VEZ por comentário** (Meta limita). A segunda mensagem precisa ser via DM regular (`sendMessage`) apoiada na 24h messaging window aberta pelo postback.

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `src/main.ts` | Bootstrap NestJS + registra Worker Temporal |
| `src/app.module.ts` | Module raiz com providers das activities |
| `src/health.controller.ts` | Healthcheck HTTP |
| `src/workflows/index.ts` | Re-exporta todos os workflows registrados |
| `src/workflows/autopost.workflow.ts` | Geração + agendamento automático de posts |
| `src/workflows/post-workflows/` | Pipeline real de publicação por canal |
| `src/workflows/flow.execution.workflow.ts` | Motor de Flows (Instagram automations) — etapa 1 do follow-gate |
| `src/workflows/follow-gate-resolve.workflow.ts` | Etapa 2 do follow-gate (resolve postback) |
| `src/workflows/refresh.token.workflow.ts` | Refresh periódico de tokens OAuth |
| `src/workflows/repost.workflow.ts` | Repost agendado |
| `src/workflows/missing.post.workflow.ts` | Detector + retry de posts que falharam |
| `src/workflows/digest.email.workflow.ts` / `send.email.workflow.ts` / `streak.workflow.ts` | Email digests, envio direto, streaks |
| `src/activities/flow.activity.ts` | Activities de Flow (comentário, DM, follow check) — wrapper de `resolveIgRoute` |
| `src/activities/post.activity.ts` | Activity de publicação real (chama `IntegrationManager`) |
| `src/activities/integrations.activity.ts` | Activities de integration (refresh token, etc.) |
| `src/signals/` | Definições de signals dos workflows |

## Workflows Comuns

### Adicionar workflow novo

1. **Spec primeiro** (TDD): se a lógica é complexa (não trivial orquestração), escreva spec da activity correspondente em libs (ver [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md) para padrão de specs).
2. Criar `src/workflows/<nome>.workflow.ts` exportando uma função async que recebe params e retorna resultado.
3. Activities consumidas por esse workflow vão em `src/activities/<nome>.activity.ts` ou em activity existente. **A lógica real fica em service de lib**; a activity só wrapeia para Temporal.
4. Registrar em `src/workflows/index.ts`.
5. **Disparo do workflow**: do backend, via `WorkflowClient` (ver controllers existentes em `apps/backend/src/api/routes/` para exemplos).
6. **CHANGELOG.md** em `[Unreleased]`.

### Adicionar activity nova

1. Service real em `libraries/nestjs-libraries/src/...` com spec.
2. Activity em `src/activities/...activity.ts` injetando o service e exportando método. Activity sozinha **não** faz lógica — só chama o service.
3. Registrar provider no `app.module.ts` se for class-based.

### Adicionar etapa nova ao motor de Flows do IG

Toda etapa de Flow deve passar por `resolveIgRoute` se for fazer chamadas Meta. Ver `flow.activity.ts:65` e `:129` como referência. Para um novo tipo de step (além de `comment_on_post`, `dm`, etc.), atualize **a wizard E o Flow Builder node-config-panel** — ambos consomem o mesmo `triggerConfig` JSON.

## Armadilhas Conhecidas

1. **Sintoma:** workflow "trava" sem completar mesmo após sinal externo → **Causa:** sinal sendo despachado para workflowId errado ou workflow já expirou. **Correção:** loggar `workflowId` ao criar `PendingPostback` e ao receber webhook; checar `temporal workflow describe <id>`.
2. **Sintoma:** activity de comentário Instagram retornando 400/403 inesperado → **Causa:** host/token incorreto (ex.: tentando usar Page Access Token contra `graph.instagram.com`). **Correção:** confirmar que está usando `resolveIgRoute(integration)` e não hardcode.
3. **Sintoma:** `sendPrivateReply` segundo retorno com erro "subcode 2018278" → **Causa:** Meta permite apenas UMA reply privada por comentário. **Correção:** segunda mensagem deve ser DM regular dentro da janela de 24h aberta pelo postback.
4. **Sintoma:** workflow não-determinístico após replay (`Workflow execution had errors`) → **Causa:** chamada direta de API/DB/Date.now() dentro do workflow. **Correção:** mover para activity.
5. **Sintoma:** novo campo do Flow não aparece no Flow Builder visual → **Causa:** atualizou só a wizard. **Correção:** atualize também o `node-config-panel` do Flow Builder — ambos consomem o mesmo `triggerConfig` (regra de paridade).
6. **Sintoma:** webhook IG entrega postback mas o follow-gate-resolve não dispara → **Causa:** HMAC inválido ou `PendingPostback` não foi criado/foi expirado. **Correção:** ver [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) para validação de webhook (FACEBOOK_APP_SECRET + INSTAGRAM_APP_SECRET).

## Comandos

```bash
pnpm build:orchestrator
pnpm dev                  # Sobe orchestrator junto
# Temporal UI local em http://localhost:8233 (docker-compose.dev.yaml)
```

## Referências

- [`docs/architecture/instagram-automations.md`](../../docs/architecture/instagram-automations.md) — mapa completo do subsistema de Flows IG
- [`docs/automacoes-instagram.md`](../../docs/automacoes-instagram.md) — guia do usuário das automações
- [`libraries/nestjs-libraries/src/chat/CLAUDE.md`](../../libraries/nestjs-libraries/src/chat/CLAUDE.md) — webhook IG, validação HMAC, PendingPostback
- [`libraries/nestjs-libraries/src/integrations/social/CLAUDE.md`](../../libraries/nestjs-libraries/src/integrations/social/CLAUDE.md) — `resolveIgRoute`, providers IG, 3 camadas de credencial Meta
