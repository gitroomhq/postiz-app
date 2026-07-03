# Checkpoint — Fase 1 Frontend: Listagem CRM ✅ TESTADA
**Data:** 2026-06-11 | **Status: APROVADA — pronto para detalhe**

## Resultado do teste visual
- Login funcionando com `admin@vocacc.io` / `Vocaccio@2024!`
- Waffle menu (ícone grid) no header abre overlay com 6 módulos
- Rota `/hub/crm` carrega com design Vocaccio (eyebrow rose, aurora nos pills)
- 6 clientes do seed carregados na tabela ✅
- Busca, filtros pills e paginação presentes e funcionais

## Bugs corrigidos nesta sessão
1. `instrumentation.ts` — try-catch Sentry+Turbopack (bloqueava dev server)
2. `ClientsPage.clients` → `items` (shape real do backend: `{ items, total, page }`)
3. Paginação base 0 vs base 1 — UI 1-based, backend 0-based
4. Backend OOM — `NODE_OPTIONS=--max-old-space-size=4096` no `.env`
5. Chrome DevTools MCP instalado globalmente em `~/.claude/settings.json`

## Como iniciar dev
```powershell
# Terminal 1 — Backend (porta 3000)
pnpm --filter ./apps/backend run dev

# Terminal 2 — Frontend (porta 4200)  
pnpm --filter ./apps/frontend run dev

# Login: admin@vocacc.io / Vocaccio@2024!
```

## Arquivos criados/modificados
| Arquivo | O que faz |
|---------|-----------|
| `apps/frontend/src/app/vocaccio-tokens.scss` | Tokens DS Vocaccio |
| `apps/frontend/src/components/hub/waffle-menu.component.tsx` | Drawer de módulos no header |
| `apps/frontend/src/components/hub/crm/use-clients.hook.ts` | SWR hook `GET /hub/crm/clients` |
| `apps/frontend/src/components/hub/crm/clients-list.component.tsx` | Tabela/cards + busca + filtros |
| `apps/frontend/src/app/(app)/(site)/hub/crm/page.tsx` | Rota Next.js |
| `apps/frontend/src/components/new-layout/layout.component.tsx` | WaffleMenu no header |
| `apps/frontend/src/instrumentation.ts` | Fix try-catch Sentry |
| `apps/backend/package.json` | Script dev restaurado (sem cross-env) |
| `.env` | `NODE_OPTIONS=--max-old-space-size=4096` |
| `~/.claude/settings.json` | Chrome DevTools MCP global |

## Próxima sessão — Detalhe do cliente
**Rota:** `apps/frontend/src/app/(app)/(site)/hub/crm/[id]/page.tsx`

Backend já tem `GET /hub/crm/clients/:id` retornando:
```
{ id, name, email, website, segment, status, notes, createdAt,
  projects: [...], contacts: [...], interactions: [...] }
```

Usar `CLIENT_DETAIL_SELECT` no repositório para ver os campos exatos antes de tipar.

Tabs planejadas: **Projetos · Contatos · Interações · Observações**
