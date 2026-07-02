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
| Onda | Candidatos | Condição |
|---|---|---|
| C1 | `@copilotkit/*`, `mastra`, `@mastra/*`, `@langchain/*`, `@ag-ui/mastra`, `openai`? | rotas `agents` quarentenadas (B1/B2) e nenhum import restante. `openai` só se nada mais usar |
| C2 | `polotno` (+ `polonto.css`), `@uppy/transloadit`, `transloadit` | confirmar que o editor Konva próprio cobre tudo e storage não usa Transloadit |
| C3 | Web3/nicho: `@solana/*`, `viem`, `bs58`, `tweetnacl`, `nostr-tools`, `@neynar/*`, `@postiz/wallets` | **apenas se** os providers web3/Farcaster/Nostr/Telegram estiverem fora da lista B3 — senão adiar p/ v2.0 |
| C4 | Pinar o que sobrar de IA/volátil (VOC-41) | manifest + lockfile |

**Ganhos esperados:** install e cold-start mais rápidos, menos RAM no dev, superfície supply-chain menor, `pnpm-lock` mais estável.
**Modelo:** Sonnet médio; greps preparatórios com Haiku. **Reversão:** revert do commit da onda (lockfile volta junto).

## Fase D — Estabilidade barata *(esforço: leve · itens já mapeados na auditoria — executar, não re-analisar)*
- **VOC-45/46:** ✅ **FEITO 2026-07-02.** `AutopostActivity.autoPost` reporta pro Sentry antes de re-lançar; workflow loga via `log.error` (determinístico, `@temporalio/workflow`) em vez de engolir o erro; `backoffCoefficient: 1→2` no autopost e no `post.workflow.v1.0.5.ts` ativo (v1.0.1-v1.0.4 propositalmente não tocados — frozen p/ workflows em voo).
- **VOC-34:** ✅ **FEITO.** `@@index([projectId, status, position])` em `ContentItem` + migration manual `20260702_voc34_contentitem_kanban_index` (worktree sem DB pra rodar `prisma migrate dev`; SQL escrito seguindo a convenção de nome do Prisma — conferir ao aplicar).
- **VOC-11/12/27:** VOC-11/12 (listExperts/kanban) já vieram prontos da Fase 0 (branch de segurança mergeada). VOC-27 ✅ **FEITO**: `use-religare-profiles.hook.ts` agora pagina internamente até completar `total`.
- **VOC-38/22/21:** ✅ **FEITO.** `chart.tsx`/`chart-social.tsx` com `import type` + dynamic import de `chart.js/auto` dentro do `useEffect`; `religare-pdf-export.ts` carregado sob demanda no clique (não mudei o módulo em si, só o import no componente consumidor); `layoutRuns` em `useMemo` (cuidado: movido pra ANTES do early-return existente, senão quebra rules-of-hooks); upload de slides em `Promise.all`.
- **VOC-20:** ✅ **FEITO (versão leve).** `captureAll()` agora cede a thread (`await setTimeout 0`) entre cada slide capturado; `dataUrlToBytes` trocou o loop manual por `Uint8Array.from`. **Não fiz** a versão completa (Worker/OffscreenCanvas + barra de progresso) — fica pro v2.0 se o ganho de UX justificar.
- **Achado do Moody (não é regressão, é pré-existente):** `exportZip`/`exportPdf` já eram `async` antes desta fase e o menu (`PublishExportMenu` em `carousel-editor.component.tsx`) já fazia fire-and-forget (`run()` fecha o menu sem aguardar a Promise, sem loading state). Comportamento inalterado por esta fase — mas vale um item futuro: `onZip`/`onPdf` tipados `() => Promise<void>` + spinner no menu enquanto exporta.

**Modelo:** Sonnet baixo/médio; Haiku nos triviais.

## Fase E — Desengessar convenções e time (DX) *(esforço: leve)*
- Atualizar `CLAUDE.md` do projeto: remover instruções obsoletas do Postiz, registrar o mapa de quarentena e o princípio "grep→build→boot" (este doc como fonte).
- Agentes: `snape-backend` e `moody-revisor` ganham a regra "não reintroduzir import de dependência podada / módulo quarentenado"; `flitwick-frontend` ganha a lista de rotas quarentenadas.
- Scripts `voc:*` documentados no README interno.

**Modelo:** Haiku.

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
