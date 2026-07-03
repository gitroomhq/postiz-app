# Checkpoint — Retomada Fase 2 (portal) + Fase 3.5 (coerência visual)

**Escrito:** 2026-07-03, fim de sessão longa (integração AT-2, fixes críticos de RBAC/registro, remoção Farcaster/Nostr, adormecimento Mastra, sweep de roxo Postiz). Ver `docs/atelie/plano-atelie-virtual.md` e `docs/auditoria/plano-leveza-2026-07.md` para o histórico completo dessa sessão.

## Atualização 2026-07-03 (sessão seguinte) — Frente A FECHADA, Frente B substancialmente concluída

**Frente A resolvida** — o gap real era um bug concreto, não falta de conexão: `listItemsByProject`
(`libraries/nestjs-libraries/src/database/prisma/crm/content.repository.ts`) só retornava itens
`PENDING_APPROVAL`/`ADJUSTMENT_REQUESTED`, então o item **sumia da tela do cliente assim que ele
aprovava** (em vez de mover pra "Outros itens", como o componente já esperava). Corrigido pra
`notIn: ['DRAFT', 'ARCHIVED']`. Validado ponta a ponta de verdade no browser (login real, gerar
link, aprovar, item reaparece em "Outros itens" com "Aprovado ✓"). Commit `d02325e7`.

**Frente B**: paleta antiga hardcoded (`#cf6295`/`#7360aa`/`#e89a7b`/`#2897bf`/`#7b6cf6`) sincronizada
com os tokens `--voc-rose/violet/peach/blue/ink` (`vocaccio-tokens.scss`) no portal e no Volatis
(Konva mantém hex literal onde não lê CSS custom properties). `Toggle`/`Accordion`/`Panel` não
foram criados — nenhum consumidor concreto pediu ainda.

**Achado fora do escopo original, corrigido**: domínio placeholder `@vocaccio.com.br` (errado —
domínio real é `vocacc.io`) tinha voltado a aparecer no `seed.ts` e em docs de planejamento
(`PLANO-MESTRE.md`, `specs/shared/auth-rbac.md`, checkpoints de Fase 1/3) mesmo depois de uma
varredura anterior. Corrigido pra `admin@vocacc.io` (senha provisória de dev local, ver seed.ts —
trocar antes de prod). Commit `422336ce`.

**Ambiente**: rodar boot real num worktree exige copiar `.env` de `C:\dev\vocaccio\.env` (worktrees
não herdam) e rodar `pnpm install` local (store compartilhado, é rápido). Servidores de dev
(backend:3000, frontend:4200) ficaram rodando ao fim da sessão pra inspeção manual do Felipe.

**Ainda não testado nesta sessão**: fluxo "Solicitar ajuste" e "Comentar" no portal (só "Aprovar"
foi validado ponta a ponta) — mesma rota de código (`ContentService`), risco baixo, mas não
confirmado.

## Duas frentes combinadas pra próxima sessão

### A — Fechar Fase 2 (rota `/portal/[token]` → na verdade `/aprovar/[token]`)

**⚠️ Antes de assumir que precisa construir do zero:** checagem rápida no fim da sessão anterior encontrou que a rota **já existe e parece conectada**:
- `apps/frontend/src/app/(app)/(preview)/aprovar/[token]/page.tsx` — existe, renderiza `PortalApprovalPage`.
- `apps/frontend/src/components/portal/portal-approval.component.tsx` — 344 linhas, usa `fetch` nativo pro backend, sem `TODO`/stub aparente.
- `content-kanban.component.tsx:157-159` — botão "Gerar link" já monta `${base}/aprovar/${token}` e chama `generatePortalLink()` do backend (`content.service.ts:55`).

**Primeiro passo real:** validar no browser (login real + projeto real) se o fluxo funciona ponta a ponta — gerar link, abrir em aba anônima, aprovar/rejeitar item. Só depois de achar o gap real (se houver) decidir o que falta. Pode ser que o "buraco" seja mais sutil (ex.: erro num caso específico, ou falta de coerência visual com a Fase 3.5 — ver frente B) do que "rota desconectada".

### B — Continuar Fase 3.5 (coerência visual)

**Já feito** (sessão anterior, commit `ff806f66` em diante):
- 5 primitivos em `apps/frontend/src/components/ui/`: `Button`, `Card`, `Badge`, `Input`, `Select`.
- CRM (`hub/crm/*`) inteiro refatorado pra usar os primitivos.
- Roxo Postiz (`#612bd3`/`#d82d7e`/`#fc69ff` + variações de hover) removido do repo inteiro — zero hex hardcoded restante, tudo via `var(--new-*)` que aponta pros tokens `--voc-*`.

**Pendente:**
1. **Auditar Volatis** (`apps/frontend/src/components/volatis/*`) — ainda não passou pelos primitivos novos nem foi confirmado 100% livre de roxo Postiz (o sweep anterior foi em `apps/frontend/src` mas focou nos arquivos com hex conhecido; Volatis usa Konva/canvas, pode ter cores hardcoded em lugares diferentes — canvas draws, não className).
2. **Auditar telas de portal** — o próprio `portal-approval.component.tsx` (frente A) é candidato a usar os primitivos novos também.
3. **Criar `Toggle`/`Accordion`/`Panel`** — só quando houver um consumidor real pedindo (não criar especulativamente).
4. **Verificação visual pixel-a-pixel no browser** — nenhuma sessão até agora conseguiu (limitação de rede do sandbox impede o browser de preview alcançar o banco real). Se esta sessão também não conseguir, documentar e pedir pro Felipe conferir manualmente — não insistir indefinidamente na mesma abordagem.

**Por que combinar A+B:** a AT-3 (aba pública do Ateliê Virtual pro cliente contratar) está em espera até a Fase 3.5 estabilizar — não faz sentido fechar o portal (frente A) com estilo velho e ter que refatorar nas próximas semanas.

## Ordem sugerida
1. Boot real (`dev.bat` ou `pnpm run dev-backend`), login com conta real.
2. Testar o fluxo do portal ponta a ponta (frente A) — achar o gap real, se houver.
3. Se o gap for pequeno (ajuste pontual), fechar ali mesmo.
4. Seguir pra auditoria do Volatis + portal nos primitivos (frente B).
5. `Toggle`/`Accordion`/`Panel` só se algum componente concreto pedir.
6. Rodar `moody-revisor` no diff antes de cada commit (convenção do time).

## Pendências conhecidas de fora do escopo (não mexer sem pedido)
- `addUserToOrg()` (convite de usuário existente) tem o mesmo bug de RBAC corrigido no registro (`vocaccioRole` ausente) — decisão de produto pendente sobre role default de convite.
- `createMaxUser()` (fluxo white-label) mesmo bug, não investigado a fundo.
- Endpoint MCP público do Mastra — adormecido, decisão de reativar é do Felipe.
- `docs/whatsapp_integration_plan.md` — estudo exploratório de outra sessão paralela, não relacionado.
