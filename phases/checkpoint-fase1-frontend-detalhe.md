# Checkpoint — Fase 1 Frontend: Detalhe CRM /hub/crm/[id]
**Data:** 2026-06-10 | **Status: IMPLEMENTADO — aguardando teste visual**

## O que foi feito
1. `use-client.hook.ts` — SWR para `GET /hub/crm/clients/:id`
2. `client-detail.component.tsx` — visão 360 com 4 tabs
3. `app/(app)/(site)/hub/crm/[id]/page.tsx` — rota Next.js
4. `tsc --noEmit` passou: **zero erros** ✅

## Arquivos criados
| Arquivo | Papel |
|---------|-------|
| `apps/frontend/src/components/hub/crm/use-client.hook.ts` | Hook SWR individual |
| `apps/frontend/src/components/hub/crm/client-detail.component.tsx` | Componente detalhe |
| `apps/frontend/src/app/(app)/(site)/hub/crm/[id]/page.tsx` | Rota Next.js |

## Shape do backend (CLIENT_DETAIL_SELECT)
```
{ id, name, status, notes, responsibleId, createdAt, updatedAt, _count,
  projects: [{ id, name, status, businessArea, toneOfVoice, createdAt }],
  contacts: [{ id, name, role, email, phone }],
  interactions: [{ id, type, summary, userId, createdAt }] (take: 20)
}
```
Nota: `email`, `website`, `segment` não estão no `CLIENT_DETAIL_SELECT` (estão no `CLIENT_SELECT` básico). O componente lê como `(data as any).email` — considerar expandir o SELECT no backend na próxima sessão.

## Tabs implementadas
- **Projetos** — lista com status badge, businessArea, toneOfVoice, data
- **Contatos** — avatar + role + email + telefone
- **Interações** — timeline com ícone por tipo (CALL, EMAIL, MEETING, NOTE, WHATSAPP)
- **Observações** — texto livre das notes

## Como testar
```powershell
# Terminal 1
pnpm --filter ./apps/backend run dev
# Terminal 2
pnpm --filter ./apps/frontend run dev
# Acesso: http://localhost:4200/hub/crm → clicar em cliente → /hub/crm/[id]
```

## Próximas tarefas (prioridade)
1. **Testar visualmente** a tela de detalhe (backend + frontend simultaneamente)
2. **Fix backend**: adicionar `email`, `website`, `segment` ao `CLIENT_DETAIL_SELECT`
3. **Formulário novo cliente** — `/hub/crm/novo` (botão "Novo cliente" já existe na listagem)
4. **Formulário editar cliente** — edição inline ou modal no detalhe
5. **Form novo contato / nova interação** — modais dentro do detalhe
