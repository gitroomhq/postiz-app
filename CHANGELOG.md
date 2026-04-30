# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

Fork do [Postiz](https://github.com/gitroomhq/postiz-app) (AGPL-3.0).

## [Unreleased]

### Corrigido
- Repost automático no X (Twitter) deixava de publicar quando a legenda da postagem original estourava o limite "weighted" do X — caracteres como `—` (em-dash) e `…` (ellipsis) contam como 2 chars no contador real, então uma legenda com 280 chars ASCII + 1 em-dash já estoura. O fluxo agora trunca a legenda em 250 chars (margem de segurança) antes de mandar para o X. Também foram acrescentados padrões em `XProvider.handleErrors` para reconhecer respostas reais da API ("Tweet text is too long", "exceeds the maximum number of characters", `paid_partnership` não autorizado), evitando que esses casos caiam no genérico "Unknown Error". Por fim, os campos opcionais `made_with_ai` e `paid_partnership` deixaram de ser enviados quando estão `false` — antes eram enviados sempre, e algumas contas sem o feature habilitado podiam recusar a requisição. Comportamento coberto por nova spec `x.provider.spec.ts` (17 casos).

## [0.5.2] - 2026-04-29

### Corrigido
- Validação de webhook Instagram (introduzida em 0.5.1) passou a falhar com `Error validating application. Cannot get application info due to a system error` em diversas situações que **não** representavam problema real do usuário, bloqueando indevidamente a criação de automações em instâncias que estavam funcionando. A correção combina três camadas: (1) **Token format** — removido `encodeURIComponent` aplicado por engano no `app access token` (`appId%7CappSecret`), que a Graph API rejeita; o pipe agora é enviado cru, alinhado a `CredentialService.configureInstagramWebhook`. (2) **Roteamento de host** — apps do tipo "API do Instagram com login do Instagram" (Instagram-only) vivem em `graph.instagram.com`, enquanto apps clássicos com Instagram via Facebook Login vivem em `graph.facebook.com`. A checagem agora escolhe o host com base na fonte das credenciais (`instagramAppId/instagramAppSecret` ou `INSTAGRAM_APP_ID` env → `graph.instagram.com`; `clientId/clientSecret` ou `FACEBOOK_APP_ID` env → `graph.facebook.com`) e faz fallback automático para o outro host antes de reportar falha, cobrindo casos de App ID cadastrado no campo errado. (3) **Fail-open em erros de API** — o endpoint `/{app_id}/subscriptions` não é confiável para vários tipos de app (Instagram-only em dev mode, apps com formato de token que a Meta se recusa a validar etc.); quando ambos os hosts respondem com erro de validação, o backend agora loga o detalhe completo e **permite** a criação da automação em vez de bloquear (a entrega real do webhook não depende dessa checagem passar). Bloqueio só ocorre quando há evidência positiva de problema — credenciais ausentes, ou subscription Instagram lida com sucesso mas inativa/com campos faltando, ou listas readable sem nenhuma subscription `object='instagram'` em nenhum host. Mensagens de erro mantêm contexto diagnóstico (App ID consultado e o que cada host retornou). Adicionados testes de regressão para `%7C`, Instagram-only app em `graph.instagram.com`, fallback entre hosts, fail-open em erros e fail-closed em subscription faltando.

## [0.5.1] - 2026-04-29

### Corrigido
- Validação de webhook Instagram no wizard "Nova Automação" (estilo ManyChat) agora respeita as credenciais Meta cadastradas em Configurações > Credenciais > Facebook em vez de ler somente `FACEBOOK_APP_ID/FACEBOOK_APP_SECRET` da env. Antes o wizard exibia o erro genérico "Webhook Instagram nao configurado no app Meta..." mesmo quando o webhook estava registrado corretamente — bastava o workspace usar credenciais próprias (ou as envs apontarem para outro app Meta) para a checagem consultar o app errado, encontrar `data: []` em `/{appId}/subscriptions` e dar falso negativo. Quando as envs estavam vazias o problema era oposto: a checagem retornava `ok:true` silenciosamente e o usuário criava automações sem webhook real, descobrindo o problema só quando comentário/DM não disparava. Agora a resolução de credenciais segue a mesma cadeia já usada pelos providers Instagram (`instagramAppId/instagramAppSecret` do workspace → `clientId/clientSecret` do workspace → `INSTAGRAM_APP_ID/SECRET` env → `FACEBOOK_APP_ID/SECRET` env) e, se nenhuma fonte estiver configurada, a UI passa a exibir mensagem clara pedindo configuração em Configurações > Credenciais. As mensagens de erro também ganharam contexto diagnóstico — incluem o `appId` que foi consultado e listam as `subscriptions` que estão presentes naquele app (ex.: "App 1234: nenhuma subscription com object='instagram'. Subscriptions presentes: page (active=true, fields=feed,messages)"), facilitando identificar quando o webhook foi cadastrado em outro app ou no objeto errado. A versão da Graph API foi atualizada de v20.0 para v25.0 alinhando ao restante do código IG.
- Tokens de messaging do Instagram (System User Token e tokens por conta cadastrados em Settings > Credenciais > Instagram) deixavam de existir silenciosamente sempre que o admin abria "Editar" em qualquer seção do card Meta (Facebook, Instagram ou Threads) e salvava — a `CredentialService.unredact` só preservava as chaves explicitamente listadas no body do PATCH, e como o formulário de App ID/Secret não conhece os campos de messaging eles eram descartados na re-encriptação. Sintomas relatados: follow-gate quebrando com `Messaging não configurado para <workspace>`, automações estilo ManyChat parando e o card "Token Usuário do Sistema" voltando vazio sem ninguém ter clicado em remover. A correção passa a fazer overlay do body sobre o registro existente (campos não enviados são preservados, SENTINEL continua mantendo, string vazia continua limpando), com warning log listando os campos preservados automaticamente para detectar futuras regressões em formulários novos. Usuários afetados precisam re-cadastrar manualmente o System User Token e/ou os tokens por conta — os valores anteriores não são recuperáveis.

## [0.5.0] - 2026-04-29

### Documentação
- Nova referência de arquitetura para automações Instagram em `docs/architecture/instagram-automations.md`, voltada a agentes de IA e ao time de engenharia: mapa dos arquivos-chave (backend/orchestrator/libraries/frontend), as três camadas de credenciais Meta (App, Integration, Messaging Tokens), roteamento de host/token via `FlowActivity.resolveIgRoute`, fluxo completo do follow gate de 2 etapas (opening DM + postback + PendingPostback), convenções e armadilhas. `CLAUDE.md` ganhou um bloco resumido com as regras de ouro apontando para o doc detalhado.

### Alterado
- Card de credenciais do LinkedIn em Settings > Credenciais agora exibe duas URLs de callback (Perfil pessoal e Página da empresa) em vez de uma só. As duas integrações (`linkedin` e `linkedin-page`) compartilham o mesmo Client ID/Secret no portal de desenvolvedor do LinkedIn — só o redirect URI muda — então o usuário cadastra ambas de uma vez sem precisar adivinhar a segunda URL.
- Tela de Métricas agora aparece com esse rótulo em pt-BR (antes "Análises", que ficava ambíguo). Adicionada também a tradução do card "Follower Count" (Contagem de Seguidores) que faltava entre as métricas do Instagram.
- Renomeados os campos do card de credenciais do X (Twitter) em Settings > Credenciais de "API Key" / "API Secret" para "Consumer Key" / "Access Token", espelhando os labels usados pelo próprio portal de desenvolvedor do X (seção "OAuth 1.0 Keys") e facilitando para o usuário identificar o que copiar.
- Card de credenciais Zernio em Settings > Credenciais agora aparece como item colapsável dentro da lista de redes sociais, com o logo do Zernio e o mesmo padrão visual dos demais provedores. Removida a seção solta abaixo da lista e a menção a "TikTok e Pinterest" no título — Zernio é provedor alternativo para todas as redes sociais suportadas.
- Listagem de Automações (comentário/flows) redesenhada em formato de tabela com paridade visual ao Repost: switch de ativa/pausada (alterna `ACTIVE ⇄ PAUSED` diretamente na linha; DRAFT aparece com switch desabilitado e badge âmbar "Rascunho"), avatar da conta conectada com `PlatformIconBadge` + nome, linha secundária com resumo do gatilho (palavras-chave truncadas em 2 + `+N` e contagem de posts selecionados ou "Todos os posts"), contador de execuções e ações Editar/Excluir por linha. `getFlows` passa a incluir o nó TRIGGER (apenas `data`/`type`) para o frontend montar o resumo sem fetch adicional por automação.
- Renomeada integração Late (getlate.dev) para Zernio (zernio.com) — mesma empresa, nova marca. SDK `@getlatedev/node` substituído por `@zernio/node` (v0.2.80), base URL passa a ser `https://zernio.com/api/v1`, providers `late-*` renomeados para `zernio-*`, colunas `lateApiKey`/`shareLateWithProfiles` renomeadas para `zernioApiKey`/`shareZernioWithProfiles`, rota `/integrations/late` passa a ser `/integrations/zernio` e configurações em `/settings/zernio`. Uma migração idempotente roda no startup do backend para copiar chaves de API e reescrever identificadores de provedor existentes — usuários não precisam reconectar contas. Assets atualizados para `zernio-logo.svg` (fundo claro) e `zernio-icon.svg` (ícone branco sobre fundo `#EB3514`) no badge de canais via Zernio. Endpoint `platform-invites` tenta a URL nova e cai num fallback 501 amigável caso o Zernio não exponha mais.
- Removido o badge/tooltip "Recomendado" do canal Instagram (Standalone) na tela de conexão de canais — o aviso sobre follow gate funcionar sem App Review deixou de ser relevante após o IG User Token cadastrado em Settings passar a funcionar também para integrações conectadas via "Instagram (Facebook Business)". As chaves de tradução `tooltip_instagram-standalone` foram removidas em pt e en.

### Adicionado
- Filtro opcional por hashtag nas regras de Repost: ao definir uma hashtag (ex.: `#repost`) no card "Conteúdo" da regra, somente posts cuja legenda contenha essa hashtag serão republicados; legenda em branco ou hashtag ausente marca o item como `SKIPPED` com motivo `FILTER_HASHTAG`. Em branco mantém o comportamento atual de repostar tudo. A comparação é case-insensitive, aceita o valor com ou sem `#` e usa boundary explícito (`#repost` não casa em `#repostagem`). O checkpoint do polling continua avançando mesmo nos itens filtrados, então o ciclo seguinte não reprocessa o mesmo conteúdo. Stories normalmente não trazem legenda da Graph API — o filtro foi pensado para Reels/Feed.
- Repost agora aceita LinkedIn (Perfil e Página), X (Twitter), Threads e Pinterest como destinos. Cada conta conectada aparece como entrada separada no seletor de destinos da regra (formato fixo: "Post" no LinkedIn, "Tweet" no X, "Thread" no Threads, "Pin" no Pinterest), e o orchestrator publica usando os mesmos providers do calendário — vídeos verticais e imagens do story/reel original são propagados na próxima janela de polling. A caption é truncada por destino conforme o limite de cada rede (X em 280 caracteres, Threads e Pinterest em 500); LinkedIn herda o texto completo. No Pinterest, o pin vai automaticamente para o primeiro board da conta (resolvido em runtime via `pinterest.boards()`); contas sem nenhum board cadastrado marcam o destino com erro `PINTEREST_NO_BOARD` sem afetar os demais. Foram adicionados também limites de duração de vídeo no filtro opcional da regra (X até 140s, LinkedIn até 600s) — quando ultrapassado, o destino é pulado com `DURATION_EXCEEDED_X` ou `DURATION_EXCEEDED_LINKEDIN`. Nenhuma reconexão de canais é necessária; basta editar uma regra existente para adicionar os novos destinos.
- Suporte a imagem de capa customizada para Reels do Instagram, semelhante ao thumbnail do YouTube. Quando o tipo de post é "Post / Reel" e a mídia é um vídeo único, surge no painel de configurações do canal um seletor "Capa do Reel" que reusa o componente da biblioteca de mídia. A imagem (JPEG, 9:16 recomendado, até 8MB) é enviada à Graph API via `cover_url` na criação do container `media_type=REELS` e substitui o frame extraído do vídeo. Stories e carousels com vídeo continuam ignorando a capa (não suportado pela API). Vale também para integrações Instagram Standalone (IG User Token).
- Cards de credenciais OAuth em Settings > Credenciais agora exibem a URL de callback com botão "Copiar" para facilitar a configuração no painel do provider (Google Cloud, Meta, TikTok, etc.). Cobertura: YouTube, TikTok, Pinterest, LinkedIn, Twitter/X, Reddit, Discord, Slack, Facebook, Instagram (via Facebook Login + Login direto) e Threads.
- Regras de Repost V2 — matriz de formatos origem × destino: agora cada destino grava o formato explícito (Instagram Reel/Feed, Instagram Story, Facebook Reel, TikTok Feed, YouTube Short) em vez de uma lista solta de integrações. Além do Story, o Instagram Reel/Feed passa a ser aceito como origem. O wizard mostra "Fonte: Instagram — Story" ou "Instagram — Reel/Feed" e no seletor de destinos cada formato vira uma entrada separada (ex.: "Instagram — Reel/Feed (@conta)" e "Instagram — Story (@conta)" da mesma conta IG aparecem como dois itens). YouTube ganhou rótulo "Short" e o activity passa a adicionar automaticamente `#Shorts` no título quando ausente (garante a classificação de Short pela Data API v3). Facebook Reel foi adicionado como destino (publicado via `/{page-id}/videos` — o Facebook categoriza automaticamente como Reel por ser vídeo vertical). Regras V1 são migradas automaticamente no boot do backend (inferindo o formato pelo providerIdentifier) via `StartupMigrationService.backfillRepostDestinations()`; a coluna legada `destinationIntegrationIds` é mantida como shadow nesse primeiro deploy.
- Regras de Repost automático de Stories do Instagram: novo tipo de automação que monitora por polling os stories publicados em contas Instagram Business conectadas e republica o vídeo em TikTok (nativo + Late) e YouTube Shorts. A regra pode ser criada pelo menu Automações (3º card "Repost de Story") ou diretamente em `/automacoes/repost/nova`, com seleção de canal origem + multi-select de destinos, intervalo de polling (5 min a 6 h, default 15 min), legenda padrão com suporte a `{{timestamp}}` e switch para ativar imediatamente. Cada repost aparece no calendário como Post em QUEUE e é publicado pelo scheduler existente — com histórico de execuções por regra (published/partial/skipped/failed), idempotência por `(ruleId, sourceItemId)` e bootstrap automático do checkpoint (evita repostar stories antigos na primeira ativação). V1 aceita apenas vídeos (fotos são puladas com `skippedReason=FILTER_IMAGE`) e roteia o token IG via helper compartilhado `resolveIgRoute` (standalone → IG User Token → Page Access Token), extraído de `FlowActivity` para reuso entre automações de comentário e repost.
- Flow Builder (canvas) recebeu paridade com o wizard de automações de comentário: o painel do nó de Gatilho agora exibe o toggle "Pedir para seguir antes de enviar" para comentários (antes restrito a stories), com card amarelo explicando o fluxo de 2 etapas e campos dedicados para DM inicial, texto do botão inicial, mensagem de gate, texto do botão "Já segui", mensagem de desistência e máximo de tentativas. O nó de Send DM ganhou seção de botão opcional (texto + URL), e os nós no canvas passam a mostrar badge "Pede para seguir" no gatilho e chip do botão no Send DM. Automações criadas no Flow Builder passam a suportar o mesmo follow gate de comentários sem precisar trocar para o wizard.

### Corrigido
- Botão "Rodar agora" das regras de Repost agora dispara um ciclo imediatamente, mesmo com o workflow Temporal já rodando (regra ativa, mid-sleep). Antes a chamada apenas tentava `workflow.start` num `workflowId` determinístico que já existia, falhava com `WorkflowExecutionAlreadyStartedError`, o erro era engolido pelo `try/catch` interno e a próxima consulta à Graph API só ocorria quando o sleep terminava — visualmente o usuário recebia o toaster de "executando" mas nada acontecia. Agora o `repostWorkflow` escuta um signal `pokeRepost` (handler com flag) e usa `condition(() => poked, intervalMs)` no lugar de `sleep(intervalMs)`, e o `RepostService.runNow` envia o signal via `signalWithStart` com `workflowIdConflictPolicy: 'USE_EXISTING'` (cobrindo também o caso raro do worker ter morrido). Como item adicional, o botão sumiu da listagem quando a regra está pausada — antes ficava visível mas `disabled`, e o endpoint já rejeitava a chamada com 400.
- Badge do Zernio (overlay vermelho com o logo no canto superior direito do ícone do canal) aparecia fora do ícone nos dropdowns de seleção de fonte e destino do Repost, ancorando no canto do dropdown em vez de no ícone do canal. Causa: `PlatformIconBadge` retorna um fragmento com o badge `position:absolute` que precisa de ancestor `relative` próximo — nos dropdowns do Repost o container mais próximo era o painel `absolute z-30`. Agora cada uso do componente dentro do formulário do Repost foi envolvido localmente num `<span class="relative inline-block">`, garantindo que o badge ancore sempre na borda do ícone, sem alterar o `PlatformIconBadge` (que continua retornando fragmento) — preservando o layout em todos os outros lugares onde o componente é renderizado (lista de canais do calendário, picker de plataformas, etc.).
- Canal YouTube/Google entrava em loop de "precisa reconectar" mesmo após reconectar várias vezes ao dia. Causa: o cron de refresh chamava `YoutubeProvider.refreshToken()` sem propagar as credenciais por workspace, então o Google recebia o `refresh_token` emitido pelo app do workspace mas tentava refrescar com `process.env.YOUTUBE_CLIENT_ID/SECRET` (vazio ou de outro app). O Google rejeitava com `invalid_grant` e o orchestrator marcava `refreshNeeded=true`, esvaziando o `refreshToken` da integração — na próxima publicação aparecia "Token expired or invalid, please reconnect your YouTube account". Agora `IAuthenticator.refreshToken` aceita `clientInformation` opcional, o `RefreshIntegrationService` e o `IntegrationService.refreshToken` resolvem as credenciais do perfil/workspace via `IntegrationManager.getProviderCredentials` e passam pro provider antes do refresh, e o YouTube reusa o mesmo `clientAndYoutube(clientInformation)` que já é usado em `authenticate`/`generateAuthUrl`. A interface está retro-compatível para os demais providers.
- Falhas em publicações no Threads (incluindo reposts) ficavam mascaradas com a mensagem "Error: 17925601374295504" (apenas o ID do container Meta), porque o `ThreadsProvider.checkLoaded` descartava o campo `error_message` retornado pela Graph API quando o status do container vinha como `ERROR`. Agora a exceção carrega tanto o ID quanto a mensagem real do Meta (ex.: "Threads container 17925... failed: VIDEO_TOO_LONG"), o que aparece direto na coluna `Post.error` e nas notificações de erro do calendário — facilita identificar se a mídia foi rejeitada por duração, codec, aspect ratio etc.
- Conexão de canal TikTok (nativo) falhava com `Não foi possível entrar com o TikTok — client_key` mesmo após cadastrar Client Key e Client Secret em Settings > Credenciais. O `TiktokProvider` lia apenas `process.env.TIKTOK_CLIENT_ID/SECRET` e ignorava as credenciais por perfil. Agora aceita `ClientInformation` em `generateAuthUrl` e `authenticate`, mapeando `client_id` da interface para o `client_key` que o OAuth do TikTok espera, com fallback para as variáveis de ambiente — mesmo padrão de YouTube/LinkedIn/Facebook/Threads.
- Plug "Adicionar comentários por outra conta" no painel de configurações do LinkedIn (Perfil e Página) agora aparece traduzido em pt-BR — antes o título, descrição, label e placeholder do textarea vinham crus do `@PostPlug` do backend. Os campos genéricos do `PlugField` passaram a usar chaves dinâmicas (`post_plug_{identifier}_field_{name}_description`/`_placeholder`), então qualquer plug futuro herda o mecanismo.
- Checkbox no variant `hollow` (usado em "Publicar como carrossel de imagens" do LinkedIn e em outros toggles) ficava sem indicação visual quando marcado em modo claro: o ✓ branco ficava invisível sobre o fundo `customColor2` (`#f8f8f8`). Agora, quando marcado, o fundo passa a ser preenchido com a cor primária (`bg-forth`), ficando consistente com o variant default.
- Conexão de canal LinkedIn (Perfil pessoal e Página da empresa) falhava com `You need to pass the "client_id" parameter` mesmo após cadastrar Client ID e Client Secret em Settings > Credenciais. Os providers `linkedin` e `linkedin-page` liam apenas `process.env.LINKEDIN_CLIENT_ID/SECRET` e ignoravam as credenciais por perfil. Agora ambos aceitam `ClientInformation` em `generateAuthUrl` e `authenticate`, com fallback para as variáveis de ambiente quando o workspace não tem credenciais cadastradas — mesmo padrão já aplicado em YouTube, Facebook e Threads.
- Analytics do X (Twitter) quebrava com `TypeError: tweets.data.data is not iterable` para qualquer conta sem tweets na janela de 100 dias ou ao chegar na última página de paginação. A Graph API v2 omite o campo `data` da resposta quando `result_count` é zero, e o `loadAllTweets` fazia spread direto sem guardar contra `undefined`. Reautenticar o canal não resolvia. Agora o método trata resposta vazia como lista vazia e só recursiona se houver `next_token` real.
- Falhas em analytics do YouTube ficavam invisíveis por causa de um `catch` que engolia silenciosamente todos os erros e retornava lista vazia. Agora o erro real (token expirado, escopo `yt-analytics.readonly` não concedido, quota excedida etc.) é logado no backend para diagnóstico, mantendo o fallback de lista vazia para a UI não quebrar.
- Toaster "Channel Updated" aparecia em inglês após reconectar/atualizar um canal (YouTube, X e demais providers OAuth) mesmo com idioma pt-BR. A mensagem era passada literal na query string `?msg=Channel Updated` e renderizada sem passar pelo `t()` na página de destino. Agora o redirect carrega a string já traduzida (`Canal Atualizado`).
- Conexão de canal YouTube/Google falhava com `Erro 400: invalid_request — Missing required parameter: client_id` mesmo após configurar Client ID e Client Secret em Settings > Credenciais. O `YoutubeProvider` lia apenas `process.env.YOUTUBE_CLIENT_ID/SECRET` e ignorava as credenciais por perfil. Agora o provider aceita `ClientInformation` em `generateAuthUrl` e `authenticate`, com fallback para as variáveis de ambiente quando o workspace não tem credenciais cadastradas — o mesmo padrão que Facebook e Threads já seguiam.
- Resposta automática a comentário (feature ManyChat) falhava com `code=100 subcode=33` da Meta quando a integração era "Instagram (Facebook Business)" e o IG User Token cadastrado em Settings > Credenciais não tinha o escopo `instagram_business_manage_comments` (caso comum: aluno gera o token só com escopos de messaging). O `replyToComment` agora cai automaticamente para o Page Access Token da própria integração via `graph.facebook.com` quando a chamada via IG User Token falha — o PAT carrega `instagram_manage_comments` com Standard Access para testers/admins do app, sem exigir App Review. A mensagem de erro do provider passou a incluir host, comment ID, code e subcode da Meta para diagnóstico mais rápido, e o orchestrator loga a fonte do token (standalone, ig-user-token ou page-access-token) escolhida em cada reply.
- Automações de comentário (feed/reel) em integrações "Instagram (Facebook Business)" agora reusam o IG User Token cadastrado em Settings > Credenciais > Instagram > "Tokens de messaging por conta" quando disponível, dispensando a reconexão via "Instagram (Standalone)". A resposta ao comentário, a DM privada com botão postback, a checagem de follow e a DM final passam a rotear automaticamente para `graph.instagram.com` usando o IG User Token do workspace, que o aluno já gera direto no Meta Dashboard ao habilitar o produto "Instagram API with Instagram Login". A prioridade de seleção de token ficou: (1) integração Standalone usa o próprio token; (2) IG User Token cadastrado em Settings; (3) fallback para Page Access Token em `graph.facebook.com` (só funciona com Advanced Access). Sem isso, quem tinha o canal conectado via Facebook Business precisava reconectar só para o follow gate de comentários funcionar.
- Follow gate de automações agora funciona em instâncias self-hosted de alunos sem App Review da Meta. A causa do bloqueio era a combinação do provider legacy "Instagram (Facebook Business)" com a checagem `is_user_follow_business` via `graph.facebook.com` + Page Access Token, que exige Advanced Access à permissão `instagram_manage_messages` — inacessível para apps novos em Live Mode sem revisão. A solução roteia comentário, DM pós-postback e checagem de follow para `graph.instagram.com` + IG User Token quando o canal é conectado via "Instagram (Standalone)" (Instagram Login API), onde o campo retorna consistente sob Standard Access. A scope `instagram_business_manage_messages` foi adicionada ao provider Standalone; o provider antigo permanece inalterado. Nenhuma migração de banco é necessária — basta reconectar o perfil de Instagram escolhendo o canal Standalone. O endpoint de messaging também migrou para `/me/messages` (sem lookup de Page ID), e a DM final do follow-gate passa a usar o próprio token da integração Standalone, dispensando o setup de System User Token ou IG User Token em Settings > Credenciais para automações de comentário.
- Follow gate em automações de comentário (feed/reel) agora funciona de forma confiável. A Meta Graph API só retorna `is_user_follow_business` quando o usuário já tem contexto de messaging com a conta — para comentaristas que nunca enviaram DM, o campo vinha ausente e o gate ou bloqueava seguidores (fail-closed) ou liberava não-seguidores (fail-open). O fluxo agora segue o padrão do ManyChat: resposta pública no comentário → DM inicial com botão "Quero o link" → ao clicar, abre a janela de messaging de 24h e a checagem de follow passa a ser confiável → envia o link final para quem segue ou uma DM de convite com botão "Já segui!" para quem não segue (até 3 tentativas configuráveis). O wizard ganhou um aviso amarelo explicando as 4 etapas e campos dedicados para cada mensagem. Automações em produção com `requireFollow=true` migram automaticamente com defaults em português.
- Threads OAuth voltava com `error_code:1` mesmo após configurar Threads App ID/Secret em Settings > Credenciais. O `ThreadsProvider` lia apenas `process.env.THREADS_APP_ID/SECRET` e o controller só passava o par Facebook. Agora o provider aceita `ClientInformation` em `generateAuthUrl`/`authenticate` e o controller prioriza `threadsAppId`/`threadsAppSecret` quando a integração é `threads`, com fallback para o par Facebook quando os campos dedicados não estão preenchidos.
- Opção "Pedir para seguir antes de enviar" em automações agora aplica branch real: quando `is_user_follow_business=true` envia a DM normal configurada no flow; quando é false, envia uma mensagem de gate (personalizável no wizard ou com texto padrão convidando a seguir) em vez da DM original e ignora o botão de CTA para não vazar conteúdo exclusivo. Antes a flag era salva mas totalmente ignorada. Vale tanto para `story_reply` quanto para `comment_on_post`.
- Follow gate em automações de feed/reel não disparava mesmo para usuários que não seguiam a conta. A Messenger User Profile API (`GET /{IGSID}?fields=is_user_follow_business`) costuma devolver erro para comentaristas sem contexto de mensagem prévio, e o código tratava esse erro como fail-open (considerava seguidor) e enviava a DM normal. Agora a checagem é diferenciada por origem: para `comment_on_post` (fluxo opt-in de gate), erro da Graph API passa a ser tratado como fail-closed — envia a mensagem de gate; para `story_reply` o fail-open é mantido para não bloquear respostas legítimas a stories. O workflow passa `triggerType` explicitamente pro Temporal e registra no histórico de execução o resultado da checagem (`source=comment follows=true/false/null`) para facilitar o diagnóstico.
- Botão de CTA configurado na DM de automação de story não era enviado: o workflow do Temporal coletava apenas o texto do nó `SEND_DM` e descartava `buttonText`/`buttonUrl`. Agora a traversal propaga o botão até a activity `sendStoryDirectMessage`, e o `InstagramMessagingService` constrói o payload Meta como `attachment.template.button` quando há CTA, caindo para texto puro quando não há. O mesmo button template foi adicionado em `sendPrivateReply` para automações de comentário, com fallback automático.
- Layout do wizard de automação (story e comentário) tinha scroll na coluna do preview do celular junto com a página inteira. Agora o painel do celular fica fixo no centro e só a sidebar de opções rola internamente, mesmo em formulários longos.

### Adicionado
- Automações de comentário em feed/reel ganharam os mesmos recursos do wizard de story: botão de CTA na DM (button template no private reply) e gate de follow personalizável (mensagem alternativa para quem ainda não segue a conta). A verificação de follow em fluxos de comentário reusa o Page Access Token que já vive na integração, sem exigir token de messaging separado.
- Wizard de automação de Story agora exibe uma grade de stories ativos (últimas 24h) para seleção em vez de um campo de texto de ID, e o preview do celular mostra a thumbnail do story escolhido. O painel de preview também foi alinhado ao do wizard de comentários (centralizado, com fundo próprio).
- Suporte a tokens de messaging Meta para respostas automáticas via DM em stories: aceita tanto **Meta System User Access Token** (1 token para múltiplas contas do Business Manager, não expira) quanto **Instagram User Access Tokens por conta** (60 dias com refresh automático lazy no momento do uso, sem cron). Configuração unificada em Settings > Credenciais > Instagram, com validação ao salvar via Graph API e badges de status (válido/expirando/expirado). Resolve o limite da scope legacy `instagram_manage_messages` que exigia Advanced Access/App Review completo. O Story Wizard agora mostra um aviso quando a integração selecionada não tem token configurado.
- Automacoes de Stories no Instagram: novo fluxo separado que responde via DM a respostas e reacoes de stories (qualquer story, story especifico ou proximo story), com preview vertical e popup unico "Nova Automacao" como hub de entrada para todos os tipos de gatilho. Mantem retrocompatibilidade com automacoes existentes de comentario em publicacao.
- Flow Builder (canvas) agora expoe todos os modos de gatilho: seletor de tipo (Comentario em publicacao vs Resposta ao story), modos `Todos os posts`/`Proxima publicacao`/`Posts especificos` para comentarios e `Qualquer story`/`Proximo story`/`Story especifico` para stories, alem de toggles de reacoes e pedido de follow. O no TRIGGER passa a mostrar o texto correto para cada combinacao e o label do node e sincronizado com o triggerType ao salvar o canvas, mantendo o filtro do webhook consistente.
- Suporte a desenvolvimento local com dominio HTTPS proprio via Cloudflare Tunnel: `next.config.js` agora le `FRONTEND_URL` e `NEXT_PUBLIC_BACKEND_URL` do `.env` e libera os hosts em `allowedDevOrigins` automaticamente, permitindo rodar `pnpm dev` apontando OAuth callbacks pra um subdominio estavel sem precisar publicar imagens Docker a cada teste de integracao com Meta/Google/TikTok/etc.

### Documentação
- Dossiê de proposta da feature de repost automático de stories do Instagram (inspirada em Repurpose.io / Repostify): monitora stories publicados diretamente no app do Instagram e reposta em TikTok (nativo + Late) e YouTube Shorts, com interface de 2 colunas (origem/destinos) integrada em Automações, polling Temporal com short-circuit para respeitar rate limits da Graph API, modelo Prisma genérico preparado para expansão a Reels/Feed, edge cases (música licenciada, janela de 24h, stickers interativos, carrosséis) e perguntas em aberto. Nenhuma implementação ainda — apenas documentação em `docs/architecture/instagram-story-repurpose.md`

### Upstream
- Sincronizado com Postiz upstream ate commit `e3b3b82f` (2026-04-10, 24 commits)
- Instagram: melhor tratamento de erros, fix de refresh token e recuperacao de sessao invalidada
- YouTube: preserva refresh token existente para evitar re-auth diario
- Reddit: correcao de postagem em subreddits via API
- Facebook/Instagram: melhorias no fluxo de refresh de integracao
- Backend: endpoint de download de faturas (`/download-invoices`)
- Backend: correcoes de seguranca (security fixes)
- Backend: nova versao de post workflow (`postWorkflowV102`)
- Deps: axios upgrade, gitignore limpo, ajustes no workflow de PR quality
- **NAO sincronizado** (major upgrade deixado para sync dedicado): langchain 0.3 -> 1.x, mastra 0.x -> 1.x, @mastra/mcp upgrade, @mastra/rag removido upstream. Mantidos em 0.x porque nossa feature Knowledge Base RAG depende de `@mastra/rag@2.1.3` e a migracao para mastra 1.x requer reescrita das tools de chat (copilot.controller, load.tools, generate.image.tool) — deixar para um sync focado separado

### Corrigido
- Conexao de canal Threads falhava com `error_code:1` ("An unknown error has occurred") mesmo apos configurar App ID e App Secret do Threads em Settings > Credenciais. O `ThreadsProvider` so lia `process.env.THREADS_APP_ID/SECRET` e o controller de integracoes so mapeava `clientId/clientSecret` (Facebook) para o OAuth, ignorando os campos `threadsAppId/threadsAppSecret` da secao Threads. Agora o provider aceita `ClientInformation` em `generateAuthUrl` e `authenticate`, e o controller prioriza as credenciais dedicadas do Threads quando a integracao e `threads`, com fallback para o par Facebook quando nao preenchido
- Validacao HMAC do webhook de Instagram falhava silenciosamente para apps que usam o produto "Instagram API with Instagram Login" — o Meta assina os webhooks com o Instagram App Secret (separado do Facebook App Secret quando ambos os produtos estao habilitados no mesmo app), mas o backend so tentava o Facebook App Secret. Agora o controller aceita `INSTAGRAM_APP_SECRET` como env var dedicada e `instagramAppSecret` como campo na credencial do workspace, tentando ambos os segredos ao validar o `x-hub-signature-256`. O endpoint `/flows/webhook-config` passou a retornar o Verify Token configurado por perfil (com fallback para `multipost`) e o helper `configureInstagramWebhook` prioriza as credenciais de Instagram quando existem. Webhook agora valida com sucesso em setups multi-perfil onde cada perfil tem seu proprio app Meta.
- Redesenho do card de credenciais Meta em Settings > Credenciais: unificado sob a marca Meta (com icone) e subdividido em secoes por produto — Facebook (App ID/Secret), Instagram (App ID/Secret + Verify Token + bloco de Callback URL/Verify Token copiaveis para colar no Meta Developer Portal) e Threads (App ID/Secret, placeholder para uso futuro). Facilita a compreensao de qual credencial pertence a qual produto Meta e prepara o terreno para webhooks de Threads/Messenger sem novas reestruturacoes.
- Automacao criada pelo popup "Nova Automacao" salvava o flow como Rascunho ao salvar no wizard, exigindo ativacao manual. Agora o `quickUpdateFlow` promove automaticamente para Ativo quando o flow estava em Rascunho (flows ja pausados ou ativos mantem o status).
- Backend nao subia em ambiente local apos sync anterior do upstream — resolucao errada de conflito em merge anterior manteve `@mastra/core@0.20` enquanto aceitava `@ag-ui/mastra@1.0.1` (que exige core 1.x), resultando em crash silencioso no import de `@mastra/core/dist/request-context`. Corrigido subindo `@mastra/{core,mcp,memory,pg}` para versoes compativeis e portando arquivos de chat (`copilot.controller`, `load.tools.service`, `mastra.store`, `auth.context`, `agent.tool.interface`, `start.mcp`) para a API do core 1.x, preservando overlays custom do fork (persona prompt, knowledge base RAG / pgVector)
- Traducao dos textos restantes no painel de configuracoes de publicacao (X e LinkedIn): placeholder de comunidade, toggles "Feito com IA" e "Parceria paga", finalizador de thread, plug "Adicionar repostadores", label e opcoes de atraso (Imediatamente, 1 hora, ...) e mensagem "Nenhuma conta disponivel"
- Traducao da tela de Historico de execucoes das automacoes: status da execucao (Concluida, Falhou, Em execucao), tipos de node (Gatilho, Responder comentario, Enviar DM, Condicao, Atraso) e estados da timeline (entrou, concluido, erro, ignorado)
- Verificacao de credenciais do X (Twitter) falhava com "Unable to verify your credentials" mesmo com chaves validas — endpoint e fluxo corrigidos usando `twitter-api-v2.appLogin()`
- Isolamento de credenciais OAuth do X por perfil — cada perfil do workspace agora usa suas proprias Consumer Keys em todo o fluxo OAuth 1.0a, incluindo publicacao, comentarios, analytics e plugs de repost, sem vazar credenciais entre perfis e sem depender de X_API_KEY/X_API_SECRET globais
- Logs de diagnostico adicionados ao teste de credenciais (backend e frontend) e ao wrapper `runInConcurrent` (para exibir erros reais de APIs de provider no worker do Temporal)
- Upload de midia no X: o upstream Postiz usa `client.v2.uploadMedia` (endpoint novo `/2/media/upload` da X API v2) que nao funciona no tier Free da X e resulta em falha silenciosa ("Unknown Error") no Temporal. Migrado para `client.v1.uploadMedia` (`/1.1/media/upload.json`) que e disponivel em todos os tiers. Adicionalmente, o upstream convertia toda imagem para GIF via sharp mas declarava o MIME type original no request — fix preserva o formato original (PNG/JPEG/WebP/GIF/MP4) com mimeType coerente
- Reconhecimento do erro `CreditsDepleted` (HTTP 402) do X em `handleErrors`: em vez de "Unknown Error" generico, agora exibe mensagem clara orientando o usuario a verificar o tier do app no developer.x.com quando a cota mensal de creditos para criacao de tweets se esgota
- Crash no preview do TikTok ao abrir o modal de canais sem midia anexada (`Cannot read properties of undefined (reading 'map')`)
- Correcoes na tela publica de compartilhamento de post (`/p/:id?share=true`): logo renderizava quebrado, textos e data permaneciam em ingles com idioma pt-BR, botao de login/cadastro ficava comprimido com texto longo e aparecia warning de key do React nas imagens
- Contraste dos textos no node Trigger — contagem de posts e palavras-chave agora usam cor legivel em ambos temas claro e escuro
- Acentuacao faltante nas traducoes em portugues do wizard de automacoes
- Multiplas DMs em sequencia no flow de automacao — apenas a primeira usava private reply (limitacao da Meta), as seguintes agora usam DM direta via IG-scoped user ID
- Configuracao de webhook Instagram movida da pagina de Automacoes para dentro da credencial Facebook em Configuracoes > Credenciais

### Adicionado
- Infraestrutura de testes com TDD: configuracao Jest multi-projeto, utilitarios de mock compartilhados e exemplos de teste para SetsService e SetsRepository
- Scripts de teste no package.json: `test:watch`, `test:backend`, `test:libs`
- Step de testes automatizados no CI (GitHub Actions) antes do build
- Link de aprovacao por cliente: cada post pode gerar tokens de revisao compartilhaveis por URL (`/p/:id?token=...`) que permitem ao cliente comentar e aprovar ou pedir alteracoes sem login. Tokens sao aleatorios de 256 bits armazenados apenas como hash SHA-256, com expiracao padrao de 30 dias, revogacao manual, rate limit por IP (10 requisicoes / 5 min), sanitizacao de conteudo e trilha de auditoria (IP e user-agent). UI do dono no calendario para gerar, listar e revogar links
- Migracao automatica do schema Prisma no start do container Docker — o entrypoint agora executa `prisma db push` antes de iniciar a aplicacao, garantindo que quem atualiza a imagem em producao recebe as novas colunas/tabelas sem precisar rodar comando manual
- Modo "Proxima Publicacao" em automacoes do Instagram: permite criar a automacao antes do post existir e vincula-a automaticamente ao proximo feed ou reel publicado, seja pelo Robo MultiPost ou direto no Instagram (stories excluidos)
- Tag Docker `:prerelease` que aponta sempre para a ultima RC publicada, permitindo atualizacao automatica sem especificar numero de versao
- Selecao de posts no wizard com grid de 4 thumbs + modal "Mostrar Todos" com scroll infinito
- Secao "E esse comentario possui" estilo ManyChat — radio cards, input com virgulas, chips de exemplo, toggle para interagir com comentarios
- Respostas de comentario multiplas com randomizacao — orchestrator escolhe aleatoriamente entre as variacoes configuradas
- Preview do celular dinamico — aba ativa muda automaticamente conforme o usuario edita (post ao selecionar, comentarios ao digitar palavra-chave, DM ao escrever mensagem)
- Edicao de automacoes simples via Wizard — botao "Editar no Assistente" na tela de resumo abre o wizard preenchido com os dados existentes (POST /flows/:id/quick-update)
- Avatar e nome da conta Instagram refletem no preview do celular ao selecionar a conta no wizard
- Wizard "Nova Automacao Rapida" — formulario guiado com preview em tempo real (celular mockup) para criar automacoes simples sem precisar do editor de nodes
- Endpoint POST /flows/quick-create que gera nodes/edges automaticamente a partir do wizard
- Endpoint GET /flows/integrations/:integrationId/posts para buscar posts Instagram sem precisar de um flow existente
- Palavras-chave (keywords) no node Trigger — elimina necessidade do node Condition para 99% dos casos de uso
- Toolbar de nodes melhorada com cards coloridos, descricao curta e clique para adicionar alem de arrastar
- Modo Summary vs Advanced no editor de flows — flows simples abrem em visualizacao resumo, complexos abrem no editor React Flow
- Historico de execucoes detalhado — timeline vertical com status de cada node visitado (log de execucao)
- Campo executionLog no schema FlowExecution para armazenar trace de nodes visitados em cada execucao
- Endpoint GET /flows/:id/executions/:executionId para detalhe de uma unica execucao
- Botao "Nova Automacao" (wizard) como acao primaria na lista de automacoes, "Comecar do zero" como secundario
- Knowledge Base por perfil via RAG com pgvector — usuarios enviam PDFs, TXT ou MD e o agente pode citar fatos desses documentos ao gerar posts
- Nova tool `knowledgeBaseQuery` no agente Mastra que consulta vetores por perfil antes de gerar conteudo com informacoes factuais
- API de gestao de documentos (GET/POST upload/DELETE em /settings/profiles/:id/knowledge)
- Schema ProfileKnowledgeDocument com status PROCESSING/READY/FAILED e cascade delete por perfil
- Inicializacao automatica da extensao pgvector no startup (CREATE EXTENSION IF NOT EXISTS vector)
- Feature flag ENABLE_KNOWLEDGE_BASE (default true) — permite desabilitar em setups sem pgvector
- Tela de Knowledge Base nas configuracoes com upload, listagem com polling de status e exclusao
- Traducoes pt/en para a tela de KB
- Persona de IA por perfil — agencias podem configurar tom de voz, publico-alvo, CTAs preferidos, restricoes de conteudo e estilo de imagem por cliente
- API de gestao de Persona por perfil (GET/PUT/DELETE /settings/profiles/:id/persona) restrita a ADMIN
- Tela "Persona de IA" nas configuracoes com presets de tom e estilo, CTAs como tags e ate 5 posts de exemplo
- Persona injetada automaticamente no agente Mastra (chat), no Generator LangGraph e nas geracoes de imagem DALL-E
- Traducoes pt/en completas para a tela de persona
- Documentacao de arquitetura para Persona (docs/architecture/profile-ai-persona.md) e Knowledge Base RAG (docs/architecture/knowledge-base-rag.md)
- Plano detalhado de implementacao para Persona de IA por perfil e Knowledge Base via RAG (docs/planning/profile-ai-persona-knowledge-base.md)
- Imagem Docker do PostgreSQL atualizada para pgvector/pgvector:pg17 (necessario para Knowledge Base)
- Automacoes de comentarios Instagram (estilo ManyChat) — flow builder visual com React Flow para responder comentarios automaticamente
- 5 tipos de no no editor de automacoes: Gatilho (comentario), Condicao (palavra-chave), Responder Comentario, Enviar DM e Atraso
- Nova secao "Automacoes" no menu lateral com listagem e editor visual de flows
- Webhook de entrada para receber eventos de comentarios do Instagram via Meta Graph API
- Execucao de flows via Temporal workflows com suporte a delay duravel e retries automaticos
- Metodo sendDM() no Instagram provider para enviar mensagens diretas via Instagram Messaging API
- Metodo subscribeToWebhooks() no Instagram provider para inscrever paginas em webhooks da Meta
- Inscricao automatica de webhooks ao ativar uma automacao — nao precisa configurar webhook manualmente no Meta Developer Portal
- Seletor de conta Instagram conectada ao criar automacao (substitui input manual de Integration ID)
- Webhook Verify Token configuravel por perfil em Configuracoes > Credenciais (multi-tenancy: cada perfil pode ter seu proprio App Meta)
- HMAC do webhook Instagram valida com App Secret da credencial do perfil (fallback para variavel de ambiente global)
- Documentacao passo-a-passo de Automacoes Instagram em docs/automacoes-instagram.md (referenciada no README)
- Verify Token padrao "multipost" aceito automaticamente no webhook Instagram (zero config — nao precisa cadastrar verify token nas credenciais)
- Bloco copy-paste na tela de Automacoes com Callback URL e Verify Token prontos para colar no Meta Developer Portal
- Botao "Configurar webhook Instagram na Meta" no card Facebook de Credenciais — configura callback URL e verify token automaticamente via API da Meta (1 clique, elimina passo manual no Meta Developer Portal)
- Historico de execucoes por automacao com status em tempo real
- Traducoes pt/en para todas as strings de automacoes
- Seletor de posts do Instagram no no Gatilho — lista recentes (feed/reels/stories) com thumbnail para escolher quais posts disparam a automacao (estilo ManyChat)
- Modo ilimitado para creditos de IA via variavel AI_CREDITS_MODE (default: unlimited para self-hosted)
- Creditos de IA configuraveis por perfil no modo gerenciado (AI_CREDITS_MODE=managed)
- API de gestao de creditos de IA por perfil (GET/PUT /settings/profiles/:id/ai-credits, GET /settings/ai-credits/summary)
- Validacao de API key (OPENAI_API_KEY) antes de consumir credito de IA — retorna 503 se nao configurada
- Tela de gestao de creditos de IA no painel de configuracoes (visivel apenas para admins no modo managed)
- Indicador visual de creditos restantes nos componentes de geracao de imagem e video
- Botao de geracao desabilitado com tooltip quando creditos zerados
- Traducoes pt/en para todas as strings de creditos de IA

### Corrigido
- Automacao completava sem executar acoes (responder comentario, enviar DM) — edge auto-conectada de no de Condicao nao tinha sourceHandle, workflow nao encontrava caminho "match" e pulava todas as acoes
- Env var SKIP_IG_WEBHOOK_HMAC=true para pular validacao HMAC do webhook Instagram quando proxy reverso re-serializa o body
- Validacao pre-criacao de automacao: botao Criar fica desabilitado ate o webhook Instagram estar configurado na Meta para a conta selecionada, com mensagem de ajuda inline no modal
- Verificacao de webhook usa endpoint app-level /{app_id}/subscriptions da Meta Graph API (com app_id|app_secret) — unica forma confiavel de ler o estado do webhook Instagram no modelo de Casos de uso. Tentativa anterior via /subscribed_apps falhava porque token de Business Login nao tem capability para esse endpoint
- Webhook Instagram descartava todos os eventos silenciosamente por filtrar value.item === "comment" (campo so existe em Facebook Page feed, nao em Instagram)
- Validacao HMAC do webhook comparava assinatura com JSON re-serializado (JSON.stringify) em vez do raw body — toda requisicao era rejeitada com 403 quando FACEBOOK_APP_SECRET estava configurado
- Logs detalhados adicionados no webhook handler para facilitar debug de eventos recebidos
- Acao "Responder comentario" postava novo comentario top-level no post em vez de resposta threaded — agora usa POST /{comment_id}/replies conforme docs da Meta
- Acao "Enviar DM" usava /me/messages com recipient.id (so funciona dentro da janela de 24h de mensagem ativa) — trocado para private_replies API (POST /{ig_id}/messages com recipient.comment_id) que eh a unica forma oficial de DM um comentador (janela de 7 dias)
- Toaster cortava mensagens longas (altura fixa 56px) — agora cresce verticalmente com quebra de linha automatica e tempo de exibicao proporcional ao tamanho
- Mensagem de webhook nao configurado mostrava "Detalhe:" vazio quando Meta retornava success=false sem erro
- No de Atraso tinha texto branco sobre fundo branco e borda invisivel no tema claro — agora usa tema laranja consistente com identidade visual
- Inscricao de webhook Instagram usava subscribed_fields=feed (Facebook Page) em vez de comments,messages na conta IG — causava zero eventos chegando mesmo com automacao ativa
- Arestas (conexoes) do flow builder nao podiam ser removidas — agora clique na aresta pede confirmacao para remover; tecla Backspace/Delete tambem remove
- Botao Historico no editor de automacao para visualizar execucoes sem sair da tela
- UX de remocao de arestas estilo n8n — lixeira aparece no hover sobre a conexao
- No de Condicao mostra "Verdadeiro"/"Falso" em vez de "Match"/"Sem match" (mais claro)
- Ao arrastar novo no para o canvas, ele conecta automaticamente ao ultimo no (fluxo linear)

### Alterado
- Renomeacao na interface de automacoes: "Wizard/Assistente" passa a se chamar "Automacao Rapida" (PT) e "Quick Automation" (EN); modo "Avancado/Comecar do zero" passa a se chamar "Flow Builder" (mesmo termo em pt e en) — alinhado com a nomenclatura ManyChat que os usuarios brasileiros ja reconhecem

### Removido
- Botao "Configurar webhook Instagram na Meta" em Credenciais — no modelo de Casos de Uso da Meta (2024) o webhook tem que ser configurado manualmente dentro de cada caso de uso, nao ha endpoint API publico que preencha esses campos

## [0.3.0] - 2026-04-03

### Corrigido
- Login/registro com Google via Generic OAuth falhava com redirect_uri_mismatch — middleware detectava provider incorreto devido a "googleapis.com" nos parametros de scope
- Contagem de integracoes por perfil incluia canais deletados

### Adicionado
- Link de convite Late — botao "Enviar link de convite" abre modal com selecao de perfil e plataforma, gerando link OAuth direto via Late platform-invites
- Credenciais OAuth independentes por perfil — cada perfil pode ter suas proprias credenciais de redes sociais
- Webhooks, Auto Post e Sets isolados por perfil ativo
- Late API key configuravel por perfil — cada perfil pode conectar sua propria conta Late
- Preferencia de Shortlink independente por perfil
- Script de migracao SQL para mover dados existentes de credenciais, webhooks, autopost, sets, late e shortlink para o perfil default
- Migracao automatica no startup do backend — usuarios Docker nao precisam rodar SQL manualmente ao atualizar
- Multi-tenancy com perfis: suporte a 3 niveis (Workspace > Perfil > Recursos) para agencias gerenciarem multiplos clientes
- Modelo Profile e ProfileMember no banco de dados com roles (OWNER, MANAGER, EDITOR, VIEWER)
- API REST para CRUD de perfis e gerenciamento de membros (`/profiles`)
- Troca de perfil ativo via cookie/header (`POST /user/change-profile`)
- Filtragem de integracoes, posts, midia, tags e assinaturas por perfil ativo
- Script de migracao SQL para criar perfis default e migrar dados existentes
- Seletor de perfil no top bar para trocar entre perfis da organizacao
- Tab "Perfis" nas configuracoes para criar, editar, excluir perfis e gerenciar membros (ADMIN+)
- Cookie `showprofile` enviado como header nas requests para manter perfil ativo no frontend
- Documentacao do fluxo de client login para fase futura
- Provider Late unificado — botao unico "Late" no modal de adicionar canal abre selecao de contas ja conectadas no Late
- Suporte a 13 plataformas via Late: Twitter, Instagram, TikTok, YouTube, Facebook, LinkedIn, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat
- Modal de selecao Late com 2 etapas: escolher perfil Late e depois selecionar conta (agrupada por plataforma)
- Opcao de conectar nova conta via OAuth do Late diretamente no modal
- Badge visual Late (asterisco oficial) nos icones de canais conectados via Late para diferenciar de conexoes nativas
- Icone de plataforma como foto de perfil para canais Late (Late SDK nao fornece fotos de perfil)
- Suporte a pre-release (RC) no workflow de release — permite lancar versoes de teste sem afetar `:latest`
- Workflow `promote-release.yml` para promover RC para estavel sem rebuild da imagem Docker
- Opcoes `rc` e `promote` no skill `/new-release`
- Changelog incremental — Claude Code preenche `[Unreleased]` conforme trabalha

### Corrigido
- Isolamento completo de dados por perfil — posts, tags, analytics, agents e canais agora respeitam o perfil ativo em todas as operacoes de escrita e leitura
- Posts criados em um perfil nao aparecem mais em outros perfis
- Find-slot calcula horarios livres considerando apenas posts do perfil ativo
- Analytics valida que a integracao/post pertence ao perfil antes de retornar dados
- Agent (copilot) lista apenas canais do perfil ativo e nao consegue postar em canais de outro perfil
- Threads do agent isoladas por perfil — cada perfil tem suas proprias conversas
- Upload de midia pelo agent agora salva com profileId correto
- Enable/disable/delete de canal valida que a integracao pertence ao perfil ativo
- Integracoes sem perfil (org-level) agora aparecem em todos os perfis corretamente
- Edit/delete de tags agora respeita o perfil ativo
- Autopost busca apenas integracoes do perfil correto ao disparar
- Conexao OAuth agora salva profileId atomicamente na integracao (sem race condition)
- Late connect salva profileId diretamente no createOrUpdateIntegration (eliminada race condition)
- Webhooks preservam profileId ao ser atualizados
- API publica aceita profileId como query param para filtrar integracoes
- Quota de canais conta apenas canais do perfil ativo ao habilitar canal
- Migracao automatica no startup associa posts e midias orfaos ao perfil default
- Conexao de canais Late (TikTok/Pinterest) falhava com erro de sessao expirada ao adicionar canal
- Upload de midia nao aparecia na listagem quando perfil ativo estava selecionado (profileId nao era salvo no registro de midia)
- Midia sem perfil associado (upload anterior ao recurso de perfis) agora aparece para todos os perfis
- Icones de plataforma Late quebravam em 15+ componentes por usar identificador `late-xxx` como path de icone (centralizado via `PlatformIconBadge`)
- Componente `PlatformIconBadge` reutilizavel com badge Late (asterisco SVG oficial) substitui codigo duplicado em 8+ componentes
- Canais Late agora mostram icone da plataforma como foto de perfil (Late SDK nao fornece fotos)
- Layout do frontend falhava ao renderizar `PlausibleProvider` como Fragment (corrigido com renderizacao condicional)
- Rota de uploads retornava erro 500 para arquivos inexistentes (agora retorna 404 com verificacao de existencia)
- Rota de uploads falhava quando `UPLOAD_DIRECTORY` nao estava configurado (agora retorna erro 500 descritivo)
- Adicionada traducao `select_or_upload_pictures_max_1gb` em pt e en
- Agendamento de posts via canais Late falhava silenciosamente — providers `late-*` nao estavam registrados no discriminator de validacao do DTO
- Perfis sem Late configurado conseguiam acessar contas Late de outros perfis — fallback para API key da organizacao removido quando perfil ativo esta selecionado
- Toggle "Compartilhar Late com Perfis" nas Configuracoes Globais — permite controlar se perfis sem chave Late propria usam a chave do workspace padrao
- Mesma conta Late pode ser conectada em perfis diferentes sem conflito (internalId composto com profileId)
- Conexao de canais Late falhava com erro ao tentar fazer upload de icone local como URL (`/icons/platforms/tiktok.png`)
- Posts via Late agora verificam o status real da publicacao na plataforma — se o Late aceita mas a rede social rejeita (ex: token expirado), o erro eh detectado e reportado em vez de marcar como sucesso
- Posts via Late ficavam presos na fila porque a task queue `late` nao tinha worker — Late providers agora usam a task queue `main`

### Alterado
- Skill `/changelog` reescrito para consolidar rascunho incremental em vez de gerar do zero
- CI/CD detecta pre-releases e nao atualiza `:latest` para versoes RC/beta

### Upstream
- Sincronizado com Postiz upstream ate commit f55cca51 (2026-04-03)
- Security: validacao de URLs em webhooks (IsSafeWebhookUrl), protecao contra acesso interno via upload URL
- Upgrade Next.js para versao 16.2.1 com Turbopack
- Novo provider ReelFarm para geracao de video
- Import de posts existentes
- Pinterest: exibicao de mais boards
- MCP com suporte a OAuth
- Sentry metrics e health check para Temporal
- Language switch no frontend com suporte a direcao RTL
- Sistema de announcements (banners de aviso)
- Componente SafeImage substituindo next/image direto
- Sincronizado com Postiz upstream ate commit e20565fb (2026-03-13)
- Novo provider MeWe para publicacao em grupos
- Sistema OAuth Apps — apps de terceiros podem autenticar via Postiz OAuth
- Refactor de auth providers (factory → manager pattern)
- MCP com suporte a OAuth2
- Fixes de Stripe (skip subscription check sem Stripe, require API key)
- Facebook/Instagram connect melhorado, Google My Business com paginacao
- Telegram fix, X API update
- AppSumo webhook handling melhorado
- PR Quality workflow no CI

### Documentacao
- Secao Multi-Tenancy adicionada ao README com link para guia completo
- Guia detalhado de multi-tenancy em `docs/multi-tenancy.md`
- Documentacao reorganizada em estrutura `docs/` (architecture, development, operations, planning)

## [0.2.0] - 2026-02-28

### Adicionado
- Rebranding: Postiz renomeado para "Robo MultiPost" em todo o frontend
- Traducoes pt-BR para componentes principais (canais, email, erros, midia)
- Documentacao de build e publicacao Docker (guia-docker-release.md)
- CLAUDE.md e AGENTS.md com instrucoes para agentes IA
- Source maps para estilos CSS globais
- Skills Claude Code: /sync-upstream, /new-release, /changelog, /fork-status

### Corrigido
- Interpolacao i18next no fluxo de conexao de canais
- Logo no README usando asset local em vez de fonte externa
- Registry CI/CD: corrigido de ghcr.io/gitroomhq para ghcr.io/maiconramos

### Alterado
- README reescrito para comunidade brasileira (Automacao Sem Limites)
- Traducoes de notificacoes por email atualizadas
- Versao do fork definida como 0.1.0 (independente do upstream)

### Upstream
- Baseado no Postiz upstream em commit ccd66571 (era ~v2.16.0)
- Sincronizado com Postiz upstream ate commit `6c39e810` (2026-02-28)
  - feat: URL separada para MCP server (`mcpUrl`)
  - feat: Redis throttler para rate limiting
  - feat: Suporte a TLS e API key no Temporal
  - feat: Melhor tratamento de erros no TikTok
  - feat: Funcionalidade de logout
  - feat: Compressao HTTP e melhores indices no banco
  - feat: Cobrancas apenas para sucesso + reembolso e cancelamento
  - fix: Colaboradores em carrossel do Instagram
