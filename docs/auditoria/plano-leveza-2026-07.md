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
| A3 | `NODE_OPTIONS=--max-old-space-size=4096` no tsc/CI | corrige o "sai 0 falsamente" (gotcha da auditoria) |
| A4 | Alinhar `volta.node` ↔ `engines` (VOC-40); placeholder óbvio no `.env.example` (VOC-42); apagar `apps/backend/undefined/` | higiene |

**Modelo:** Haiku. **Reversão:** revert de config.

## Fase B — Quarentena de módulos Postiz não usados *(esforço: leve · risco: baixo)*
Desligar por configuração, **sem deletar código**:
| # | Tarefa | Como |
|---|---|---|
| B1 | ✅ **FEITO 2026-07-02.** Ocultar rotas `agents`, `plugs`, `third-party` do menu | `top.menu.tsx`: flag `NEXT_PUBLIC_VOC_LEGACY_MODULES` (default oculto), reaproveitando o campo `hide` que o filtro do menu já suportava. Reversível via env, sem tocar código de rota. |
| B2 | Registrar condicionalmente no NestJS os controllers correspondentes (`copilot`, `third-party`, `signature`?) | módulo condicional por env; **boot real obrigatório** após — **adiado**: este worktree não tem `node_modules`/DB para validar boot (só o checkout principal `C:\dev\vocaccio` roda dev server real). Fazer na próxima sessão a partir de lá. |
| B3 | Inventário de providers sociais implementados (36, `libraries/nestjs-libraries/src/integrations/social/`) — falta cruzar com uso real em produção | Rodar em prod (não neste worktree): `SELECT provider, count(*) FROM "Integration" WHERE "deletedAt" IS NULL GROUP BY provider ORDER BY 2 DESC;` → definir `VOC_ENABLED_PROVIDERS`. Poda de providers é v2.0. |
| B4 | Billing **fica** (decisão P-04 da Edwiges: tiers Postiz = verdade) | não tocar |

**Modelo:** Sonnet médio (B2 exige cuidado com injeção de dependências do Nest). **Verificação:** boot + login + agendar post + CRM + Religare + Volatis. **Reversão:** flag de volta.

## Fase C — Poda de dependências em ondas *(esforço: moderado · risco: médio-controlado · maior ganho de peso)*
Só após Fase B estável. Uma onda por sessão, commit isolado, seguindo o princípio 2.

**⚠️ Auditoria grep-verificada 2026-07-02 (Sonnet, sem execução — ver "restrição de ambiente"
abaixo): a suposição original de C1 estava ERRADA.** Não editei `package.json`/`pnpm-lock.yaml`.

| Onda | Candidatos originais | Veredito real (grep exaustivo em `apps/*` + `libraries/*`) |
|---|---|---|
| C1 | `@copilotkit/*`, `mastra`, `@mastra/*`, `@langchain/*`, `@ag-ui/mastra`, `openai` | **NÃO seguro remover a maioria.** `@copilotkit/react-core`/`react-textarea` estão no **editor de posts principal** (`new-launch/editor.tsx` via `useCopilotAction`/`useCopilotReadable`) e no **autopost** (`CopilotTextarea`) — features ativas, não confinadas a `/agents`. `@langchain/*` (langgraph/core/openai) alimenta a **geração de conteúdo por IA do autopost** (`autopost.service.ts` — o mesmo arquivo mexido na Fase D/VOC-45). `openai` (pacote) é usado em `openai.service.ts`, consumido por `posts.service.ts`, `media.service.ts`, vídeos e Heygen — **core, não remover**. **Realmente confinados** à feature quarentenada: `mastra`/`@mastra/*` (só em `libraries/nestjs-libraries/src/chat/*` + `copilot.controller.ts`) e `@ag-ui/mastra` (só em `copilot.controller.ts`) — mas só ficam seguros de remover **depois** da Fase B2 (quarentenar/deletar o `copilot.controller.ts` e o módulo `chat/` no backend, com boot real). **Achado extra:** `apps/backend/src/services/auth/auth.middleware.ts:9` importa `MastraService` e nunca usa — import morto num arquivo de segurança sensível; não toquei (exige boot real pra validar), registrar pra limpeza pontual futura. |
| C2 | `polotno` (+ `polonto.css`), `@uppy/transloadit`, `transloadit` | **`polotno`/`Polonto` está em uso na Media Library** (`media.component.tsx`, dynamic import — edição de imagem inline), rota **não quarentenada**. Remover exige decisão de produto: essa edição inline é redundante com o editor Konva do Volatis, ou é uma feature própria que os usuários usam? **Não é call de engenharia, é call do Felipe.** `@uppy/transloadit`/`transloadit` usados em `images.slides.ts` (vídeo) e `uppy.upload.ts` (helper compartilhado de upload) — infra genérica, não confinada; confirmar se o storage provider ativo em produção realmente usa Transloadit antes de tocar. |
| C3 | Web3/nicho: `@solana/*`, `viem`, `bs58`, `tweetnacl`, `nostr-tools`, `@neynar/*`, `@postiz/wallets` | Confirmado: usados em auth por wallet (Solana) e providers sociais Farcaster/Nostr — não confinados a rota quarentenada. **Só um `SELECT provider, count(*) FROM "Integration"...` em produção (B3) resolve** se algum tenant usa esses canais. Sem essa query, C3 fica **adiado pra v2.0** como já previsto. |
| C4 | Pinar o que sobrar de IA/volátil (VOC-41) | Não aplicável ainda — nada de C1-C3 foi removido nesta rodada. |

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
