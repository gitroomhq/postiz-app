# Chat (Mastra Agents + MCP Tools + Webhook IG) — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)
- **Avô:** [`/CLAUDE.md`](../../../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`src/ai/CLAUDE.md`](../ai/CLAUDE.md) — AI Provider System que este chat consome via `factory.textForMastra(...)`
  - [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — providers que as MCP tools acionam
  - [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md) — workflows que webhook IG dispara (follow-gate)

## O que vive aqui

Camada de agentes conversacionais (Mastra) + ferramentas MCP que o agente pode invocar + infraestrutura para o webhook do Instagram (que cria `PendingPostback` para o motor de Flows).

| Subdiretório / arquivo | Conteúdo |
|---|---|
| `mastra.service.ts` / `mastra.store.ts` | Bootstrap e store do Mastra agent |
| `agent.model.resolver.ts` | Resolve o `LanguageModel` lazy via factory de IA |
| `tools/` | 12+ MCP tools que o agente pode invocar |
| `vector/` | Helpers de vetorização para RAG (Knowledge Base) |
| `helpers/` | Helpers compartilhados |
| `start.mcp.ts` | Entry point para inicializar MCP server |
| `auth.context.ts` / `async.storage.ts` | Context propagation (org/profile) entre agent e tools |
| `oauth-middleware.ts` / `oauth-types.ts` | OAuth helper para endpoints autenticados de MCP |

## Padrões e Regras Específicas

### `LanguageModel` é lazy — não cache

O Agent Mastra **não pode** segurar um `LanguageModel` em campo. O modelo é resolvido em cada chamada via `factory.textForMastra(orgId, profileId)` (ver [`src/ai/CLAUDE.md`](../ai/CLAUDE.md) regra 4).

Se o admin trocar o provider em `Settings > AI Provider`, a próxima chamada do agent já reflete — não precisa reiniciar.

### Toda tool segue `AgentToolInterface`

Tools MCP estão em `tools/`. Cada tool implementa o contrato de `agent.tool.interface.ts`: schema Zod de input, execute async, descrição (`@RulesDescription` decorator quando aplicável).

### Context propagation é obrigatório

Identidade do usuário (org, profile) flui pelo `AsyncLocalStorage` em `async.storage.ts` + `auth.context.ts`. Tools que fazem ações de domínio (criar post, buscar integration) leem desse context — **nunca** receba `orgId` direto pelo schema da tool, isso é falsificável pelo prompt.

### Persona é injetada no system prompt

Ver `persona.helper.ts` em [`src/ai/`](../ai/CLAUDE.md). A persona do perfil ativo entra no system prompt do agente automaticamente — tools individuais não precisam carregar persona.

## Webhook do Instagram (HMAC)

Endpoint: `POST /public/ig-webhook` em `apps/backend/src/api/routes/ig-webhook.controller.ts`. Não vive aqui em `chat/`, mas a lógica de processamento (FlowsService) está em `database/prisma/flows/`.

### Validação HMAC obrigatória

Validar com **`FACEBOOK_APP_SECRET` E `INSTAGRAM_APP_SECRET`** (ambos!) — quando o app Meta tem ambos os produtos (Facebook + Instagram) no mesmo app, a Meta pode assinar com qualquer um dos secrets dependendo da origem do evento.

Não confie só num secret; tente os dois antes de retornar `403 Forbidden`.

### Fluxo follow-gate (2 etapas)

**Etapa 1 — Detecção do comentário:**

1. Webhook entrega `comment` no objeto `instagram`.
2. `FlowsService` decide qual flow triggar baseado em palavras-chave/regras.
3. Se for `comment_on_post` com follow-gate ativo: dispara `flow.execution.workflow.ts` (ver [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md)).
4. Workflow chama activity que faz `sendPrivateReply` **uma única vez** com botão postback ("Quero o link").
5. Activity grava `PendingPostback` no DB com `commentId`, `flowId`, `userId`, `payload`.

**Etapa 2 — Postback (clique no botão):**

1. Webhook entrega evento `messaging_postbacks`.
2. Backend faz lookup do `PendingPostback` pelo `payload`.
3. Dispara `follow-gate-resolve.workflow.ts` que valida se o usuário segue, busca o pending, e entrega o conteúdo final via DM regular (`sendMessage`) — **não** via `sendPrivateReply` (já foi consumido na etapa 1).

### Por que duas etapas?

Meta limita: **1 `sendPrivateReply` por comentário**. Após o postback, a janela de mensageria de 24h está aberta — usar DM regular dentro dessa janela é permitido sem `sendPrivateReply`.

## Mapa de Arquivos-Chave (tools/)

| Tool | Função |
|---|---|
| `extract-urls.tool.ts` | Extrai URLs de texto + título via fetch |
| `generate.image.tool.ts` | Gera imagem via `AiImageService` |
| `generate.video.tool.ts` / `generate.video.options.tool.ts` | Geração de vídeo (catálogo + execução) |
| `video.function.tool.ts` | Helpers de vídeo |
| `integration.list.tool.ts` | Lista integrations do usuário |
| `integration.schedule.post.ts` | Agenda post via `PostsService` |
| `integration.trigger.tool.ts` | Trigger manual de integration |
| `integration.validation.tool.ts` | Valida config de integration |
| `knowledge.query.tool.ts` | Consulta Knowledge Base do perfil (RAG) |
| `web-search.tool.ts` | Busca web via `AiWebSearchService` |
| `tool.list.ts` | Registro central das tools disponíveis |
| `tool.context.helper.ts` | Helper para extrair org/profile do AsyncLocalStorage |

## Workflows Comuns

### Adicionar tool MCP nova

1. **Spec primeiro** se a tool tem lógica não-trivial.
2. Criar `tools/<nome>.tool.ts` exportando objeto que cumpre `AgentToolInterface`: `id`, `description`, `inputSchema` (Zod), `execute(input, context)`.
3. **Não receba `orgId`/`profileId` no schema** — leia do `AsyncLocalStorage` via `tool.context.helper.ts`.
4. Registrar em `tool.list.ts`.
5. Se a tool acessa AI: use `factory` de [`src/ai/`](../ai/CLAUDE.md) — não chame OpenAI/OpenRouter direto.
6. Se a tool aciona integration: use `IntegrationManager` (em `database/prisma/integrations/`).

### Adicionar tipo de Flow novo (ex.: `comment_on_post` para `dm_to_followers`)

1. Atualizar enum em `database/prisma/schema.prisma` + migration.
2. Lógica de roteamento em `flows.service.ts` (em `database/prisma/flows/`).
3. Activity correspondente em `apps/orchestrator/src/activities/flow.activity.ts`.
4. **Atualizar wizard E Flow Builder node-config-panel** — paridade obrigatória (regra do monorepo).
5. Spec cobrindo o caminho completo (webhook → service → activity).

### Debugar webhook IG

1. `temporal workflow describe <workflowId>` para ver estado.
2. Logar `commentId` na criação do `PendingPostback` e correlacionar com o evento de postback.
3. Se HMAC falha: confirme que **AMBOS** os secrets estão setados (`FACEBOOK_APP_SECRET`, `INSTAGRAM_APP_SECRET`).
4. Tail dos logs do webhook controller — eventos chegam em formato `entry[]` com `messaging[]` ou `changes[]`.

## Armadilhas Conhecidas

1. **Sintoma:** `403 Forbidden` no webhook IG mesmo com config correta → **Causa:** validação HMAC só com um secret. **Correção:** validar com `FACEBOOK_APP_SECRET` E `INSTAGRAM_APP_SECRET`.
2. **Sintoma:** Mastra agent reusa modelo antigo após troca de provider → **Causa:** modelo cacheado no agent. **Correção:** use `factory.textForMastra(...)` (lazy) sempre.
3. **Sintoma:** `sendPrivateReply` retornando "subcode 2018278" → **Causa:** segunda chamada para o mesmo comentário. **Correção:** usar `sendMessage` (DM regular) na etapa 2 dentro da 24h window.
4. **Sintoma:** tool MCP recebendo `orgId` falsificado pelo prompt → **Causa:** `orgId` no schema de input. **Correção:** remover do schema; ler do `AsyncLocalStorage`.
5. **Sintoma:** RAG não retorna resultados → **Causa:** pgvector não habilitado, ou embeddings não geradas. **Correção:** verificar imagem `pgvector/pgvector:pg17` e re-rodar pipeline de chunking; ver [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md).
6. **Sintoma:** Flow novo no wizard não aparece no Flow Builder visual → **Causa:** atualizou só uma das UIs. **Correção:** atualizar **wizard + node-config-panel** (paridade — ambos consomem o mesmo `triggerConfig`).

## Comandos

```bash
# Specs do chat
pnpm jest libraries/nestjs-libraries/src/chat/ --no-coverage
```

## Referências

- [`docs/architecture/instagram-automations.md`](../../../../docs/architecture/instagram-automations.md) — referência canônica de Flows, credenciais, follow-gate, armadilhas
- [`docs/automacoes-instagram.md`](../../../../docs/automacoes-instagram.md) — guia do usuário
- [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md) — pipeline RAG
- [`src/ai/CLAUDE.md`](../ai/CLAUDE.md) — `factory.textForMastra`, persona helper
- [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — providers IG e camadas de credencial Meta
- [`apps/orchestrator/CLAUDE.md`](../../../../apps/orchestrator/CLAUDE.md) — `flow.execution.workflow.ts`, `follow-gate-resolve.workflow.ts`
