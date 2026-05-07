# AI Provider System — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)
- **Avô:** [`/CLAUDE.md`](../../../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`src/chat/CLAUDE.md`](../chat/CLAUDE.md) — Mastra agents que consomem o factory deste sistema
  - [`src/integrations/social/CLAUDE.md`](../integrations/social/CLAUDE.md) — providers que usam o mesmo padrão de credencial encriptada
- **Documento canônico:** [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md) — schema, services, cadeia de resolução, endpoints, UI Settings, troubleshooting completo

## O que vive aqui

Sistema central de provedores de IA do Robô MultiPost. Configuração é **per-workspace via UI** (`Settings > AI Provider`), não via env var. Cada `kind` (TEXT, IMAGE, VIDEO, WEB_SEARCH) é configurável com provider (OpenRouter ou OpenAI direto), API key, modelo, fallback e opções. Inclui também:

- **Sistema de Créditos de IA** — controla quantas imagens/vídeos cada perfil gera por mês
- **Persona por perfil** — tom de voz, público-alvo, CTAs, restrições, estilo de imagem
- **Knowledge Base (RAG)** — upload de PDF/TXT/MD com chunking + embeddings, consultado via tool `knowledgeBaseQuery`

## Regras de Ouro

### 1. Configuração é per-workspace via UI

Admin acessa `Settings > AI Provider` e configura cada kind. **Não há fallback para env var de provider** (exceto credenciais de teste). API key armazenada com **AES-256-GCM** (mesma `ENCRYPTION_KEY` do OAuth — ver [`libraries/nestjs-libraries/CLAUDE.md`](../../CLAUDE.md)).

### 2. Toda resolução passa pelo `AiProviderResolverService`

```
PROFILE → WORKSPACE com shareDefault → HTTP 412
```

**Nunca** acesse `AiCredential` direto — sempre via `AiProviderResolverService`. Se a credencial não existe nem na cadeia, o resolver lança erro que vira **HTTP 412 Precondition Failed**.

### 3. Erro 412, não 402

`HTTP 402` é interceptado pelo `layout.context` global do Postiz para abrir modal de billing. Para "credencial de IA não configurada", o status semântico é **412 Precondition Failed**. Frontend abre modal apropriado em cima de 412, não 402.

### 4. Use `AiClientFactory` para consumers novos

```typescript
import { AiClientFactory } from '@gitroom/nestjs-libraries/ai/ai-client.factory';

// Texto: retorna LanguageModel do AI SDK v5
const model = await factory.text(orgId, profileId);

// Imagem: retorna base64 (fetch direto, não AI SDK por incompatibilidade)
const base64 = await aiImageService.generate(orgId, prompt, profileId);

// Mastra Agent: retorna funcao async lazy
//   o modelo e resolvido em CADA chamada do agent, sem reiniciar a instancia
const modelFn = await factory.textForMastra(orgId, profileId);
```

### 5. Per-profile override

- Perfil **default** (`isDefault=true`) edita workspace. Mudanças afetam todos.
- Perfil **secundário** pode criar override em `scope=PROFILE` sem afetar o default.
- Detectado no frontend via `useCurrentProfile()` hook.

## Sistema de Créditos de IA

Controla quantas imagens/vídeos cada perfil gera por mês.

### Modos de operação (`AI_CREDITS_MODE`)

| Modo | Comportamento |
|------|---|
| `unlimited` (default) | Todos os perfis geram sem limite. Uso registrado para analytics. |
| `managed` | Créditos gerenciados por perfil. Perfil default (admin) sempre ilimitado. |

### Cadeia de precedência (modo managed)

```
1. AI_CREDITS_MODE=unlimited           → SEMPRE ilimitado (ignora tudo)
2. Perfil default (isDefault=true)     → sempre ilimitado
3. Profile.aiImageCredits/aiVideoCredits (se preenchido) → usa esse valor
4. AI_CREDITS_DEFAULT_IMAGES / _VIDEOS  → default para novos perfis
5. Fallback                             → ilimitado (-1)
```

### Valores especiais

| Valor | Significado |
|---|---|
| `null` | Usar padrão da env var ou fallback ilimitado |
| `-1` | Ilimitado para este perfil |
| `0` | Bloqueado (sem créditos) |
| `N > 0` | N créditos por mês |

### Env vars

```env
AI_CREDITS_MODE="unlimited"           # "unlimited" ou "managed"
# AI_CREDITS_DEFAULT_IMAGES=50        # default novos perfis (managed)
# AI_CREDITS_DEFAULT_VIDEOS=10
```

### Endpoints REST (no backend)

```
GET  /copilot/credits?type=ai_images|ai_videos  → { credits: number }
GET  /settings/profiles/:id/ai-credits          → config + uso (ADMIN)
PUT  /settings/profiles/:id/ai-credits          → atualiza config (ADMIN, nao edita default)
GET  /settings/ai-credits/summary               → lista perfis com creditos e uso (ADMIN)
```

### Arquivos do sistema de créditos

| Arquivo | Finalidade |
|---|---|
| `database/prisma/subscriptions/subscription.service.ts` | Service principal de créditos |
| `database/prisma/subscriptions/subscription.repository.ts` | Repository de Credits/Profile |
| `database/prisma/schema.prisma` | Campos `aiImageCredits`/`aiVideoCredits` em Profile, `profileId` em Credits |
| `apps/frontend/src/components/settings/ai-credits.settings.component.tsx` | Settings panel |
| `apps/frontend/src/components/launches/ai.image.tsx` / `ai.video.tsx` | Badges de créditos |
| `database/prisma/subscriptions/__tests__/subscription.service.spec.ts` | Specs |

## Persona e Knowledge Base

### Persona (texto)

Cada perfil pode ter **persona**: tom de voz, público-alvo, CTAs preferidos, restrições, estilo de imagem. Injetada automaticamente no:

- Agente Mastra (ver [`src/chat/CLAUDE.md`](../chat/CLAUDE.md))
- Generator LangGraph
- Prompts DALL-E

Helper: `persona.helper.ts` neste diretório.
Doc canônico: [`docs/architecture/profile-ai-persona.md`](../../../../docs/architecture/profile-ai-persona.md).

### Knowledge Base (RAG vetorial)

Upload de PDF/TXT/MD por perfil. Pipeline: chunking → embeddings → busca vetorial. Consultado pela tool `knowledgeBaseQuery` antes do agente gerar fatos específicos.

- **Requer `pgvector/pgvector:pg17`** no Postgres.
- Feature flag: `ENABLE_KNOWLEDGE_BASE` (default `true`).
- Doc canônico: [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md).

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `ai.module.ts` | NestJS module — exporta factory, services, resolver |
| `ai-client.factory.ts` | Factory canônica para consumers (text / textForMastra / image / web-search) |
| `ai-provider-resolver.service.ts` | Cadeia de resolução PROFILE → WORKSPACE → 412 |
| `ai-credential.service.ts` | CRUD de credenciais com encryption AES-256-GCM |
| `ai-credential.repository.ts` | Repository de `AiCredential` |
| `ai-credential.schemas.ts` | Zod schemas (config por kind/provider) |
| `ai-catalog.service.ts` | Cache do catálogo OpenRouter (modelos disponíveis) |
| `ai-catalog.static.ts` | Lista estática de modelos curados (image/video) |
| `ai-text.service.ts` | Service de geração de texto |
| `ai-image.service.ts` | Service de geração de imagem (base64, fetch direto) |
| `ai-web-search.service.ts` | Service de busca web (Tavily/etc.) |
| `ai-provider-test.service.ts` | Endpoint de teste de credencial |
| `persona.helper.ts` | Injeção de persona em system prompts |

## Workflows Comuns

### Adicionar consumer novo de IA

1. **Não use cliente HTTP direto** para chamar OpenAI/OpenRouter. Use `AiClientFactory`.
2. **Texto** (LangGraph, Mastra, code path direto): `factory.text(orgId, profileId)`.
3. **Mastra Agent**: `factory.textForMastra(orgId, profileId)` — retorna função async lazy. **Crítico**: não cache o modelo dentro do agente; resolva em cada chamada.
4. **Imagem**: `aiImageService.generate(orgId, prompt, profileId)`.
5. **Web Search**: `aiWebSearchService.search(...)`.
6. Spec primeiro (RED): mock o resolver/factory com `createMock`.

### Adicionar provider novo (ex.: novo provedor de imagem)

1. Definir schema Zod em `ai-credential.schemas.ts`.
2. Atualizar `ai-catalog.static.ts` com modelos suportados.
3. Estender `AiClientFactory` com construtor para o provider.
4. UI em `apps/frontend/src/components/settings/ai-provider/` com card + form.
5. Adicionar specs cobrindo resolução PROFILE → WORKSPACE.
6. Doc em [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md).

### Mudar política de créditos

Tudo passa por `subscription.service.ts`. Se mudar a cadeia de precedência, atualize os specs em `subscription.service.spec.ts` E os testes de UI no frontend.

## Armadilhas Conhecidas

1. **Sintoma:** Modal de billing abre quando IA não está configurada → **Causa:** controller retornou 402. **Correção:** trocar para 412 Precondition Failed.
2. **Sintoma:** Mastra Agent reusa modelo antigo após admin mudar provider → **Causa:** modelo cacheado dentro do Agent. **Correção:** use `factory.textForMastra(...)` (lazy resolver) — não armazene `LanguageModel` em campo.
3. **Sintoma:** AES decryption retornando lixo → **Causa:** `ENCRYPTION_KEY` mudou entre deploys. **Correção:** preserve a key. Rotacionar exige migration de re-encrypt em massa.
4. **Sintoma:** geração de imagem com OpenAI funciona via curl mas falha no app → **Causa:** AI SDK incompatível para imagem. **Correção:** `AiImageService.generate` usa **fetch direto**, não AI SDK. Não migre.
5. **Sintoma:** créditos não decrementam para novo perfil → **Causa:** `Profile.profileId` não preenchido em `Credits` ao criar. **Correção:** ver `subscription.service.spec.ts` para o caminho correto de criação.
6. **Sintoma:** "fallback ilimitado" inesperado em modo managed → **Causa:** `AI_CREDITS_MODE` não setado, ou `aiImageCredits=null` cai em fallback. **Correção:** revise a cadeia de precedência (ordem importa).

## Comandos Úteis

```bash
# Specs do AI Provider System (56 specs)
pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage

# Limpar cache do catalogo OpenRouter
curl -X POST -H "Cookie: <session>" http://localhost:3000/ai/catalog/refresh
```

## Referências

- [`docs/architecture/ai-provider-system.md`](../../../../docs/architecture/ai-provider-system.md) — schema, services, cadeia de resolução, UI, troubleshooting (LEITURA OBRIGATÓRIA antes de mexer)
- [`docs/architecture/profile-ai-persona.md`](../../../../docs/architecture/profile-ai-persona.md)
- [`docs/architecture/knowledge-base-rag.md`](../../../../docs/architecture/knowledge-base-rag.md)
- [`docs/architecture/credential-validation.md`](../../../../docs/architecture/credential-validation.md)
- [`src/chat/CLAUDE.md`](../chat/CLAUDE.md) — agentes Mastra que consomem este sistema
