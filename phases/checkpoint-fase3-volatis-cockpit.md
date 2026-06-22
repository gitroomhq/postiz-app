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
1. ✅ **UI de atribuição** — feito (commit `3cad59d0`)
2. ✅ **Fluxo OAuth por-cliente** — feito (commit `e23a07fb`, `crmClientId` propagado até o callback)
3. **Builder de carrosseis** — `/hub/volatis/criar/carrossel` com Konva.js (Cedrico) — Fase 3/4
4. **Sincronário** — calendário Tzolkin integrado ao calendário Postiz
5. **Métricas reais** no dashboard Hub

## ⚠️ Guarda-corpos Fase H (white-label) — não fechar portas agora

A Fase H (ÚLTIMA, ver `PLANO-MESTRE.md`) torna o CrmClient um **tenant com login + marca
da agência** ("powered by Vocaccio"). O `crmClientId` que estamos cravando aqui é a
fundação dela. Enquanto mexemos em tenancy nesta fase, evitar 2 decisões caras de reverter:

1. **Branding por dado, não constante.** Em qualquer tela que um CrmClient possa ver (o
   **portal de aprovação** da F2 é o caso óbvio), logo/cores/nome vêm do `Client`/`Project`,
   nunca Vocaccio hard-coded. Domínio `aprovar.vocaccio.com.br` = base trocável (futuro CNAME
   por tenant), não espalhado no código.
2. **Limites de plano em cascata.** Modelo atual: agência → N CrmClients → M canais. Deixar
   um campo nullable reservado de **limite de leads/contatos** por CrmClient evita migração
   dolorosa quando o billing em cascata entrar.

3. **Decisão técnica de canais por cliente** (Camada 8): preferir caminho que trate o
   CrmClient como **tenant de 1ª classe** (sub-org Postiz ou equivalente), não só um filtro
   de listagem — facilita o login próprio da Fase H.

> Mapa completo de "não fechar portas" por fase: bloco **Fase H** no `PLANO-MESTRE.md`.

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
