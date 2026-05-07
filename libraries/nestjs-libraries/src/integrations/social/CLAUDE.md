# Social Integrations — Instruções para Claude Code

## Posição na Hierarquia

- **Pai:** [`libraries/nestjs-libraries/CLAUDE.md`](../../../CLAUDE.md)
- **Avô:** [`/CLAUDE.md`](../../../../../CLAUDE.md)
- **Irmãos relevantes:**
  - [`src/chat/CLAUDE.md`](../../chat/CLAUDE.md) — webhook IG e validação HMAC; tools MCP que disparam integrations
  - [`src/ai/CLAUDE.md`](../../ai/CLAUDE.md) — encryption (`ENCRYPTION_KEY`) que também protege estes tokens
  - [`apps/orchestrator/CLAUDE.md`](../../../../../apps/orchestrator/CLAUDE.md) — activities que chamam estes providers

## O que vive aqui

40+ providers de redes sociais. Cada provider implementa `SocialProvider` (de `social.integrations.interface.ts`) e estende `SocialAbstract` (de `../social.abstract.ts`), com OAuth, refresh token, posting e tratamento de erros.

| Categoria | Conteúdo |
|---|---|
| Providers nativos | `bluesky`, `dev.to`, `discord`, `dribbble`, `facebook`, `farcaster`, `gmb`, `hashnode`, `instagram`, `instagram.standalone`, `kick`, `lemmy`, `linkedin`, `linkedin.page`, `listmonk`, `mastodon` (2 variantes), `medium`, `mewe`, `moltbook`, `nostr`, `pinterest`, `reddit`, `skool`, `slack`, `telegram`, `threads`, `tiktok`, `twitch`, `vk`, `whop`, `wordpress`, `x`, `youtube` |
| Providers via Zernio | `zernio-bluesky`, `zernio-facebook`, `zernio-googlebusiness`, `zernio-instagram`, `zernio-linkedin`, `zernio-pinterest`, `zernio-reddit`, `zernio-snapchat`, `zernio-telegram`, `zernio-threads`, `zernio-tiktok`, `zernio-twitter`, `zernio-youtube` |
| Helpers Instagram | `instagram-route.resolver.ts`, `instagram-messaging.service.ts`, `instagram-dm-button.type.ts` |
| Base classes | `../social.abstract.ts` (`SocialAbstract` + `RefreshToken`/`BadBody`/`NotEnoughScopes`), `zernio.base.provider.ts` (base para todos os Zernio) |

## Padrões e Regras Específicas

### 1. Todo provider estende `SocialAbstract` e implementa `SocialProvider`

Contrato de `SocialAbstract`:

- `RefreshToken` (lança quando token expirou)
- `BadBody` (lança quando payload é inválido para o destino)
- `NotEnoughScopes` (lança quando OAuth não pediu scopes suficientes)
- `fetch()` / `handleErrors()` / mention helper compartilhados

### 2. Propagação de `ClientInformation` é OBRIGATÓRIA em OAuth

Métodos `generateAuthUrl(clientInformation?)` e `authenticate(...)` recebem `ClientInformation` (do workspace ou perfil ativo) com `clientId`, `clientSecret`, `instanceUrl` (Mastodon/Zernio), e configurações por-perfil.

**Nunca hardcodar `process.env.X_CLIENT_ID`** dentro do provider. Sempre usar `clientInformation.clientId` (com fallback para env só quando `clientInformation` é `undefined` — fluxo legado).

Razão (do auto-memory `feedback_per_profile_credentials.md`): credenciais OAuth são **per-profile**, vindo de `Credentials` no DB. Hardcoding env quebra multi-tenancy.

### 3. Roteamento Instagram via `resolveIgRoute`

Função canônica em `instagram-route.resolver.ts`:

```typescript
import { resolveIgRoute } from '@gitroom/nestjs-libraries/integrations/social/instagram-route.resolver';
const route = await resolveIgRoute(integration, instagramMessagingService);
// route.token, route.host, route.useIgGraph, route.source
```

**Prioridade de resolução**:

1. `providerIdentifier === 'instagram-standalone'` → `IG_LOGIN_GRAPH` (`graph.instagram.com`) + IG User Token do `Integration.token`
2. IG User Token cadastrado em `Credentials.instagramTokens` → `IG_LOGIN_GRAPH`
3. Fallback: `FB_LOGIN_GRAPH` (`graph.facebook.com`) + Page Access Token do `Integration.token`

**Nunca** hardcode host ou token em activities/services que tocam endpoints IG (comentário, DM, follow-check, stories, reposts). Razão (do auto-memory `feedback_ig_token_routing.md`): Standard Access via IG Login dispensa App Review — crítico para self-hosted.

### 4. Três camadas de credenciais Meta (NUNCA misturar)

| Camada | Origem | Uso |
|---|---|---|
| **App credentials** (workspace) | `Credentials.clientId/clientSecret`, `instagramAppId/instagramAppSecret`, `threadsAppId/threadsAppSecret` | OAuth (`generateAuthUrl`/`authenticate`) e validação HMAC do webhook |
| **Integration token** | `Integration.token` é Page Access Token (`providerIdentifier='instagram'`) **OU** IG User Token (`providerIdentifier='instagram-standalone'`) | Posting, comentários, refresh |
| **Messaging tokens** (Settings > Credenciais > Instagram) | `Credentials.metaSystemUserToken` + `Credentials.instagramTokens` (JSON por conta) | Activities de DM e follow-check via IG User Token cadastrado |

Detalhes: [`docs/architecture/instagram-automations.md`](../../../../../docs/architecture/instagram-automations.md).

## Zernio (ex-Late / getlate.dev)

[Zernio API](https://docs.zernio.com/llms-full.txt) é provedor alternativo para canais que requerem OAuth complexo: TikTok, Pinterest, X, Snapchat, Threads, Bluesky, Reddit, Telegram, Google Business, YouTube, Facebook, Instagram, LinkedIn (13 plataformas).

### Arquitetura

- **Base**: `zernio.base.provider.ts` — `ZernioBaseProvider extends SocialAbstract` com `Zernio` SDK (`@zernio/node`) e cache em Redis (TTL 5min) para usage stats.
- **Providers concretos**: `zernio-<plataforma>.provider.ts` — herdam de `ZernioBaseProvider` passando `platform`, `platformName`, `charLimit`. Marcados com `hiddenFromList = true` (não aparecem em "Add Channel" direto — entram via "Add Channel > Zernio" ou "Send Invite Link > Zernio").
- **Identificador**: `zernio-${platform}` (ex.: `zernio-tiktok`, `zernio-pinterest`).
- **API key per-profile**: resolvida via `clientInformation.instanceUrl` (override por perfil) com fallback para org-level controlado pela flag `shareZernioWithProfiles`.

### Fluxos suportados

1. **Add Channel > Zernio**: admin seleciona uma conta já conectada na conta Zernio dele.
2. **Send Invite Link > Zernio**: admin gera link OAuth específico por plataforma para o cliente conectar — endpoint `POST https://zernio.com/api/v1/platform-invites` (formato de resposta: `{ invite: { inviteUrl, ... } }`).

Após cliente conectar via convite, admin volta em "Add Channel > Zernio" e adiciona a conta nova.

### Frontend

- Modais: `apps/frontend/src/components/launches/zernio/` (`zernio-account-modal.tsx`, `zernio-invite-modal.tsx` e equivalentes).

### Por que Zernio e não Late

A empresa fez rebrand completo de Late/getlate.dev → Zernio (mesma empresa, marca nova). O codebase migrou todos os providers e nomenclatura. Não existe mais `late.*.provider.ts` — apenas alguns assets visuais legacy em `apps/frontend/public/icons/platforms/late.svg|png`.

## Mapa de Arquivos-Chave

| Arquivo | Finalidade |
|---|---|
| `../social.abstract.ts` | Base class + classes de erro (`RefreshToken`, `BadBody`, `NotEnoughScopes`) |
| `social.integrations.interface.ts` | Interfaces (`SocialProvider`, `ClientInformation`, `AuthTokenDetails`, `PostDetails`, `PostResponse`) |
| `instagram.provider.ts` | IG via Facebook Login (Page Access Token, host `graph.facebook.com`) |
| `instagram.standalone.provider.ts` | IG via Instagram Login (IG User Token, host `graph.instagram.com`) — preferido para self-hosted |
| `instagram-route.resolver.ts` | `resolveIgRoute` — escolhe host/token correto |
| `instagram-messaging.service.ts` | Tokens cadastrados (Meta System User Token + IG User Tokens por conta) |
| `instagram-dm-button.type.ts` | Tipos do botão postback do follow-gate |
| `zernio.base.provider.ts` | Base de todos os Zernio (cache Redis, helpers) |
| `x.provider.ts` + `x.provider.spec.ts` | X/Twitter — exemplo de provider testado |

## Workflows Comuns

### Adicionar provider novo

1. **Spec primeiro** se o provider tem lógica não-trivial (formatação de post, retry de upload, parsing de resposta). Veja `x.provider.spec.ts` como referência.
2. Criar `<plataforma>.provider.ts` estendendo `SocialAbstract` + `implements SocialProvider`.
3. **OAuth**:
   - `generateAuthUrl(clientInformation?: ClientInformation)` — usar `clientInformation.clientId/clientSecret/instanceUrl` SEMPRE (com fallback `process.env` só para legado, idealmente nem isso).
   - `authenticate(...)` — mesma regra.
4. **Post**: `post(...)` com tratamento de erros que joga `RefreshToken`/`BadBody`/`NotEnoughScopes` quando aplicável.
5. **Refresh** (se houver expiração): método de refresh propaga `ClientInformation`.
6. Registrar em `IntegrationManager` (`database/prisma/integrations/integration.manager.ts`) com identifier único.
7. **Frontend**: ícone em `apps/frontend/public/icons/platforms/<provider>.svg`. Settings em `apps/frontend/src/components/launches/providers/<provider>/`.
8. **CHANGELOG.md** em `[Unreleased]`.

### Adicionar provider via Zernio

1. Criar `zernio-<plataforma>.provider.ts` herdando `ZernioBaseProvider`. Construtor passa `(platform, platformName, charLimit)`.
2. Registrar no `IntegrationManager`.
3. Frontend: já é exposto via "Add Channel > Zernio" — UI comum.

### Diagnóstico de OAuth

1. `clientInformation` está chegando? Logar no início de `generateAuthUrl`.
2. Está usando `clientInformation.clientId` ou `process.env.X_CLIENT_ID`? Deve ser o primeiro.
3. Para IG/FB: confirmar `instagramAppId`/`instagramAppSecret` ou `clientId`/`clientSecret` — depende de qual produto Meta o app está usando.

## Armadilhas Conhecidas

1. **Sintoma:** OAuth funciona em uma org mas falha em outra → **Causa:** provider hardcoda `process.env.X_CLIENT_ID` em vez de usar `clientInformation`. **Correção:** propagar `ClientInformation` em **`generateAuthUrl` E `authenticate`** (e refresh, se houver).
2. **Sintoma:** activity de comentário IG retorna 400/403 → **Causa:** host/token errado para o tipo de integração. **Correção:** sempre `resolveIgRoute(integration, ...)`. Nunca hardcodar `graph.facebook.com`.
3. **Sintoma:** webhook IG aceita, mas `is_user_follow_business` não funciona → **Causa:** Page Access Token de Facebook Login não tem Standard Access ao campo. **Correção:** instalar `instagram.standalone.provider` (IG Login) ou cadastrar IG User Token em Settings > Credenciais > Instagram.
4. **Sintoma:** Zernio retorna "API key invalid" → **Causa:** `clientInformation.instanceUrl` (que carrega a key) não está sendo lido. **Correção:** verificar fluxo `generateAuthUrl` do `ZernioBaseProvider` — key resolve por-profile primeiro, depois org com `shareZernioWithProfiles`.
5. **Sintoma:** Tentando importar `late.*.provider` → **Causa:** Late foi removido (rebrand para Zernio). **Correção:** usar `zernio-<plataforma>.provider.ts`.
6. **Sintoma:** Token refresh em loop infinito → **Causa:** `RefreshToken` lançado mesmo após refresh bem-sucedido. **Correção:** garantir que após refresh o `Integration.token` é atualizado e a chamada original é re-tentada com o novo.

## Comandos

```bash
# Spec de um provider especifico
pnpm jest libraries/nestjs-libraries/src/integrations/social/x.provider.spec.ts
```

## Referências

- [`docs/architecture/instagram-automations.md`](../../../../../docs/architecture/instagram-automations.md) — credenciais Meta, follow-gate, armadilhas IG (LEITURA OBRIGATÓRIA antes de mexer em IG)
- [`docs/architecture/credential-validation.md`](../../../../../docs/architecture/credential-validation.md) — validação de credentials
- [Zernio API docs](https://docs.zernio.com/llms-full.txt)
- [`src/chat/CLAUDE.md`](../../chat/CLAUDE.md) — webhook IG validation (HMAC com 2 secrets)
- [`apps/orchestrator/CLAUDE.md`](../../../../../apps/orchestrator/CLAUDE.md) — `FlowActivity.resolveIgRoute` wrapper
