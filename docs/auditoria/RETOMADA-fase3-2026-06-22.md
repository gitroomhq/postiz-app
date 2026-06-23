# Prompt de retomada — Fase 3 da auditoria (Vocaccio)

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

**Atenção:** o branch `fix/voc-idor-project-content` com os 8+ commits está só no
**worktree local** (`C:\dev\vocaccio` e/ou `.claude/worktrees/festive-chaum-40ee7d`), **sem
push**. Se a conta nova clonar do GitHub puro, esses commits locais NÃO vêm junto — só a
memória persiste via OneDrive/cópia da pasta `.claude`. Antes de trocar de conta, se possível
fazer `git push` desse branch (ou copiar o `.git` local) para não perder o trabalho de
segurança feito hoje. Se não houver tempo: pelo menos esta memória + este prompt garantem
que o trabalho pode ser REFEITO rapidamente (os agentes sabem exatamente o que fazer), mas
os commits em si, se não pushados nem copiados, se perdem.

## Próximo passo sugerido ao retomar

1. Confirmar se o branch `fix/voc-idor-project-content` (com os commits de hoje) ainda
   existe no ambiente novo. Se não existir, refazer a partir desta memória — o trabalho já
   está todo desenhado, só falta re-executar.
2. Implementar VOC-43 com Sirius/snape-backend em Opus, usando o plano acima.
3. Implementar VOC-07 com Sirius/snape-backend em Sonnet (mais simples, pode vir antes ou
   depois do VOC-43).
4. Felipe testa o chat (Mastra) quando tiver tempo.
