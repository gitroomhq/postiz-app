# Time de agentes do Vocaccio — orquestração do Dumbledore

**Dumbledore** é o orquestrador: a sessão principal do Claude Code. Ele não é um arquivo
de agente — é quem lê o pedido, decide o que delegar e a quem, e costura o resultado.
Os sub-agentes abaixo são especialistas chamados via a ferramenta **Agent** (Task).

## O elenco

| Agente | Papel | Modelo | Quando chamar |
|---|---|---|---|
| **Flitwick** (`flitwick-frontend`) | Front-end (React/Tailwind/Konva) | Sonnet | Componentes, telas, layout, UI do `apps/frontend` |
| **Snape** (`snape-backend`) | Back-end (NestJS/Prisma/libs) | Sonnet | Controllers/services/repos, rotas, schema/migração |
| **McGonagall** (`mcgonagall-planner`) | Planner/Arquiteto | Opus | Quebrar tarefa grande, decidir arquitetura, atualizar handoff |
| **Moody** (`moody-revisor`) | Revisor de diff (read-only) | Haiku | Antes de commitar: caçar quebras/convenções |

> Cedrico (copy de carrossel) e os demais personagens de *conteúdo* (Flitwick-visual,
> Snape/Luna-análise, Fred&George/Hermione/Moody-lançamento) citados na memória `project-ruflo`
> são casos de uso de **produção de conteúdo** via Ruflo, separados deste time de **desenvolvimento**.

## Política de custo x benefício (regra global)
- Leitura / orientação / edição simples → **Sonnet, esforço baixo**
- Implementação de feature → **Sonnet, esforço médio** (Flitwick/Snape)
- Arquitetura / debugging difícil / decisão complexa → **Opus, esforço médio** (McGonagall / Dumbledore)
- Revisão de diff / correção pontual → **Haiku, esforço baixo** (Moody)

Toda resposta termina indicando o **modelo recomendado** para o próximo passo (ver memória `feedback-model-recommendation`).

## Como o Dumbledore orquestra (princípios — inspirados no Ruflo)
1. **Delegação paralela**: tarefas independentes (ex. front + back da mesma feature) vão para
   sub-agentes em paralelo; só serializa o que tem dependência real.
2. **Memória compartilhada**: o índice de arquivos em `~/.claude/.../memory/MEMORY.md` é a nossa
   "HNSW" — antes de delegar, recupere o contexto relevante e passe ao sub-agente (ele começa frio).
3. **Roteamento por tarefa**: escolha o modelo mais barato que resolve (tabela acima), reservando
   Opus para arquitetura/decisão.
4. **Não super-delegar**: tarefa pequena e local o Dumbledore faz inline; sub-agente custa um cold start.

## Ruflo (swarm MCP multi-modelo) — adiado de propósito
O Ruflo (`project-ruflo`) é um meta-harness que dispara swarms roteando entre vários provedores.
Tende a queimar tokens rápido e ainda não foi verificado neste projeto. **Decisão (2026-06-17):
registrar e testar o Ruflo como MCP só ao FIM da Fase 4**, medindo custo real, antes de adotar
no fluxo. Até lá, a orquestração é nativa (Dumbledore + sub-agentes acima).
