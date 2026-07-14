# Plano de Leveza & Estabilidade — Vocaccio 2026-07

**Objetivo:** reduzir peso, instabilidade e engessamento herdados do Postiz com **mínimo esforço e máxima eficiência** — sem rewrite, sem APIs pagas, sem quebrar produção.
**Executores-alvo:** Opus 4.8 (decisões/migrações), Sonnet (implementação), Haiku (triviais/revisão).
**Complementa (não substitui):** `docs/auditoria/audit-2026-06-20.md` (48 achados VOC-01..48). Itens de segurança/dados continuam mapeados lá; este plano cobre o eixo **peso/estabilidade/DX**.
**Fronteira com o Codex (Edwiges):** motores de cálculo Religare são do Codex (viram canônicos ao `VALIDATED`). Este plano **não toca** na camada de cálculo Religare. Infra, UI host, Postiz-core e billing são do lado Claude.

---

## Diagnóstico resumido (o "peso Postiz")

| Sintoma | Evidência |
|---|---|
| Monorepo carrega 6 apps, produto usa 3 | `apps/extension`, `apps/sdk`, `apps/commands` não fazem parte do produto Vocaccio; `pnpm dev` sobe a extension junto |
| ~200 dependências na raiz | Pesos mortos prováveis: `@copilotkit/*` (4 pkgs), `mastra` + `@mastra/*` (5), `@langchain/*` (5), `@ag-ui/mastra`, web3 (`@solana/*`, `viem`, `bs58`, `nostr-tools`, `tweetnacl`), `@neynar/*` (Farcaster), `polotno` (editor Postiz — Vocaccio tem Konva próprio), `@uppy/transloadit`/`transloadit` |
| Rotas herdadas visíveis mas não usadas | `(site)/agents` (CopilotKit), `(site)/plugs`, `(site)/third-party` |
| 36 providers sociais carregados | Produto usa um subconjunto; código de todos entra no bundle/boot |
| Dev pesado em laptop 8GB | Next + NestJS + Temporal + extension em paralelo; tsc do backend faz OOM com heap default **e sai 0 falsamente** |
| Sem trilho de migrations | VOC-29 — `db push` em produção (pré-requisito das mudanças estruturais) |

**Princípios de execução (valem para todas as fases):**
1. **Quarentena antes de deleção** — esconder/desligar por flag primeiro; deletar só depois de um ciclo estável.
2. Antes de remover qualquer dependência: `grep` de imports no monorepo inteiro → remover → `pnpm build` completo → **boot real do backend (curl)** → commit isolado.
3. Um commit por onda/módulo; rollback = `git revert`.
4. Rodar `moody-revisor` no diff antes de cada commit.
5. Nada de serviço/API pago. Nada de linguagem/runtime novo.

---

## Fase 0 — Concluir a segurança em andamento *(pré-requisito, já iniciada)*
A branch `fix/voc-idor-project-content` (Fase 1 da auditoria: VOC-01, 02, 04, 06, 09, 31, 32…) deve ser finalizada e mergeada **antes** das podas, para não misturar diffs.
**Modelo:** Sonnet médio. **Verificação:** smoke de CRM/portal + boot real.

## Fase A — Dieta do dev-loop *(esforço: trivial · risco: ~zero · ganho imediato no laptop 8GB)*
| # | Tarefa | Nota |
|---|---|---|
| A1 | Script `dev:voc` = só backend+frontend (o `dev-backend` já existe; padronizar como default do dia a dia) | extension/orchestrator só quando necessário |
| A2 | `build` padrão sem `extension`/`sdk`/`commands` | já é quase isso; garantir e documentar |
| A3 | `NODE_OPTIONS=--max-old-space-size=4096` no tsc/CI | corrige o "sai 0 falsamente" (gotcha da auditoria). **Correção 2026-07-03:** só tinha sido aplicado no `build` do `apps/backend`; `pnpm install` real (feito nesta sessão, node_modules agora existe no worktree) revelou que o **orchestrator OOMava do mesmo jeito** — corrigido em `apps/orchestrator/package.json` também. Validado com build real (não só tsc) nos dois: exit 0. |
| A4 | Alinhar `volta.node` ↔ `engines` (VOC-40); placeholder óbvio no `.env.example` (VOC-42); apagar `apps/backend/undefined/` | higiene |

**Modelo:** Haiku. **Reversão:** revert de config.

## Fase B — Quarentena de módulos Postiz não usados *(esforço: leve · risco: baixo)*
Desligar por configuração, **sem deletar código**:
| # | Tarefa | Como |
|---|---|---|
| B1 | ✅ **FEITO 2026-07-02.** Ocultar rotas `agents`, `plugs`, `third-party` do menu | `top.menu.tsx`: flag `NEXT_PUBLIC_VOC_LEGACY_MODULES` (default oculto), reaproveitando o campo `hide` que o filtro do menu já suportava. Reversível via env, sem tocar código de rota. |
| B2 | Registrar condicionalmente no NestJS os controllers correspondentes (`copilot`, `third-party`, `signature`?) | ✅ **FEITO 2026-07-09.** Felipe decidiu seguir com a separação do `ThirdPartyController` (ver auditoria abaixo). `copilot`/`signature` continuam não tocados (core, veredito confirmado). |
| B3 | Inventário de providers sociais implementados (36, `libraries/nestjs-libraries/src/integrations/social/`) — falta cruzar com uso real em produção | ⚠️ **RODADO 2026-07-10, SEM SINAL PRA PODAR.** Query corrigida (coluna é `providerIdentifier`, não `provider`): `SELECT "providerIdentifier", count(*) FROM "Integration" WHERE "deletedAt" IS NULL GROUP BY "providerIdentifier" ORDER BY 2 DESC;` → **zero linhas retornadas**: não existe nenhuma integração ativa de nenhum provider em produção (produto pré-MVP, zero pagantes — ver memória Fase M). O resultado não discrimina "provider usado" de "não usado", só confirma que ninguém usou posting ainda — **não é sinal válido pra podar providers específicos**, seria descartar capacidade sem embasamento. Decisão: **adiado pra pós-launch**, quando houver uso real (mesmo critério do v2.0 já previsto). Não rodar de novo até haver clientes pagantes com canais conectados. |
| B4 | Billing **fica** (decisão P-04 da Edwiges: tiers Postiz = verdade) | não tocar |

**Detalhe da auditoria B2 (2026-07-09, grep exaustivo em `apps/*/src` + `libraries/*/src`,
seguindo `poda-segura`: "zero hits é a única prova de morte, hit ambíguo = leia o arquivo"):**

| Candidato | Achado | Veredito |
|---|---|---|
| `agents` (controller) | Não existe mais. A página `/agents` já foi deletada na onda C1; o `CopilotController` já teve as rotas Mastra-específicas (`/agent`, `/list`, `/:thread/list`) removidas na mesma onda (`copilot.controller.ts:12-15`, comentário explícito). O `AgentModule` (`libraries/nestjs-libraries/src/agent/agent.module.ts`) só exporta `AgentGraphService`/`AgentGraphInsertService`, consumidos por `PostsController` (`posts.controller.ts:22,38`) e `PublicController` (`public.controller.ts:21,38`) — feature core de geração de post, sem relação com a página deletada. **Nada a quarentenar.** |
| `copilot` | `CopilotController` hoje só expõe `/copilot/chat` e `/copilot/credits` (`copilot.controller.ts`). Consumido incondicionalmente (sem gate de flag) por `editor.tsx`, `ai.video.tsx`, `polonto.picture.generation.tsx`, `pick.platform.component.tsx` — fluxos de criação de conteúdo ativos, não a página `/agents` deletada. Confirma o veredito já registrado no C1 ("usado pelo editor/autopost", "não re-decidir"). **Quarentenar o controller inteiro quebraria IA do editor em produção. Não tocar.** |
| `third-party` | `ThirdPartyController` é **uso misto**, não isolável por controller: `GET /third-party`, `POST /:id/import` e `POST /function/:id/:functionName` são chamados incondicionalmente por `third-party.media.tsx:164`, `third-party.media-library.tsx:63,238` — renderizados sem gate dentro do Media Library principal (`media.component.tsx:453,515`, `<ThirdPartyMediaLibrary>` sempre montado). Só `GET /third-party/list` (catálogo) e a UI de conectar/remover integração (`third-party.list.component.tsx`, `third-party.component.tsx`) pertencem exclusivamente à página `/third-party` já oculta do menu (`top.menu.tsx:145-146`). **Quarentenar o controller inteiro quebraria a importação de mídia (heygen/reelfarm) em produção para todos os usuários.** Gate por endpoint (só as rotas exclusivas da página) exigiria separar o controller em duas superfícies — é decisão de arquitetura, fora do escopo autorizado desta sessão. |
| `signature` (o "?" do plano) | `SignatureController` (`/signatures`) é usado por `editor.tsx` (assinatura no composer) e `settings.component.tsx`/`signatures.component.tsx` — feature core do Postiz, **sem nenhuma relação** com as rotas ocultas B1 (`agents`/`plugs`/`third-party`). O "?" original do plano estava certo em desconfiar: não é candidato. |

**Conclusão da auditoria:** não existia, no NestJS, um controller cuja superfície *inteira*
servisse exclusivamente às rotas já ocultas pelo B1. Fazer o gate como B2 pedia — por
controller — quebraria feature ativa (Media Library import e/ou IA do editor) para
usuários reais.

**✅ Execução 2026-07-09 (commit `fbddd58e`), Felipe autorizou seguir com a separação:**
`ThirdPartyController` foi dividido em dois: as 3 rotas exclusivas da página `/third-party`
(`GET /list`, `DELETE /:id`, `POST /:identifier`) migraram para o novo
`ThirdPartySettingsController` (`apps/backend/src/api/routes/third-party-settings.controller.ts`),
registrado condicionalmente em `api.module.ts` pela mesma flag `NEXT_PUBLIC_VOC_LEGACY_MODULES`
(reaproveitada do backend, sem criar uma segunda flag para evitar drift) — tanto no array de
`controllers` quanto no `forRoutes` do `AuthMiddleware`, sem risco de uma rota ficar registrada
sem proteção de auth. `ThirdPartyController` manteve só as rotas core (sempre ativas). `copilot`
e `signature` não foram tocados (confirmados core na auditoria, sem candidato de quarentena).

Validado: build real (`nest build`, heap 4096) limpo; boot real com a flag off (rotas de
settings 404, rotas core 401 sem auth, resto do backend normal) e com a flag on (rotas de
settings passam a 401 sem auth — registradas e protegidas — sem colisão com as rotas core).
Revisado por `moody-revisor` (sem quebras) e pela skill `security-review` (sem achados).

**Modelo:** Sonnet médio (B2 exige cuidado com injeção de dependências do Nest). **Verificação:** boot + login + agendar post + CRM + Religare + Volatis. **Reversão:** flag de volta.

## Fase C — Poda de dependências em ondas *(esforço: moderado · risco: médio-controlado · maior ganho de peso)*
Só após Fase B estável. Uma onda por sessão, commit isolado, seguindo o princípio 2.

**⚠️ Auditoria grep-verificada 2026-07-02 (Sonnet, sem execução — ver "restrição de ambiente"
abaixo): a suposição original de C1 estava ERRADA.** Não editei `package.json`/`pnpm-lock.yaml`.

| Onda | Candidatos originais | Veredito real (grep exaustivo em `apps/*` + `libraries/*`) |
|---|---|---|
| C1 | `@copilotkit/*`, `mastra`, `@mastra/*`, `@langchain/*`, `@ag-ui/mastra`, `openai` | ✅ **FECHADO 2026-07-03 — decisão: ADORMECER, não remover.** `@copilotkit/*`/`@langchain/*`/`openai` confirmados core (editor/autopost/media/video) — não remover. Mastra sustenta um endpoint MCP público (`/mcp/:apiKey`, documentado na página de API, pra ferramentas de IA externas tipo Claude Desktop) que Felipe **nunca usou/divulgou** (produto pré-MVP), mas **gostou da ideia** e quer reativar pós-MVP integrado aos agentes/back-office — não é caso de remoção definitiva como o Farcaster. Implementado "modo adormecido" (mesmo espírito da quarentena do Polotno, adaptado pro backend): **1)** `mastra.store.ts` — `pStore` era um `PostgresStore` **eager** (`export const pStore = new PostgresStore(...)`, conectava no import do módulo mesmo sem uso) → virou `getPStore()` singleton **lazy**, só conecta na primeira chamada real. Achado que motivou a mudança: `ChatModule` registrado no `app.module.ts` já bastava pra abrir esse pool de conexão à toa. **2)** `copilot.controller.ts` — removidas as rotas `/agent`, `/list`, `/:thread/list` (só a página `/agents`, já deletada, as consumia) — ficaram só `/chat`+`/credits` (CopilotKit puro, sem Mastra, usado pelo editor/autopost). **3)** `main.ts` — `startMcp()` trocou de `DISABLE_MCP!=='true'` (ligado por padrão) pra `MASTRA_ENABLED==='true'` (desligado por padrão) **com import dinâmico** (o módulo `@mastra/mcp`+OAuth middleware nem carrega na memória enquanto adormecida). Nada removido de `package.json`/`chat/tools/*` — reativação = só `MASTRA_ENABLED=true`. **Import morto do `MastraService` em `auth.middleware.ts`** (achado de rodada anterior) segue sem tocar, baixo risco isolado. |
| C2 | `polotno` (+ `polonto.css`), `@uppy/transloadit`, `transloadit` | ✅ **FEITO 2026-07-09 — Polotno removido de vez.** Felipe testou o mini-editor Konva no browser (upload, crop arrastável, rotate 90°) e aprovou — cobre o caso de uso real. Removidos: dependência `polotno` do `package.json`; `apps/frontend/src/components/launches/polonto.tsx` + pasta `polonto/` (`polonto.picture.generation.tsx`); `apps/frontend/src/app/polonto.css` (16528 linhas) + o `@use` correspondente em `global.scss`. `MiniImageEditorLoader`/Konva vira a única implementação do Media Editor. **Rollout aprovado 2026-07-10**: flag `NEXT_PUBLIC_VOC_MEDIA_EDITOR_ENABLED` removida de vez (`media.component.tsx`) — Design Media/Editor ficam sempre disponíveis, mesmo padrão do Polotno original (gate de acesso passa a ser só o tier AI do usuário, como já era no clique). `@uppy/transloadit`/`transloadit` **não tocados** — usados em `images.slides.ts` (vídeo) e `uppy.upload.ts` (infra genérica de upload, não confinada ao Polotno); seguem fora do escopo desta onda. |
| C3 | Web3/nicho: `@solana/*`, `viem`, `bs58`, `tweetnacl`, `nostr-tools`, `@neynar/*`, `@postiz/wallets` | ✅ **FEITO 2026-07-03.** B3 rodado em produção (Felipe, Supabase SQL Editor): `total=0, ativas=0` na tabela `Integration` — zero clientes conectaram qualquer canal. Felipe aprovou remoção real (não quarentena) de Farcaster/Nostr/login-por-carteira: providers de posting (`farcaster`/`nostr.provider.ts`), providers de login (`wallet`/`farcaster.provider.ts` back+front), connect-flow (`wrapcaster.provider.tsx`, pastas `warpcast/`+`nostr/` do composer), botão Neynar (`nayner.auth.button.tsx`), registries (`integration.manager.ts`, `api.module.ts`, `show.all.providers.tsx`, `web3.list.tsx`, `all.providers.settings.ts`) + as 9 deps do `package.json`. `Telegram`/`Moltbook` mantidos (não são web3 de verdade, só compartilhavam pasta por convenção de nome do Postiz). `pnpm install` real rodado, lockfile regenerado, build real (não só typecheck) validado limpo em backend/orchestrator/frontend. 1 referência perdida na 1ª passada (`web3.list.tsx`) — pega pelo próprio `tsc`, corrigida. Commit `07315e1d`, pushado. |
| C4 | Pinar o que sobrar de IA/volátil (VOC-41) | ✅ **FEITO 2026-07-09.** Pinadas as 11 deps de IA que ainda usavam range (`@ag-ui/mastra`, `@langchain/community`, `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`, `@langchain/tavily`, `@mastra/core`, `@mastra/mcp`, `@mastra/memory`, `@mastra/pg`, `mastra`) para versão exata em `package.json` — todas já resolviam pro topo do range (conferido no `pnpm-lock.yaml` antes de editar), então é troca de política de versionamento, não upgrade/downgrade. `pnpm install` real regenerou o lockfile; build real (`nest build`, heap 4096) limpo nos 3 apps (backend/orchestrator/frontend); boot real do backend validado (rotas mapeadas, sem erro de DI, `/third-party` e `/copilot/credits` retornam 401 sem auth como esperado). |

**Alternativa leve pro Polotno — decisão do Felipe 2026-07-02: testar Konva.**
Reaproveitar o **Konva** que o Volatis já usa (`libraries/carousel-engine` +
`components/volatis/carousel`) pra um editor mínimo de recorte/rotação/ajuste básico
de uma imagem — zero dependência nova (Konva já está pago em peso de bundle, e o time
já tem o padrão pronto), em vez de instalar outra lib do npm (proibido pelo
`CLAUDE.md` do projeto: "Never install frontend components from npmjs"). `<canvas>`
nativo puro fica como plano B se o protótipo em Konva não convencer.

**✅ FEITO 2026-07-03 (protótipo implementado e já ligado, atrás da flag):**
- `apps/frontend/src/components/media/mini-image-editor.component.tsx` — Stage único,
  upload de imagem, crop (`Rect` + `Transformer` do Konva, arrastável/redimensionável),
  rotate 90° (via canvas offscreen — mais simples que combinar rotação+crop no Konva),
  export por `canvas.toBlob` → `POST /media/upload-simple` → `setMedia`/`closeModal`
  (mesma interface do Polonto). Escopo **deliberadamente menor** que o Polotno: o
  Polotno abre um canvas em branco tipo mini-Canva (texto, formas, painel de IA);
  isso cobre só "editar uma foto" (upload+crop+rotate), que é o caso de uso "básico"
  que motivou a quarentena.
- `mini-image-editor-loader.component.tsx` — wrapper `next/dynamic({ssr:false})`,
  mesmo padrão do `carousel-editor-loader.component.tsx` (Konva toca `window`/canvas).
- `media.component.tsx`: os 2 gatilhos que abriam `<Polonto>` agora abrem
  `<MiniImageEditorLoader>` — na época desta entrada (2026-07-03), atrás da flag
  `NEXT_PUBLIC_VOC_MEDIA_EDITOR_ENABLED` (default off). **Superado 2026-07-10**: flag
  removida, ver linha C2 acima — sem efeito prático nesta descrição do que foi implementado.
- **Validado nesta sessão** (rodei `pnpm install` real no worktree, ~7min via store
  hardlink — destravou build/typecheck real sem precisar de `.env`/DB): `tsc --noEmit`
  E `nest build` real limpos (exit 0) em backend/orchestrator/frontend, incluindo os 2
  arquivos novos. **Não validado ainda:** teste visual no browser (upload real, arrastar
  o crop, ver o resultado) — precisa de `.env`/DB, que não existe neste worktree.
- **Bug corrigido nesta rodada** (achado pelo Moody): rotação não resetava o crop —
  como a imagem troca largura/altura ao girar 90°, o retângulo antigo ficava
  desalinhado. Corrigido: `onRotate` agora zera o `crop` pra forçar `resetCrop` na
  imagem nova.

**✅ Concluído 2026-07-09:** Felipe testou no browser e aprovou — ver linha C2 acima
para o detalhe da remoção real do Polotno.

**Restrição de ambiente que forçou este escopo:** este worktree não tem `node_modules`
(sem `pnpm install`/build/boot possível aqui). Mesmo os poucos itens realmente seguros
(mastra/`@ag-ui/mastra`, condicionados à Fase B2) exigem editar `package.json` E
regenerar `pnpm-lock.yaml` via `pnpm install` E validar build+boot — nenhuma dessas
três coisas é segura de fazer sem ambiente completo. **Decisão tomada: zero edição de
dependências nesta sessão; esta tabela é o ponto de partida pronto pra próxima sessão
com boot real** (a partir de `C:\dev\vocaccio`, não de um worktree).

**Ganhos esperados (quando executado):** install e cold-start mais rápidos, menos RAM no dev, superfície supply-chain menor, `pnpm-lock` mais estável.
**Modelo:** Sonnet médio pro grep/execução; Opus se a decisão de produto do C2 (Polotno vs Konva) precisar de arbitragem. **Reversão:** revert do commit da onda (lockfile volta junto).

## Fase D — Estabilidade barata *(esforço: leve · itens já mapeados na auditoria — executar, não re-analisar)*
- **VOC-45/46:** ✅ **FEITO 2026-07-02.** `AutopostActivity.autoPost` reporta pro Sentry antes de re-lançar; workflow loga via `log.error` (determinístico, `@temporalio/workflow`) em vez de engolir o erro; `backoffCoefficient: 1→2` no autopost e no `post.workflow.v1.0.5.ts` ativo (v1.0.1-v1.0.4 propositalmente não tocados — frozen p/ workflows em voo).
- **VOC-34:** ✅ **FEITO.** `@@index([projectId, status, position])` em `ContentItem` + migration manual `20260702_voc34_contentitem_kanban_index` (worktree sem DB pra rodar `prisma migrate dev`; SQL escrito seguindo a convenção de nome do Prisma — conferir ao aplicar).
- **VOC-11/12/27:** VOC-11/12 (listExperts/kanban) já vieram prontos da Fase 0 (branch de segurança mergeada). VOC-27 ✅ **FEITO**: `use-religare-profiles.hook.ts` agora pagina internamente até completar `total`.
- **VOC-38/22/21:** ✅ **FEITO.** `chart.tsx`/`chart-social.tsx` com `import type` + dynamic import de `chart.js/auto` dentro do `useEffect`; `religare-pdf-export.ts` carregado sob demanda no clique (não mudei o módulo em si, só o import no componente consumidor); `layoutRuns` em `useMemo` (cuidado: movido pra ANTES do early-return existente, senão quebra rules-of-hooks); upload de slides em `Promise.all`.
- **VOC-20:** ✅ **FEITO (versão leve).** `captureAll()` agora cede a thread (`await setTimeout 0`) entre cada slide capturado; `dataUrlToBytes` trocou o loop manual por `Uint8Array.from`. **Não fiz** a versão completa (Worker/OffscreenCanvas + barra de progresso) — fica pro v2.0 se o ganho de UX justificar.
- **Achado do Moody (não é regressão, é pré-existente):** `exportZip`/`exportPdf` já eram `async` antes desta fase e o menu (`PublishExportMenu` em `carousel-editor.component.tsx`) já fazia fire-and-forget (`run()` fecha o menu sem aguardar a Promise, sem loading state). Comportamento inalterado por esta fase — mas vale um item futuro: `onZip`/`onPdf` tipados `() => Promise<void>` + spinner no menu enquanto exporta.

**Modelo:** Sonnet baixo/médio; Haiku nos triviais.

## Fase E — Desengessar convenções e time (DX) *(esforço: leve)* — ✅ FEITO 2026-07-02
- `CLAUDE.md` do projeto: corrigido "This project is Postiz" → Vocaccio (fork, com o que foi adicionado); corrigido "Vite ReactJS" → Next.js/App Router (estava errado); adicionado aviso sobre `extension`/`sdk`/`commands` não serem produto; adicionado o princípio grep→`pnpm install`→build→boot→commit isolado + link pro plano.
- `moody-revisor`/README dos agentes: regra de quarentena/poda já tinha sido adicionada na Fase 0/B.
- `sirius-backend`: ganhou nota sobre módulos candidatos a quarentena condicional (`copilot`/`third-party`/`agents`) + a mesma regra de poda de dependência.
- `flitwick-frontend`: ganhou a lista de rotas quarentenadas (`agents`/`plugs`/`third-party`) e instrução de não reativar/expandir sem pedido.
- **Pulado de propósito:** scripts `voc:*` no README raiz — o README raiz é o material de marketing herdado do Postiz (stars/sponsors), não o lugar certo, e não havia necessidade real de scripts novos (`dev-backend` já cobre o caso de uso da Fase A).

**Modelo:** Haiku.

---

## Passo-a-passo do Felipe (2026-07-03) — ✅ TODOS OS 5 ITENS FECHADOS

Lista original arquivada — todos os itens foram resolvidos em sessões seguintes:
1. Teste do editor Konva → aprovado 2026-07-09 (ver C2).
2. Query SQL de providers (B3) → rodada 2026-07-10, zero linhas, poda adiada pro pós-launch (ver B3).
3. Merge da branch em `main` → feito 2026-07-09/10 (commits até `f46e8db5`).
4. Migration VOC-34 → aplicada (confirmado por Felipe: `prisma-migrate-deploy` sem pendências).
5. Decisão B2 → fechada 2026-07-09 (separação `ThirdPartyController`, ver B2).

---

## Goal prompt — execução autônoma Fases C+E (2026-07-02, Felipe foi dormir)

**Contexto para quem retomar (se a sessão cair):** Fases 0/A/B/D já commitadas e
prontas (ver commits `chore(fase-a)`, `chore(fase-b)`, `chore(fase-d)` na branch
`claude/magical-allen-1f35af`). Felipe autorizou concluir C e E sozinho, trocando
modelo/esforço se preciso, sem parar até terminar, e **commitar + dar push ao final**.

**Restrição de ambiente descoberta em campo:** este worktree NÃO tem `node_modules`
(`test -d node_modules` → não existe) — não dá pra rodar `pnpm install`/build/boot
aqui. Isso invalida a execução "cega" da Fase C tal como descrita (grep→build→boot
no mesmo commit): **não é seguro editar `package.json` removendo dependências sem
poder rodar `pnpm install` pra regenerar o `pnpm-lock.yaml`** — ficaria dessincronizado
e quebraria qualquer CI com `--frozen-lockfile`.

**Decisão mais segura (tomada, não perguntar de novo):** Fase C vira uma **auditoria
grep-verificada e documentada** (não uma remoção de fato) nesta sessão. A remoção real
de dependências fica marcada como pronta-pra-executar a partir do checkout principal
(`C:\dev\vocaccio`), onde há `pnpm`/DB/boot real. Fase E é executada por completo
(não depende de build).

**Modelo recomendado para as duas fases, do início ao fim, sem necessidade de troca:**
Sonnet, esforço médio. Justificativa: nenhuma decisão arquitetural (isso seria Opus);
mas greps precisam ser exaustivos e cuidadosos (não é trivial o bastante pra Haiku
sozinho) — usos indiretos, imports dinâmicos, string-based provider loading, etc.

**Passo a passo:**
1. Fase E completa: `CLAUDE.md` do projeto (remover instruções obsoletas do Postiz
   puro, linkar este plano, documentar mapa de quarentena B1 e o princípio
   grep→build→boot); confirmar que os agentes (README + moody-revisor) já têm a regra
   de não reintroduzir deps podadas (já feito na Fase 0/B — só conferir, não duplicar).
2. Fase C como auditoria: para cada onda (C1 copilotkit/mastra/langchain/ag-ui, C2
   polotno/uppy-transloadit, C3 web3/nicho), grep exaustivo de imports em
   `apps/*/src`, `libraries/*/src` (não só frontend) — path por path, contando
   ocorrências reais de import/require, não só menção em texto. Documentar no plano:
   o que tem zero uso confirmado (pronto pra remover na próxima sessão com boot real)
   vs o que ainda é usado (não mexer). NÃO editar `package.json`/`pnpm-lock.yaml`.
3. Rodar `moody-revisor` no diff antes de commitar (mesmo sendo só docs, é barato e
   é a convenção do time).
4. Commit com mensagem clara distinguindo "Fase E: feito" de "Fase C: auditoria
   pronta, execução real pendente de ambiente com boot".
5. `git push` da branch `claude/magical-allen-1f35af` (Felipe já autorizou push
   nesta sessão, incluindo o fast-forward de `main` feito mais cedo).
6. Se travar em algo que exige decisão de produto/arquitetura (não deveria, dado o
   escopo), parar e deixar registrado — não adivinhar.

---

## Fase P — Performance do backend (auditoria 2026-07-13, Fable — ✅ EXECUTADA 2026-07-14)

**✅ P1, P2 e P3 concluídos 2026-07-14 (Sonnet), commits isolados com boot real +
moody-revisor antes de cada um:**
- P1 (`3dc60b69`): heap flag no `dev` de backend/orchestrator; `DISABLE_SWAGGER`
  documentado no `.env.example`. Boot real: sobe limpo, `/user/self` → 401, sem rota
  `/api` (Swagger) mapeada.
- P2 (`97a5434e`): removido `import { Runtime } from '@temporalio/worker'` +
  `Runtime.install(...)` do `main.ts` do backend (grep confirmou: só cliente Temporal,
  `nestjs-temporal-core` client mode não referencia `@temporalio/worker`). Boot real 2x:
  sem `TEMPORAL_ADDRESS` sobe limpo; com `TEMPORAL_ADDRESS` apontando pra endereço sem
  servidor real, falha com `ECONNREFUSED` no cliente gRPC (capturado, sem crash) — **mesmo
  comportamento reproduzido no baseline** (código original, antes da remoção), confirmando
  que não é regressão. Validação completa do fluxo de agendar post com Temporal real fica
  pendente de ambiente com Temporal acessível (fora do escopo — stack docker-compose.dev.yaml
  pesada demais pro laptop 8GB).
- P3 item 1 (`b41d4bea`): throttler não passa mais `storage` do Redis quando `REDIS_URL`
  não está setado (evita quebra em runtime contra o `MockRedis`). Boot real 2x (com e sem
  `REDIS_URL`) validado.
- P3 item 2/opcional (`4520c403`): singletons de IA (`openai.service.ts`,
  `agent.graph.service.ts`, `agent.graph.insert.service.ts`, `autopost.service.ts`) viram
  lazy-getter, mesmo padrão do `mastra.store.ts`. Build real (`nest build`, heap 4096)
  limpo + boot real validado.

**P4 pulado por decisão explícita** (SWC builder no dev) — exige aprovação do Felipe antes
de executar (deps novas `@swc/core`/`@swc/cli`), não solicitada nesta sessão.

**Contexto:** varredura de runtime do backend focada em RAM/estabilidade no laptop 8GB.
As fases 0/A/B/C/D/E já cobriram deps e quarentenas; esta fase ataca o que **ainda**
pesa no processo do backend em si. **Executar a partir de `C:\dev\vocaccio`** (worktrees
não têm `node_modules` — sem build/boot real, não mexer).

### P1 — Dieta de dev (Haiku, esforço baixo · risco ~zero · ganho imediato)
1. `DISABLE_SWAGGER=true` no `.env` local de dev — o gate já existe
   (`apps/backend/src/main.ts:83`), só não é usado. Swagger regenera o schema de
   todas as rotas a cada boot. Não mudar o default (prod continua com docs).
2. Heap flag no **dev** do backend e do orchestrator: o A3 pôs
   `--max-old-space-size=4096` só no `build`; o `dev` (`nest start --watch`) roda com
   heap default e é o mesmo tsc que já OOMou. Adicionar `NODE_OPTIONS` ao script `dev`
   de `apps/backend/package.json` e `apps/orchestrator/package.json` (via `cross-env`,
   já usado no build).
3. Reforçar `pnpm dev-backend` como comando padrão do dia a dia (já existe; A1).
   Orchestrator/Temporal só quando for testar posting/workflows.

**Verificação:** `pnpm dev-backend` sobe + curl em endpoint autenticável retorna 401.

### P2 — Tirar o worker runtime do Temporal do processo da API (Sonnet, esforço médio · o achado grande)
`apps/backend/src/main.ts:7-8` faz `import { Runtime } from '@temporalio/worker'` +
`Runtime.install({ shutdownSignals: [] })` **no backend** — que é só *cliente* Temporal
(único hit de `@temporalio/worker` fora do orchestrator, grep 2026-07-13). Isso carrega
o core-bridge nativo (Rust) do worker na memória da API em todo boot, mesmo quando
`TEMPORAL_ADDRESS` nem está setado (os módulos Temporal já são condicionais em
`app.module.ts:20,35-39`, mas o import do `main.ts` roda sempre).

Passos (nesta ordem, sem pular):
1. Conferir se `nestjs-temporal-core` (modo client, `isWorkers=false`) exige o
   `Runtime` instalado: `grep -r "@temporalio/worker" node_modules/nestjs-temporal-core/dist`.
2. Se **não** exigir: remover import+install do `main.ts`.
   Se exigir: condicionar com import dinâmico atrás de `process.env.TEMPORAL_ADDRESS`
   (mesmo padrão do Mastra adormecido, `main.ts:54-63`).
3. Boot real **duas vezes**: com `TEMPORAL_ADDRESS` setado (fluxo de agendar post não
   pode regredir — o `Runtime.install({shutdownSignals: []})` existia provavelmente pra
   impedir o Temporal de sequestrar SIGINT/SIGTERM; observar shutdown limpo) e sem.
4. `rtk git diff` → moody-revisor → commit isolado.

### P3 — Estabilidade barata (Sonnet, esforço baixo)
1. **Throttler sem Redis:** `app.module.ts:47` passa `ioRedis` que, sem `REDIS_URL`,
   é um `MockRedis` com 3 métodos fingindo ser `Redis`
   (`libraries/nestjs-libraries/src/redis/redis.service.ts:25-30`). O
   `ThrottlerStorageRedisService` usa comandos/scripts que o mock não tem → erro em
   runtime no primeiro request em qualquer ambiente sem Redis. Trocar: sem `REDIS_URL`,
   usar o storage em memória default do `@nestjs/throttler` (não passar `storage`).
2. **Singletons de IA em module-scope:** `new OpenAI(...)` (`openai.service.ts:7`),
   `new ChatOpenAI`/`new DallEAPIWrapper` (`agent.graph.service.ts:24,30`,
   `agent.graph.insert.service.ts:11`, `autopost.service.ts:38,44`) leem env e alocam
   no **import**. Ganho de RAM pequeno; ganho real é estabilidade/testabilidade
   (boot não deve depender de ordem de env). Converter pro padrão lazy-getter já usado
   no `mastra.store.ts` (`getPStore()`). **Opcional** — só se P1+P2 forem tranquilos;
   nunca no mesmo commit.

### P4 — SWC builder no dev (OPCIONAL — decisão do Felipe antes de executar)
`nest start -b swc` derruba muito o custo de CPU/RAM do watch, mas exige devDeps novas
(`@swc/core`, `@swc/cli`) — trade-off Griphook (dep pesada vs. laptop 8GB). **Não
executar sem aprovação explícita.** Se aprovado: Sonnet médio, typecheck vira passo
separado (`tsc --noEmit` manual/CI), validar que decorators/DI do Nest compilam certo.

**Roteamento (Griphook):** P1 = Haiku baixo · P2 = Sonnet médio · P3 = Sonnet baixo ·
P4 = Sonnet médio (se aprovado). Sessão única de Sonnet médio cobre tudo, com P1
delegável a Haiku. Ordem: P1 → P2 → P3, um commit por item, boot real entre cada.

---

## v2.0 — Pós-lançamento (robusto demais para agora; NÃO executar antes de faturar)
1. **VOC-29 → trilho `prisma migrate`** + toda a Fase 3+ da auditoria: cifragem de tokens (VOC-03/08), tokens fora da history do Temporal (VOC-44), idempotência de posting (VOC-43), `onDelete`/FKs (VOC-35/36).
2. **Poda de providers sociais**: allowlist real de providers (código carregado condicionalmente), remoção das deps de nicho restantes (C3 adiado).
3. **Extração de `apps/extension`/`sdk`/`commands`** do monorepo (ou exclusão definitiva).
4. **Avaliar simplificação do orchestrator**: Temporal é pesado para o volume atual; estudar redução de workflows ou alternativa leve — **só com sistema faturando e staging**.
5. Upgrades major coordenados (Next/React/Nest) com lockfile pinado.
6. Fase H White-Label (Growth Hub revendável) — conforme memória.

---

## Roteamento de modelo por fase (Griphook)
| Fase | Modelo | Esforço |
|---|---|---|
| 0 | Sonnet | médio |
| A | Haiku | baixo |
| B | Sonnet | médio |
| C | Sonnet (+ Haiku p/ greps) | médio |
| D | Sonnet/Haiku | baixo-médio |
| E | Haiku | baixo |
| v2.0 | Opus 4.8 (planejar com `mcgonagall-planner` antes de cada item) | alto |

**Ordem recomendada:** 0 → A → B → D → C → E. (D antes de C porque estabilidade visível vale mais que peso, e C exige B estável.)

---

## Nota — skills globais de growth/conteúdo (2026-07-02)
Foram instaladas **globalmente** em `~/.claude/skills/` (fora do repo) skills de dev-tooling para o back-office de conteúdo/growth: `last30days` (trend research) + conjunto de marketing curado (`product-marketing`, `copywriting`, `cro`, `launch`, `seo-audit`, `social`, `community-marketing`), empunhadas pelo agente **Fred e Jorge** (`weasley-growth`). **Não são deps de runtime do produto** — não entram no `package.json`/build/boot e **não devem ser confundidas com o peso herdado do Postiz** nem podadas por engano.

Avaliadas e **rejeitadas** por contradizer a leveza: **GrapeRoot/Codex-CLI-Compact** e **Understand-Anything** (servidor MCP + Python+Node + knowledge-graph por projeto, portas 8080-8099 — peso incompatível com o laptop 8GB e o Griphook) e **caveman** (comprime a saída ao usuário em fala telegráfica; o RTK já corta token de comando). Reavaliar GrapeRoot **só** se o repo crescer a ponto de o contexto nativo não dar conta.
