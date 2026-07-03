# Checkpoint — Retomada Fase 2 (portal) + Fase 3.5 (coerência visual)

**Escrito:** 2026-07-03, fim de sessão longa (integração AT-2, fixes críticos de RBAC/registro, remoção Farcaster/Nostr, adormecimento Mastra, sweep de roxo Postiz). Ver `docs/atelie/plano-atelie-virtual.md` e `docs/auditoria/plano-leveza-2026-07.md` para o histórico completo dessa sessão.

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
