# Checkpoint — Fase 3: Volatis Cockpit (início)
**Data:** 2026-06-12 | **Status: INICIADO — cockpit base entregue**

## Commits desta sessão
- `c31f1ce5` fix: hub link /launches→/hub; content repo _event injection; plano v6.1 religare
- `2107c8d8` feat(phase3): /hub/volatis — cockpit Volatis desbloqueado no waffle menu

## Estado atual

### Volatis ✅ (base)
- Rota `/hub/volatis` criada — renderiza `LaunchesComponent` (calendário Postiz completo)
- Volatis desbloqueado no waffle menu (`locked: false`)
- Link "Calendar" no TopMenu aponta para `/hub/volatis` (URL canônica)
- `/launches` ainda existe e funciona (compatibilidade)

### O que o calendário Postiz já oferece
- Calendário semanal/mensal com drag-and-drop de posts
- Criação de posts com editor multi-rede
- Agendamento com fila de publicação
- Filtros por canal/integração
- Menu lateral com canais conectados

## Próximos passos da Fase 3

### Pendente (a implementar nesta fase ou nas próximas)
1. **Arquitetura per-client channels** — definir se cada `CrmClient` mapeia para
   uma `organization` Postiz ou usa tabela `clientChannel` separada
2. **`/hub/volatis/criar/carrossel`** — builder Konva.js (Cedrico) — Fase 3/4
3. **Sincronário** — calendário cosmológico Tzolkin integrado ao calendário Postiz
4. **Métricas reais no dashboard** — conectar `posts 30d / alcance / engajamento`
   ao dado real do Postiz após canais conectados

## Como iniciar dev
```powershell
# Terminal 1 — Backend (porta 3000)
pnpm --filter ./apps/backend run dev

# Terminal 2 — Frontend (porta 4200)
pnpm --filter ./apps/frontend run dev

# Login: admin@vocaccio.com.br / Vocaccio@2024!
# Volatis: waffle menu → Volatis (desbloqueado) ou sidebar Calendar
```
