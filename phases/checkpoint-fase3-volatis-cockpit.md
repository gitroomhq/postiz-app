# Checkpoint — Fase 3: Volatis Cockpit
**Data:** 2026-06-12 | **Status: EM ANDAMENTO**

## Commits desta sessão
- `2107c8d8` feat(phase3): /hub/volatis — cockpit Volatis desbloqueado no waffle menu
- `e92a1820` feat(phase3): per-client channels — crmClientId em Integration + seletor Volatis

## Estado atual

### Volatis ✅ (cockpit base + per-client channels)
- Rota `/hub/volatis` — cockpit com barra de contexto de cliente + calendário Postiz
- Volatis desbloqueado no waffle menu (`locked: false`)
- Link "Calendar" no TopMenu aponta para `/hub/volatis`

### Per-client channels ✅
- `Integration.crmClientId String?` — FK nullable para `Client` (safe migration)
- `GET /integrations/list?clientId=xxx` — filtra canais por cliente
- `PUT /integrations/:id/crm-client` — associa canal a cliente
- `VolatisClientContext` — contexto React com cliente selecionado
- `useIntegrationList` — SWR key muda com o cliente selecionado
- `VolatisClientSelector` — dropdown de clientes CRM no topo do cockpit

### Pendente
1. **UI de atribuição** — botão para associar canal existente a um cliente
   (API já existe: `PUT /integrations/:id/crm-client`)
2. **Fluxo OAuth por-cliente** — ao conectar nova rede, pre-selecionar o cliente ativo
3. **Builder de carrosseis** — `/hub/volatis/criar/carrossel` com Konva.js (Cedrico) — Fase 3/4
4. **Sincronário** — calendário Tzolkin integrado ao calendário Postiz
5. **Métricas reais** no dashboard Hub

## Erros TypeScript pre-existentes no backend (não são nossos)
8 erros em `agent.graph.service.ts`, `autopost.service.ts`, `media.repository.ts`,
`emails/empty.provider.ts`, `short-linking`, `wallet.provider.ts` — todos do Postiz original.

## Como iniciar dev
```powershell
# Terminal 1 — Backend (porta 3000)
pnpm --filter ./apps/backend run dev

# Terminal 2 — Frontend (porta 4200)
pnpm --filter ./apps/frontend run dev

# Login: admin@vocaccio.com.br / Vocaccio@2024!
# Volatis: waffle menu → Volatis → seletor de cliente no topo
```
