# AI Provider System — Agent Reference

Documento destinado a agentes de IA (Claude, Cursor, etc.) e ao time de
engenharia para **entender rapidamente** como o sistema de provedores de
IA do Robo MultiPost funciona, onde cada credencial e usada, e quais sao
os pontos de entrada mais comuns para mudancas.

> Usuarios finais: nao ha doc dedicado ainda — ver Settings > AI Provider
> na propria UI (cada card tem helper text).

---

## 1. Visao geral

O Robo MultiPost permite que cada **workspace** configure seus proprios
provedores de IA (chaves + modelos + opcoes) para 4 tipos de uso:

- `TEXT` — LLM usado pelo agente Mastra, gerador de posts e botao
  "IA Texto" do composer
- `IMAGE` — geracao de imagem (DALL-E, gpt-image, Gemini Nano Banana,
  Flux, etc.) usada pelo botao "AI Image" do composer
- `VIDEO` — geracao de video (KieAI Veo3 hoje) — UI marcada como
  "Em breve" ate consumer ser migrado
- `WEB_SEARCH` — busca web do agente (Tavily, Firecrawl) — UI marcada
  como "Em breve" ate o tool ser registrado no agent

Cada workspace tem:
- 1 perfil **default** (a "agencia" — `Profile.isDefault=true`)
- N perfis secundarios (os "clientes")

A cadeia de resolucao por chamada e:
```
PROFILE (override do cliente)
   |
   v se nao existe
WORKSPACE (default da agencia, com shareDefault=true)
   |
   v se nao compartilha ou nao existe
HTTP 412 Precondition Failed -> "Configure suas chaves em Settings > AI"
```

---

## 2. Schema Prisma

### 2.1. AiProviderCredential

Localizacao: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
(linha ~942).

```prisma
model AiProviderCredential {
  id             String   @id @default(cuid())
  organizationId String
  profileId      String?
  scope          AiScope
  kind           AiKind
  provider       String      // 'openrouter' | 'openai' | 'tavily' | 'kieai'
  model          String?
  fallbackModel  String?
  options        Json?       // estrutura tipada por kind via Zod
  encryptedData  String   @db.Text   // {apiKey: '...'} encriptado
  shareDefault   Boolean  @default(true)
  keyVersion     Int      @default(1)
  lastUsedAt     DateTime?
  lastTestStatus String?     // 'ok' | 'failed' | null
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, profileId, scope, kind])
}

enum AiScope { WORKSPACE PROFILE }
enum AiKind  { TEXT IMAGE VIDEO WEB_SEARCH }
```

### 2.2. Por que `scope` e nao apenas `profileId IS NULL`?

Postgres trata `NULL` em `UNIQUE` index como **distinto** — entao
`(orgId, NULL, 'TEXT')` poderia ser inserido **multiplas vezes** sem
erro. Adicionar `scope` enum elimina essa armadilha: a unique key
composta sempre tem valor concreto para todas as colunas.

Convencao de uso:
- `scope=WORKSPACE` -> `profileId=null`
- `scope=PROFILE`   -> `profileId` setado para o cliente

O `AiCredentialRepository` valida e enforce esta convencao em todos os
metodos (`findOne`, `upsert`, `delete`).

### 2.3. Criptografia

`encryptedData` usa o `EncryptionService` existente em
`libraries/nestjs-libraries/src/crypto/encryption.service.ts` (mesma
chave AES-256-GCM ja usada para credenciais OAuth). A chave mestra vem
de `process.env.ENCRYPTION_KEY` (fallback em `JWT_SECRET`).

O service NUNCA expoe `apiKey` no formato `RedactedAiCredential` — em
vez disso devolve o sentinel `__REDACTED__`. O frontend mostra como
`••••••••` quando a chave esta salva e bloqueia o input ate o admin
clicar em "Editar".

---

## 3. Camadas de servicos

Diretorio: `libraries/nestjs-libraries/src/ai/`

```
                      Controllers
                          |
                          v
               +------------------------+
               |   AiCredentialService  | <-- CRUD + encrypt + SENTINEL
               +-----------+------------+
                           |
                           v
               +------------------------+
               | AiProviderResolverSvc  | <-- cadeia profile -> ws -> 412
               +-----------+------------+
                           |
                           v
               +------------------------+
               |   AiClientFactory      | <-- LanguageModel / ImageModel
               +-----+------------+-----+
                     |            |
                     v            v
       +--------------------+   +-------------------+
       |  AiTextService     |   |  AiImageService   | <-- fetch direto
       +---------+----------+   +-------------------+
                 |
                 v consumers (Bloco C)
       +--------------------+
       | LoadToolsService   | (Mastra agent dynamic model)
       | OpenaiService      | (limpo, so generateVoiceFromText
       |                    |  e generateSlidesFromText sobreviveram)
       | MediaService       | (gerar imagem -> AiImageService)
       | PostsService       | (separatePosts -> AiTextService)
       +--------------------+

       AiCatalogService    (independente — fetch /api/v1/models do
                            OpenRouter + catalogos estaticos cacheados
                            em Redis 1h)
       AiProviderTestSvc   (testa apiKey contra os providers reais)
```

### 3.1. AiCredentialService

`ai-credential.service.ts` — CRUD encriptado.

- `save(orgId, scope, kind, payload, profileId?)` — encripta apiKey,
  valida `options` com `optionsSchemaFor(kind)` (Zod), suporta SENTINEL
  para preservar chave existente
- `getRedacted(...)` — retorna com `apiKey='__REDACTED__'`
- `getRaw(...)` — retorna apiKey decriptada (USO INTERNO)
- `test(...)` — chama `AiProviderTestService.test()` e atualiza
  `lastTestStatus`
- `markUsed(credentialId)` — atualiza `lastUsedAt` em background

### 3.2. AiProviderResolverService

`ai-provider-resolver.service.ts` — Cadeia de resolucao por chamada.

```ts
async resolve(orgId, kind, profileId?): Promise<ResolvedAiCredential>
```

Logica:
1. Se `profileId` fornecido → busca scope=PROFILE
2. Se nao tem (ou nao existe) → busca scope=WORKSPACE
3. Se workspace existe **e** `(profileId ausente OU shareDefault=true)` → usa
4. Se workspace existe mas `shareDefault=false` e ha profileId → 412 com
   mensagem especifica "perfil sem chave e workspace nao compartilha"
5. Se nada existe → 412 com mensagem "Configure suas chaves em
   Settings > AI"

`markUsed` e disparado em background (sem await) para nao bloquear o
caller se o DB lentar.

### 3.3. AiClientFactory

`ai-client.factory.ts` — Cria clientes prontos para o Vercel AI SDK v5.

- `text(orgId, profileId?)` -> `{ provider, model, fallbackModel, options, credentialId }`
- `image(orgId, profileId?)` -> idem mas com ImageModel
- `textForMastra(orgId, profileId?)` -> retorna **funcao async lazy**
  que resolve o modelo a cada chamada — usado no Mastra Agent para que
  trocar credencial em runtime nao exija reiniciar o singleton

Internamente usa `createOpenRouter({apiKey})` ou `createOpenAI({apiKey})`
do AI SDK v5. Para imagem em OpenRouter, retorna o `provider(modelId)`
direto (LanguageModelV2) porque OpenRouter v1.2 nao expoe `imageModel()`
— a chamada de imagem passa pelo `AiImageService` (proximo).

### 3.4. AiTextService

`ai-text.service.ts` — Substitui metodos legados do `OpenaiService`.

Metodos:
- `generatePosts(orgId, content, profileId?)` -> 5 tweets + 5 threads
- `generatePromptForPicture(orgId, prompt, profileId?)` -> prompt
  detalhado para gerar imagem
- `separatePosts(orgId, content, len, profileId?)` -> split de threads
- `extractWebsiteText(orgId, content, profileId?)` -> extrai artigo +
  gera variacoes
- `caption(orgId, action, content, opts, profileId?)` -> gera ou
  melhora legenda (action: 'generate'|'improve')
- `generateSlidesFromText(orgId, text, profileId?)` -> compatibilidade
  com ImageSlides (dormente)

Cada metodo:
1. Chama `factory.text(orgId, profileId)` para resolver credencial
2. Aplica `temperature` etc das `options`
3. Usa `generateText` ou `generateObject` do `ai` SDK v5
4. **Fallback automatico**: se o modelo principal lancar erro, retenta
   com `fallbackModel`. Se ambos falharem, propaga o erro do principal

Specs cobertos: 9 testes em `ai-text.service.spec.ts`.

### 3.5. AiImageService

`ai-image.service.ts` — Geracao de imagem por **fetch direto** (sem AI
SDK porque o suporte a image nas versoes atuais e desigual).

```ts
async generate(orgId, prompt, profileId?): Promise<{
  base64: string;
  provider: string;
  model: string;
  credentialId: string;
}>
```

- **OpenAI**: `POST /v1/images/generations` com `quality`, `size`
  (mapeado de `aspectRatioDefault`), `n`, `response_format=b64_json`
- **OpenRouter**: `POST /v1/chat/completions` com
  `modalities: ['image', 'text']` e `image_config: { aspect_ratio,
  image_size }`. Resposta vem em `choices[0].message.images[0].image_url.url`
  (data URL `data:image/png;base64,...`) — normalizado para base64 puro

Outros providers lancam HTTP 400 "provider sem suporte para imagem".

### 3.6. AiCatalogService

`ai-catalog.service.ts` — Lista de modelos disponiveis.

- OpenRouter: fetch dinamico em `/api/v1/models?output_modalities=text|image|video`
- OpenAI / Tavily / KieAI: catalogo estatico em `ai-catalog.static.ts`
  (atualizar manualmente quando lancar modelo novo)
- Cache em Redis: key `ai:catalog:{provider}:{kind}` TTL 1h
- `refresh()` admin-only invalida todas as keys `ai:catalog:*`

### 3.7. AiProviderTestService

`ai-provider-test.service.ts` — Validacao de apiKey.

- OpenRouter: GET `/api/v1/key`
- OpenAI: GET `/v1/models`
- Tavily: POST `/search` com query trivial
- KieAI: aceita true (sem endpoint de validacao publico)

---

## 4. Endpoints REST

Todos os endpoints sao **admin-only** para escrita
(`@CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])`).

### 4.1. /ai/credentials

`apps/backend/src/api/routes/ai-credentials.controller.ts`

| Metodo | Rota | Body / Query | Retorna |
|---|---|---|---|
| GET | `/ai/credentials` | — | array `RedactedAiCredential[]` (todas as configuracoes da org) |
| GET | `/ai/credentials/:kind?profileId=X` | — | `RedactedAiCredential \| null` |
| PUT | `/ai/credentials/:kind?profileId=X` | `SaveAiCredentialPayload` | salva e retorna redacted |
| DELETE | `/ai/credentials/:kind?profileId=X` | — | 204 |
| POST | `/ai/credentials/:kind/test?profileId=X` | — | `{ ok: boolean, error?: string }` |

**Resolucao de scope** (metodo privado `resolveScope`):
- Sem `profileId` ou perfil com `isDefault=true` → `WORKSPACE`
- Perfil com `isDefault=false` → `PROFILE`
- Profile inexistente ou de outro org → 404

### 4.2. /ai/catalog

| Metodo | Rota | Retorna |
|---|---|---|
| GET | `/ai/catalog/:kind?provider=openrouter` | `CatalogResponse` |
| POST | `/ai/catalog/refresh` | `{ cleared: number }` (admin) |

### 4.3. /ai/text

| Metodo | Rota | Body | Retorna |
|---|---|---|---|
| POST | `/ai/text/caption` | `{ action, content, platform?, tone? }` | `{ text }` |

Rate limit: `@Throttle({ default: { limit: 30, ttl: 60_000 } })` —
sobrescreve o default global (30/h) para 30/min por usuario.

---

## 5. UI — Settings > AI Provider

Localizacao: `apps/frontend/src/components/settings/ai-provider/`.

### 5.1. Estrutura

```
AiProviderSettingsSection (root)
   |
   +-- AiKindCard (TEXT)        \
   +-- AiKindCard (IMAGE)        \  cada um com:
   +-- AiKindCard (VIDEO, soon)  /  + CardHeader
   +-- AiKindCard (WEB_SEARCH, soon) /  + CardStatus (header inline)
                                       + CardBody
                                          | -> InheritedView (perfil secundario sem override)
                                          | -> CredentialForm (workspace ou override)
                                          |
                                          + SearchableModelSelect (modelo + fallback)
                                          + DynamicOptions (por kind+provider)
```

### 5.2. SearchableModelSelect

Combobox proprio (`searchable-model-select.tsx`) com input de busca por
texto — necessario porque OpenRouter tem 400+ modelos. Aceita `icon`
por opcao (usado tanto no provider quanto nos modelos no futuro).
Suporta `searchable=false` para dropdowns curtos.

### 5.3. SENTINEL pattern

- API key salva volta como `__REDACTED__` no GET
- Frontend renderiza como `••••••••` (mask) e desabilita input
- Ao clicar "Editar", limpa e permite digitar nova chave
- Ao salvar com `apiKey === SENTINEL` → backend preserva chave existente

### 5.4. Per-profile override

Detectado via `useCurrentProfile()` hook (combina `useUser()` + SWR
`profiles`).

| Cenario | UI |
|---|---|
| Admin no perfil **default** | Form workspace + checkbox "Compartilhar com perfis" |
| Admin no perfil **secundario** sem override | Banner "Herdando da agencia · Provider · Modelo" + botao "Configurar chave propria deste perfil" |
| Admin no perfil **secundario** com override | Form normal + banner amarelo "Configuracao exclusiva deste perfil" + botao "Remover override" (apaga so a row PROFILE) |

### 5.5. Hooks

`apps/frontend/src/hooks/`:

- `use-ai-credentials.hook.ts` — `useAiCredential(kind, profileId?)`
  com cache key separado por scope+profileId
- `use-ai-catalog.hook.ts` — `useAiCatalog(kind, provider)` com TTL 60s
- `use-current-profile.hook.ts` — reusa SWR key `'profiles'` ja
  populada pelo `ProfileSelector` (sem fetch novo)

`dedupingInterval` 30-60s evita refetch concorrente.

---

## 6. Composer — botao "IA Texto"

Localizacao: `apps/frontend/src/components/launches/ai.caption.tsx`

Renderizado em `media.component.tsx` antes do `<AiImage>` quando
`user?.tier?.ai`. Recebe `editor` (Tiptap) como prop, le o conteudo
atual via `editor.getText()`, chama `POST /ai/text/caption` com
`action: 'improve'`, e substitui o conteudo via
`editor.commands.setContent(newText)`.

**Disabled** quando `value.length < 30` (mesmo padrao do AiImage).

Trata explicitamente:
- 412 (sem credencial) -> toast amarelo com link para Settings > AI
- 429 (rate limit) -> toast amarelo "Aguarde um instante"
- Outros -> toast com `detail.message`

---

## 7. Geracao de imagem — fluxo completo

```
Composer: clica AI Image -> escolhe estilo
   |
   v
POST /media/generate-image-with-prompt { prompt, style }
   |
   v
MediaController.generateImage
   - SubscriptionService.checkCredits('ai_images') (modo managed)
   - se >0, prossegue
   |
   v
MediaService.generateImage(prompt, org, generatePromptFirst, profileId?)
   - useCredit('ai_images', callback)
       - generatePromptFirst -> AiTextService.generatePromptForPicture
       - AiImageService.generate(orgId, finalPrompt, profileId)
           - resolver.resolve(orgId, 'IMAGE', profileId) -> credential
           - dispatch por provider (openai vs openrouter)
           - retorna { base64, provider, model, credentialId }
       - retorna base64
   |
   v
controller.generateImage retorna { output: 'data:image/png;base64,' + base64 }
   |
   v
AiImage component faz upload via /uploads e adiciona ao post
```

**Pegadinha**: o componente `AiImage` (legado upstream) **nao trata
HTTP 412**. Se o admin nao configurou credencial de imagem, o request
falha mas o componente nao mostra feedback claro. Item de melhoria —
nao critico se admin configurou Settings > AI Provider > Imagem antes
de usar.

---

## 8. Como adicionar provider novo

Exemplo: adicionar Anthropic como provider de TEXT.

1. **Backend AiClientFactory** (`ai-client.factory.ts`):
   ```ts
   case 'anthropic': {
     const provider = createAnthropic({ apiKey: credential.apiKey });
     return provider(modelId);
   }
   ```
   E adicionar `'@ai-sdk/anthropic'` ao `package.json`.

2. **AiProviderTestService**:
   - Novo case `testAnthropic(apiKey)` chamando endpoint de validacao

3. **AiCatalogService**:
   - Adicionar entrada em `STATIC_CATALOGS.anthropic` com modelos
     curados (Anthropic nao tem `/models` publico)

4. **PROVIDER_LABELS** + `PROVIDER_ICON_PATHS` em
   `ai-kind-card.component.tsx`:
   ```ts
   anthropic: 'Anthropic',
   ```
   E adicionar `/icons/ai/anthropic.svg` em `apps/frontend/public/icons/ai/`

5. **AiProviderSettingsSection** — adicionar option:
   ```tsx
   { value: 'anthropic', label: 'Anthropic' }
   ```

6. **DynamicOptions** — se Anthropic tem opcoes especificas
   (extended thinking, etc.), adicionar branch novo e Zod schema
   correspondente em `ai-credential.schemas.ts`.

7. Specs em `ai-client.factory.spec.ts` e `ai-provider-test.service.ts`.

---

## 9. Erros HTTP

| Status | Causa | Tratamento |
|---|---|---|
| 400 | Payload invalido (ZodError) ou kind/options incompativel | `{ message: "Campo \`X\`: ..."}` — toast no frontend |
| 402 | **Nao usado pelo AI** — reservado para o billing global do Postiz que abre modal de cobranca | — |
| 412 | Credencial nao configurada no scope efetivo | Toast amarelo "Configure em Settings > AI Provider" |
| 429 | Rate limit do `/ai/text/caption` (30/min) | Toast amarelo "Aguarde um instante" |
| 502 | Provider externo retornou erro (ex: OpenRouter 500) | Toast generico no frontend |
| 503 | Antigo guard `OPENAI_API_KEY` — **removido**, nao usar mais | — |

**Por que 412 e nao 402?** Postiz upstream tem um interceptor em
`apps/frontend/src/components/layout/layout.context.tsx:112` que captura
**globalmente** status 402 e abre modal de billing/cobranca. Como nosso
fork desabilita billing por default mas mantem o interceptor (vem do
upstream), usar 402 para "configure suas chaves" causaria o modal
errado. 412 (Precondition Failed) e semanticamente correto e nao
colide com o billing flow.

---

## 10. Catalogo dinamico de modelos

OpenRouter expoe `/api/v1/models` com 400+ modelos. O `AiCatalogService`
filtra por `output_modalities` e cacheia em Redis 1h.

Refresh manual: `POST /ai/catalog/refresh` (admin only) — invalida
todas as keys `ai:catalog:*`.

Forma do CatalogModel:
```ts
{
  id: 'openai/gpt-5.5',
  displayName: 'GPT-5.5',
  provider: 'openrouter',
  kind: 'TEXT',
  contextLength: 200000,
  inputModalities: ['text', 'image'],
  outputModalities: ['text'],
  supportedParameters: ['temperature', 'tools', 'reasoning'],
  imageConfig?: { aspectRatios: [...], sizes: [...] },
  pricing?: { promptUSDPerMillion, completionUSDPerMillion }
}
```

Catalogos estaticos (`ai-catalog.static.ts`): OpenAI tem `gpt-5.5`,
`gpt-5.4`, `gpt-4.1` (TEXT) e `gpt-image-1`, `gpt-image-2` (IMAGE).
Atualizar quando lancar modelo novo.

---

## 11. Variaveis de ambiente

```bash
# Obrigatoria — chave para encriptar/decriptar todas as credenciais
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Opcional — AI agora respeita Settings > AI Provider, OPENAI_API_KEY
# nao e mais usado diretamente pelo agente nem pela geracao de imagem.
# Mantido para HeyGen e ImageSlides (dormentes) e para Mastra fallback.
OPENAI_API_KEY="sk-..."

# Opcional — geracao de video Veo3 via KieAI
KIEAI_API_KEY="..."

# Opcional — busca web do agente (Tavily) — nao plugado ainda
TAVILY_API_KEY="..."
```

**A configuracao de IA agora e per-workspace via UI** — nao depende de
env vars. O admin configura em Settings > AI Provider depois do primeiro
boot.

---

## 12. Testes

```bash
pnpm jest libraries/nestjs-libraries/src/ai/ --no-coverage
```

Cobertura atual:
- `ai-credential.repository.spec.ts` — 5 testes
- `ai-credential.service.spec.ts` — 13 testes (encrypt, SENTINEL, Zod
  por kind, test, markUsed)
- `ai-catalog.service.spec.ts` — 7 testes (estatico + OpenRouter +
  cache + refresh)
- `ai-provider-resolver.service.spec.ts` — 6 testes (cadeia perfil ->
  workspace -> 412)
- `ai-client.factory.spec.ts` — 8 testes (text, image, mastra lazy)
- `ai-text.service.spec.ts` — 9 testes (caption generate/improve,
  fallback, truncate)
- `ai-image.service.spec.ts` — 6 testes (OpenAI direct, OpenRouter
  modalities, erros)
- + 2 specs de migracao em `posts.service.separate-posts.spec.ts` e
  `media.service.generate-image.spec.ts`

**Total: 56 specs** no diretorio `/ai/`.

---

## 13. Pendencias / itens futuros

1. **Tool de Web Search no agente Mastra** (`webSearchTool`) usando
   provider Tavily configurado. Habilita "passe URL e gera post".
2. **Geracao de video via OpenRouter** (extensao do `AiImageService`
   para `/api/v1/videos` async polling).
3. **`AiImage` legado** trata 412 — hoje falha silenciosamente.
4. **Limite em USD** via OpenRouter pricing (em vez de contagem) —
   modo `managed` futuro.
5. **RAG/embeddings configuraveis** — hoje OpenAI `text-embedding-3-small`
   esta hardcoded em `knowledge.service.ts`. Decidir se vale abstrair.
6. **Catalogo OpenAI/KieAI dinamico** — hoje estaticos em
   `ai-catalog.static.ts`. Pode automatizar com proxy ao
   `/v1/models` da OpenAI.
7. **Generator legacy LangGraph** (`AgentGraphService`) gateado por
   billing — decidir se mantem (modernizar para usar factory) ou remove
   (apaga 4 deps `@langchain/*`).
8. **ImageSlides** — pipeline FAL+ElevenLabs+Transloadit. Refazer com
   factory ou descartar feature.

---

## 14. Pontos de entrada para mudancas comuns

| Mudanca | Onde mexer |
|---|---|
| Adicionar opcao nova ao kind TEXT (ex: top_p) | `ai-credential.schemas.ts` (Zod) + `ai-kind-card.component.tsx` (DynamicOptions) + `ai-text.service.ts` (aplicar na chamada AI SDK) |
| Adicionar provider novo | Ver secao 8 |
| Mudar mensagem do erro 412 | `ai-provider-resolver.service.ts` (constantes `NOT_CONFIGURED_MESSAGE` / `NOT_SHARED_MESSAGE`) |
| Mudar limite de chars do caption | `MAX_CAPTION_INPUT_CHARS` em `ai-text.service.ts` |
| Mudar rate limit do /ai/text/caption | `@Throttle` em `ai-text.controller.ts` |
| Trocar default de modelo OpenRouter | `DEFAULT_TEXT_MODELS` / `DEFAULT_IMAGE_MODELS` em `ai-client.factory.ts` |
| Adicionar modelo OpenAI ao catalogo estatico | `ai-catalog.static.ts` |
| Cache TTL do catalogo | `CACHE_TTL_SECONDS` em `ai-catalog.service.ts` (backend) e `dedupingInterval` em `use-ai-catalog.hook.ts` (frontend) |
