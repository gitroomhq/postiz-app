# Prompt de retomada — Fase 2 da auditoria de segurança (Vocaccio)

Cole isto num novo chat para continuar a Fase 2.

---

Sou o Dumbledore (orquestrador) do Vocaccio. Repo principal: `C:\dev\vocaccio`, branch
`fix/voc-idor-project-content` (existe só no worktree principal, NÃO em
`.claude/worktrees/*`). NUNCA dar push, NUNCA force/reset, NUNCA tocar arquivos fora do
escopo de cada achado de segurança.

**Antes de tudo, ler:**
1. Memória `project-auditoria-2026-06` — histórico completo de Fase 1 e Fase 2, incluindo
   a armadilha de `git commit -- <path>` arrastando WIP não-relacionado (lição registrada,
   não repetir).
2. `docs/auditoria/audit-2026-06-20.md` (agora versionado no repo) — relatório completo.
3. `project-agentes-dev-hp` — time de sub-agentes em `.claude/agents/`: `sirius-backend`
   (back-end, renomeado de "Snape" em 2026-06-22), `flitwick-frontend`, `mcgonagall-planner`,
   `moody-revisor`, `severus-security`, `griphook-economy`. Todos já comitados.

**Estado da Fase 2 ao final desta sessão (commits no branch, sem push):**
- ✅ VOC-24/VOC-05 (ValidationPipe escopado no CrmController) — `a58b75e4`
- ✅ VOC-11/VOC-12 (paginação/cap em listExperts e kanban) — `c46bc251`
- ✅ VOC-33 parcial (cap em mediaUrls no DTO) — `b403d3ae`
- ✅ docs/rename do time de agentes — `2f97033b`
- 🟡 **VOC-20, VOC-26, VOC-27 bloqueados**: código nunca commitado (`libraries/carousel-engine/`
  inteiro, `religare-geocode.ts`/`religare.service.ts`, `use-religare-profiles.hook.ts`) — sem
  baseline git pra isolar fix de WIP, e os recursos nem estão em produção ainda. Retomar só
  quando Felipe commitar essas features, ou se ele autorizar editar direto no WIP.
- 🟡 **VOC-14 pulado** (decisão do Felipe): sem diretório de migrations (VOC-29) e
  `schema.prisma` com WIP do Religare não-commitado — primeira `prisma migrate dev` criaria
  baseline misturando os dois. Retomar quando o schema estiver organizado.
- 🟡 **VOC-39 pausado**: aguardando confirmação do Felipe que `/enterprise`/`webhookUrl`
  está realmente sem uso ativo de parceiro antes de qualquer hardening.

**Padrão de trabalho usado nesta sessão (repetir):**
- Antes de editar qualquer arquivo do achado, `git status --porcelain <arquivo>` — se já
  estiver `M`/untracked (WIP de outra feature), ou (a) isolar via blob sintético
  (`git show HEAD:<arquivo>` → editar cópia → `git hash-object -w` → `git update-index
  --cacheinfo` → commit SEM pathspec) ou (b) se o arquivo for 100% novo/untracked sem
  baseline, tratar como bloqueado e pedir decisão.
- **Nunca usar `git commit -- <path>`** — isso re-adiciona do working tree e ignora o que
  está staged, já causou um incidente nesta sessão (corrigido com `git reset --soft HEAD~1`).
- Pipeline por achado: confirmar arquivo:linha atual → delegar a `sirius-backend` (Sonnet) →
  gates em paralelo `severus-security`+`moody-revisor` (Haiku) → typecheck com heap elevado
  (`NODE_OPTIONS=--max-old-space-size=6144`) → commit isolado, sem push.
- Parar e perguntar se: exigir migration não-aditiva, mudar comportamento visível ao usuário
  final de forma não-trivial, ou achar algo fora do escopo que pareça grave (já aconteceu 2x
  nesta sessão — sempre vale a pena confirmar antes de prosseguir).
- Atualizar `project-auditoria-2026-06` ao final de cada achado (corrigido + commit hash).

**Próximo passo sugerido:** verificar com o Felipe se VOC-20/26/27/14 desbloquearam (Religare/
Volatis committed?) e se há resposta sobre VOC-39. Se não, a Fase 2 está com todo o trabalho
não-bloqueado já feito — próxima sessão pode avaliar pular direto pra itens da Fase 3
(estruturais/migrations) que não dependam do mesmo schema em conflito, ou aguardar o Felipe.
