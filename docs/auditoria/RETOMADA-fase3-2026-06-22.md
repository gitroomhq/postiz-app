# Prompt de retomada — Fase 3 da auditoria (Vocaccio)

**Atualizado em 2026-06-25 — ver seção "Sessão 2026-06-25" abaixo para o estado mais recente.
A seção original de 2026-06-22 (logo após) ficou parcialmente obsoleta: VOC-39 já foi
concluído nessa mesma sessão de 22/06, antes da troca de conta.**

Cole isto num novo chat (possivelmente em OUTRA CONTA — ver migração no fim) para continuar.

---

Sou o Dumbledore (orquestrador) do Vocaccio. Repo principal: `C:\dev\vocaccio`, branch
`fix/voc-idor-project-content` (existe no worktree principal E provavelmente ainda no
worktree `.claude/worktrees/festive-chaum-40ee7d` desta sessão — confirmar com `git branch`
em ambos antes de continuar, pode ter sido mergeado/abandonado).

**NUNCA dar push, NUNCA force/reset.** Branch tem 8+ commits acumulados, nenhum pushado.

## Antes de tudo, ler nesta ordem:
1. Esta memória: `project-auditoria-2026-06` (histórico completo Fase 1/2/3).
2. `docs/auditoria/audit-2026-06-20.md` (relatório completo, 48 achados VOC-01..48).
3. `project-agentes-dev-hp` — time de agentes em `.claude/agents/`: `snape-backend`
   (= Sirius, o rename pra "sirius-backend" não propagou em todos os worktrees — **sempre
   checar o nome real disponível com a lista de agentes antes de chamar**),
   `flitwick-frontend`, `mcgonagall-planner`, `moody-revisor`, `severus-security` (pode não
   estar registrado em alguns worktrees), `griphook-economy`.
4. `feedback-model-recommendation` — regra: SEMPRE sugerir modelo+esforço em tópicos
   separados por tarefa, reforçando com o Dumbledore E com o agente específico.

## Estado ao final desta sessão (2026-06-22, troca de conta da PlanGroup):

**✅ CONCLUÍDO E COMMITADO (branch fix/voc-idor-project-content, sem push):**
- Baseline do WIP Religare/Volatis (5 commits temáticos): `eafcf553` deps, `fa1771ff`
  religare, `209221ec` volatis, `abb72ee9` fix(security) XSS, `8b49700c` chore(ui) branding.
- VOC-29 (migrations baseline + Mastra isolado em schema `mastra` dedicado).
- `c0ade2c0` chore(repo): limpeza de 50 artefatos compilados + .gitignore (undefined/,
  dev.bat, actus-kit do Nicolas).
- VOC-39 (`3ada6ff6`): SSRF guard no webhookUrl do `/enterprise`.
- **VOC-43: PLANEJADO mas NÃO IMPLEMENTADO.** McGonagall (Opus) entregou plano completo de
  idempotência de posting (ver seção "Plano VOC-43" abaixo — copiado na íntegra, não está
  em arquivo separado, só nesta memória/prompt). Próximo passo: delegar a implementação ao
  Sirius/snape-backend em **Opus**, seguindo o plano passo a passo.

**⏳ PENDENTE — não iniciado:**
- VOC-07: trocar `makeId(6/7)` (Math.random, não-criptográfico) por gerador seguro só nos
  ~26 call-sites de `state` OAuth em `libraries/nestjs-libraries/src/integrations/social/*.provider.ts`.
  NÃO tocar `makeId` em si (109 outros usos no repo). Modelo: Sirius/snape-backend, Sonnet
  4.6, esforço médio. Gate: Moody, Haiku.
  **ATUALIZAÇÃO:** já existe `makeSecureState()` em `libraries/nestjs-libraries/src/services/make.is.ts`
  (commit `2778f824`, `randomBytes(32).toString('hex')`) — **NÃO TESTADO, NÃO REVISADO, NÃO
  INTEGRADO** nos 26 providers ainda. Origem incerta (achado solto no working tree ao
  retomar a sessão, comitado como WIP só para não perder). Sirius deve revisar essa função
  antes de usar e então fazer a troca nos 26 call-sites.
- Smoke-test do chat de agentes (Mastra) — Felipe precisa subir o backend e confirmar que o
  chat funciona com o schema `mastra` novo (mudança feita no VOC-29).
- Limpeza de leftovers gitignorados (intactos, fora do git): `apps/backend/undefined/` já
  foi deletado; `dev.bat` e material do Actus/Nicolas ficam no disco, fora do escopo.

## ⚠️ IMPORTANTE sobre Religare

As features do módulo Religare (schema Expert/ReligareProfile/ClientExpert, controller,
libs) foram commitadas como **baseline WIP** — só para dar versão-git e desbloquear os
fixes de segurança (VOC-20/26/27/14). **A funcionalidade em si NÃO foi testada/integrada**
— é trabalho de produto separado, de sessão anterior à da auditoria, e continua pendente de
validação por Felipe. Não confundir "commitado" com "pronto para uso".

## Plano VOC-43 (entregue pela McGonagall, Opus, nesta sessão) — resumo executável

**Diagnóstico:** `post.activity.ts:207-269` (`postSocial`) chama `getIntegration.post()` (post
real no canal social) e só depois retorna pro workflow gravar via `updatePost` (L196-200 do
`post.workflow.v1.0.5.ts`). Com retry do Temporal (`maximumAttempts:3`) + loop manual
`iterate` (5x), crash entre o post real e a gravação = post duplicado no canal do cliente.

**Mecanismo proposto:**
1. Migração Prisma ADITIVA: `Post.postingClaimedAt DateTime?` (nullable, sem enum novo —
   evita migração de enum arriscada).
2. Repository: `claimPosting(id)` = `updateMany({ where: { id, postingClaimedAt: null },
   data: { postingClaimedAt: new Date() }})`, retorna count 0/1. `releasePostingClaim(id)`
   reseta pra null. `updatePost` ganha `WHERE state != 'PUBLISHED'`.
3. Activity `postSocial`: no início, se post já tem `releaseId`/`PUBLISHED` → retorna
   resultado existente (curto-circuito, sem repostar). Senão chama `claimPosting`; se
   count=0 e sem releaseId → `ApplicationFailure.nonRetryable` (estado ambíguo, prefere não
   postar a duplicar). Se count=1 → segue pro post real.
4. Workflow V105: no catch de `refresh_token` (L221-237), chamar `releasePostingClaim`
   antes do `continue` (senão a retentativa legítima trava no claim).
5. Mover/envolver `streakWorkflow.start` (L253-266, entre post e return) em try/catch
   best-effort dentro da activity — hoje pode forçar retry mesmo com post já feito.
6. Feature flag: env global `IDEMPOTENT_POSTING=true` (sem tabela nova — sem usuários reais
   ainda, não precisa granularidade por org). Flag OFF = comportamento atual idêntico.
7. Job de limpeza: zerar `postingClaimedAt` órfão (claim sem releaseId há muitas horas).
8. NÃO criar `post.workflow.v1.0.6.ts` — fix é só na activity/DB, transparente pro
   determinismo do Temporal. V101-V104 ficam intocadas (código morto vivo, só por
   segurança de replay de runs antigos). Confirmar com Felipe que não há run `post_*` em
   andamento antes do deploy.
9. Testar em staging: post normal; crash simulado pós-post (sem duplicar); timeout
   simulado; refresh de token (postar 1x só); flag OFF = comportamento idêntico; comments
   (`postComment`, i>0 — avaliar se precisa do mesmo tratamento).

**Modelo para implementar:** Sirius/snape-backend, **Opus 4.8**, esforço alto (core engine,
concorrência, Temporal). Gate: Moody (Haiku) focado no caminho de erro/reset do claim.

## Migração de conta (instruções do Felipe, preservar literalmente)

> Quando for migrar de conta, o processo é simples:
> 1. Logar com a conta nova no mesmo Windows (ou copiar `C:\Users\felip\.claude\` inteiro
>    para a máquina/perfil novo).
> 2. Clonar `vocaccio-ecosystem` do GitHub (já está lá).
> 3. Restaurar o zip mais recente do OneDrive em
>    `C:\Users\felip\.claude\projects\C--dev-vocaccio\memory\` se a pasta de memória não
>    vier junto.
> 4. Continuar — o app vai ler `PLANO-MESTRE.md` + memória + agentes normalmente, nenhum
>    "aprendizado" se perde porque nada essencial estava amarrado ao login da PlanGroup, só
>    a autenticação em si.

**✅ CONFIRMADO (Felipe, 2026-06-22): a MÁQUINA continua a mesma**, só o usuário/login do
Claude vai trocar. Isso significa que o branch `fix/voc-idor-project-content` com os 12
commits de hoje **já está fisicamente seguro** em `C:\dev\vocaccio\.git` — não depende do
login do Claude, não precisa de push nem cópia. Ao abrir o novo usuário, **basta apontar pro
mesmo `C:\dev\vocaccio`** (ou ao worktree `.claude/worktrees/festive-chaum-40ee7d` se ainda
existir) e os commits estarão todos lá. Push pro GitHub NÃO foi feito (e não é necessário
neste cenário) — branch segue só local, como manda a regra do projeto.

## Próximo passo sugerido (seção original de 22/06 — ver atualização abaixo)

1. Confirmar se o branch `fix/voc-idor-project-content` (com os commits de hoje) ainda
   existe no ambiente novo. Se não existir, refazer a partir desta memória — o trabalho já
   está todo desenhado, só falta re-executar.
2. Implementar VOC-43 com Sirius/snape-backend em Opus, usando o plano acima.
3. Implementar VOC-07 com Sirius/snape-backend em Sonnet (mais simples, pode vir antes ou
   depois do VOC-43).
4. Felipe testa o chat (Mastra) quando tiver tempo.

---

## Sessão 2026-06-25 — atualização (não houve troca de conta desta vez; sessão longa)

**VOC-39 confirmado CONCLUÍDO** (já estava — commit `3ada6ff6`, da sessão de 22/06, antes da
troca de conta). Não confundir com pendente.

**Branch `fix/voc-idor-project-content` no mesmo worktree** (`.claude/worktrees/festive-chaum-40ee7d`),
agora com **21 commits** desde o início da sessão de 22/06 (de `fa1771ff` até `61038479`),
**sem push**, `git status` limpo.

### Trabalho de segurança/infra desta sessão
- VOC-39, VOC-29, baseline Religare/Volatis, limpeza de compilados — tudo da sessão de 22/06,
  recapitulado acima, sem mudanças.
- **VOC-43 continua só PLANEJADO** (plano completo acima, McGonagall/Opus) — **não implementado**.
- **VOC-07 continua não-iniciado**, mas há um achado solto: `makeSecureState()` em
  `libraries/nestjs-libraries/src/services/make.is.ts` (commit `2778f824`, `randomBytes(32)`)
  — gerador criptográfico pronto, **NÃO testado/revisado/integrado** nos ~26 providers ainda.
  Sirius deve revisar antes de usar.

### Trabalho fora do escopo de segurança (pedido direto do Felipe)
1. **Conta admin migrada**: `admin@vocaccio.com.br` (placeholder, nunca usado de fato) →
   renomeada para **`felipe@vocacc.io`** (e-mail oficial real), `isSuperAdmin=true` ativado.
   Org `Vocaccio | Soul 2 Soul` preservada (11 clients + 1 expert Religare seed).
   `felipeweb7@gmail.com` fica reservado pra simular usuário standard, se quiser, no futuro.
2. **`isSuperAdmin` ignora QUALQUER limite de plano** (commit `e7629eb1`): bypass aditivo em
   `permissions.guard.ts` (cobre posts/canais/webhooks/vídeos via `@CheckPolicies`) e
   `religare.service.ts` (limite de perfis Religare). Flag sempre lida do `User` resolvido
   no banco — sem vetor de self-promotion (confirmado por gate).
3. **Bug real corrigido — loop infinito de restart do backend** (`4423d702`): `tsconfig.tsbuildinfo`
   ficava fora do `outDir`, watcher via reescrita do cache como "mudança de código" e
   reiniciava infinitamente. Fix: `tsBuildInfoFile` movido pra dentro de `./dist/`.
4. **Bug real corrigido — reset de senha mentia sucesso** (`d9163bda`): `forgot-return.tsx`
   mostrava "redefinição bem-sucedida" mesmo quando o backend falhava (token expirado etc.),
   porque `setState(true)` rodava antes de checar o resultado. Corrigido.
5. **Achado não-corrigido (baixa prioridade)**: ao gerar tokens de reset manualmente (sem
   SMTP configurado), usar horário local em vez de UTC fazia o token "expirar" na hora
   (backend interpreta `expires` como UTC). Não afeta o fluxo real por e-mail (mesmo
   processo gera e valida). Mitigação: gerar com `dayjs.utc()`. Item futuro de robustez:
   trocar formato naive por ISO 8601 com `Z` explícito em `auth.service.ts`.
6. **Logo da tela de login corrigido em 2 etapas**: primeiro unificou o gradiente (`b9679b1e`),
   depois trocou pelo wordmark oficial `vocaccio-wordmark.png` otimizado via `sharp`
   (44.693→3.648 bytes, raster mantido, sem texto duplicado) (`44f5a2e6`).
7. **`PLANO-MESTRE.md` ganhou 3 seções novas**: Área de Perfil do Usuário (`ab226bdd`, depois
   corrigida em `649cf8dd` — não existe backend de troca de senha autenticada, só o fluxo de
   e-mail não-autenticado), Kin do dia no calendário `/launches` pós-Tzolkin (`ae218c0e`),
   e feedback ao vivo sobre `/settings` estar cru (labels em inglês, sem separação conta/ferramenta).
8. **Comando `/new-chat` criado** (`61038479`, `.claude/commands/new-chat.md`) — formaliza
   `feedback-rotina-novo-chat` da memória como skill disparável. Neste app aparece como Skill,
   não slash command nativo (esperado, não é erro).

### ⏳ Pendente real ao retomar
- **Felipe precisa smoke-testar o chat de agentes (Mastra)** — ainda não confirmado desde o
  VOC-29 (schema `mastra` dedicado).
- **Felipe precisa confirmar visualmente** o novo logo do login (`/auth/login`) — não
  verificado em browser nesta sessão (ferramenta de browser instável/desconectando).
- **VOC-43**: implementar com Sirius/snape-backend, **Opus 4.8**, esforço alto, usando o
  plano já pronto acima nesta retomada.
- **VOC-07**: revisar `makeSecureState()` (commit `2778f824`) e então trocar os ~26
  call-sites de `makeId(6/7)` para OAuth `state`, com Sirius/snape-backend, **Sonnet 4.6**,
  esforço médio.
- **Área de Perfil do Usuário**: ainda não implementada (só planejada) — backend de troca
  de senha autenticada (Sirius, Sonnet, esforço baixo) + UI completa (Flitwick, Sonnet,
  esforço médio), quando Felipe decidir a fase.

### Próximo passo sugerido (atualizado)
Como VOC-39 já está concluído, o próximo item real de segurança é **VOC-43** (idempotência
de posting, plano pronto) ou **VOC-07** (mais rápido/barato) — a escolha entre os dois é do
Felipe. Antes disso, vale ele confirmar visualmente o logo e testar o chat Mastra (rápido,
não-bloqueante para o resto).

---

## Sessão 2026-06-25 (parte 2) — VOC-07 e VOC-43 CONCLUÍDOS, auditoria essencialmente esgotada

Felipe escolheu seguir primeiro **VOC-07**, depois **VOC-43**. Ambos concluídos nesta sessão,
no repo PRINCIPAL `C:\dev\vocaccio` (branch `fix/voc-idor-project-content`, **sem push**,
working tree limpo).

**✅ VOC-07** — commit `3bb2995b`. `makeId()` (Math.random) → `makeSecureState()`
(`crypto.randomBytes(32)`) no parâmetro `state` OAuth de 32 providers sociais
(`libraries/nestjs-libraries/src/integrations/social/*.provider.ts`). `codeVerifier`/
`postId`/`nonce` intocados (fora de escopo, continuam em `makeId`). Gate moody-revisor
(Haiku) = sem problemas.

**✅ VOC-43** — commits `fa6d8176` (migration+schema) + `b0a66078` (código). Idempotência de
posting implementada conforme o plano da McGonagall (ver seção "Plano VOC-43" acima),
atrás da feature flag `IDEMPOTENT_POSTING` (OFF/ausente = comportamento original idêntico).
Mecanismo: coluna nullable `Post.postingClaimedAt` + `claimPosting`/`releasePostingClaim`/
`releaseStaleClaims` no `PostsRepository`; curto-circuito por `releaseId` (tratando o
sentinela `'missing'` corretamente) na activity `postSocial`; `ApplicationFailure
.nonRetryable('posting_claim_conflict')` quando o claim falha sem releaseId; release do claim
no catch de `refresh_token` do workflow V105 (incondicional — flag só lida na activity,
determinismo do Temporal preservado); `streakWorkflow.start` em try/catch best-effort; job de
limpeza `releaseStaleClaims(120)` wired no loop horário do `missingPostWorkflow`.
- Gate moody-revisor (Haiku) = **7/7 checks críticos passaram** sem bloqueante.
- Typecheck do orchestrator = só os 5 erros pré-existentes do baseline, zero novo.
- **Migration ✅ APLICADA no Supabase** via `prisma migrate deploy` (autorizado por Felipe,
  pré-checagem confirmou ausência de coluna/índice e tabela `Post` vazia — zero risco de
  sobreposição ou perda de dado). Verificado pós-aplicação: coluna + índice criados,
  `_prisma_migrations` = [`0_init`, `20260625_voc43_posting_claimed_at`].

**⚠️ Armadilha de ambiente encontrada e documentada (ver também `project-auditoria-2026-06`):**
um sub-agente (Agent tool) lançado durante esta sessão foi executado com o working directory
fixado no worktree da SESSÃO (`.claude/worktrees/upbeat-ritchie-35fe93`, branch de Fase 3 não
relacionada), não no repo principal — implementou VOC-43 corretamente mas commitou na branch
errada. Corrigido com `git cherry-pick -x` dos 2 commits pro repo principal + `git reset
--hard` na branch errada de volta à base + regeneração do client Prisma no repo certo (o
sub-agente tinha gerado o client no worktree errado, mascarando erros de typecheck de
CRM/Religare). **Lição para o futuro: ao delegar a um sub-agente, confirmar em qual diretório
ele está operando antes de aceitar o relatório de "commitado com sucesso" como definitivo.**

**Pendente de operação (Felipe, não-bloqueante, sem código):**
1. Smoke-test em staging com `IDEMPOTENT_POSTING=true` (post normal; crash pós-post sem
   duplicar; timeout; refresh de token postando 1x; flag OFF idêntico; avaliar `postComment`).
2. Reiniciar o workflow singleton `missing-post-workflow` no próximo deploy (mudou a sequência
   de comandos — precisa de replay limpo). Seguro em teste interno (sem dados reais ainda).
3. Confirmar visualmente o logo novo do login (`/auth/login`) — segue pendente desde sessão
   de 22/06, não verificado em browser por instabilidade da ferramenta.
4. Smoke-test do chat de agentes (Mastra) — segue pendente desde o VOC-29 (schema `mastra`
   dedicado).

**Estado da auditoria como um todo:** com VOC-07/43 fechados, os itens **planejados e
desbloqueados** da auditoria de 48 achados estão essencialmente esgotados. Restam só:
VOC-20/26/27 (bloqueados — features WIP nunca commitadas: carousel-engine, Religare
geocode/hook/profiles; revisitar se/quando Felipe comitar esse WIP) e VOC-14 (pulado por
decisão do Felipe; reavaliar se ainda faz sentido agora que VOC-29 já deu baseline de
migrations). Nenhum item crítico/alto-risco em aberto.

**🔀 PIVÔ DE FOCO ao final desta sessão (2026-06-25):** Felipe vai abrir um novo chat para
um **checkpoint de produto/negócio**, não mais auditoria de segurança. Ele vai trazer: (1)
atualizações de planejamento e definições de negócio, (2) o conceito novo de **back-office e
front-office** (ainda não definido neste repo — provavelmente uma reorganização de como
diferentes perfis de usuário acessam o sistema; precisa ser definido do zero na próxima
sessão, não inferir), (3) uma nova referência de design, e (4) pedido de um panorama visual
de progresso/pendências do projeto como um todo. Este arquivo de retomada permanece válido
para qualquer trabalho futuro de segurança, mas a sessão seguinte é sobre arquitetura de
produto — ver `project-vocaccio` (PLANO-MESTRE.md) como ponto de partida, não esta auditoria.
