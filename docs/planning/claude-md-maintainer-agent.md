# Próximo Trabalho — Agente `doc-maintainer`

> **Status:** Implementado em [`.claude/agents/doc-maintainer.md`](../../.claude/agents/doc-maintainer.md).
> O conteúdo abaixo é preservado como referência histórica do design (motivação, especificação, Conscious Deferrals e gatilhos de promoção). O subagent ativo deve ser consultado e atualizado em `.claude/agents/doc-maintainer.md` — esta página continua sendo a fonte canônica do **escopo** e dos **gatilhos das Conscious Deferrals** que o subagent referencia em runtime.

## Motivação

A hierarquia de `CLAUDE.md` (raiz + 8 filhos) recém-criada precisa ser
mantida atualizada. Sem manutenção ativa, o conteúdo deriva: novos
arquivos não são adicionados ao mapa, novas armadilhas não são
documentadas, padrões mudam mas o doc não. Esse drift é o problema que
motivou a reorganização inicial — e voltará se ninguém zelar.

A solução proposta é um subagent do Claude Code chamado `doc-maintainer`,
invocado ao final de toda implementação não-trivial, que **propõe**
atualizações nos `CLAUDE.md` afetados sem aplicar nada sem revisão humana.

## Especificação

### Identidade

- **Nome:** `doc-maintainer`
- **Localização:** `.claude/agents/doc-maintainer.md` (subagent do Claude Code)
- **Modelo:** Sonnet (suficiente para a tarefa, mais barato que Opus)

### Gatilho

Invocado **proativamente** ao final de:

1. Implementação de feature nova (após specs verdes + commit)
2. Bug fix não-trivial (mudança que afeta padrão ou armadilha conhecida)
3. Refactor que move/renomeia arquivos-chave listados em algum `CLAUDE.md`
4. Adição/remoção de provider, controller, workflow, MCP tool, primitivo UI
5. Mudança em env var documentada (`AI_CREDITS_MODE`, `ENABLE_KNOWLEDGE_BASE`, etc.)

**Não** é gatilhado para:

- Typos
- Mudanças puramente em testes
- Mudanças em `docs/` (esse é responsabilidade da feature em si)
- Mudanças em `.context/` (gerenciado por dotcontext via MCP, fora do escopo)

### Tools permitidas

Restritas a:

- `Read`
- `Glob`
- `Grep`
- `Edit` — **somente** em arquivos `CLAUDE.md` e `AGENTS.md`. Nada mais.

Sem `Write` (proíbe criar `CLAUDE.md` novos sem revisão humana — quem
decide se uma área merece CLAUDE.md é o ritual semanal, não o agente).
Sem `Bash` (não roda nada).

### Responsabilidades

Em ordem:

1. **Identificar áreas afetadas**: ler o diff do commit atual e mapear
   quais subdomínios do monorepo foram tocados (apps/backend,
   apps/frontend, apps/orchestrator, libraries/nestjs-libraries/src/ai,
   etc.).

2. **Para cada área afetada**:
   - Ler o `CLAUDE.md` correspondente (em cascata: filho mais próximo
     primeiro, raiz por último).
   - Comparar com a mudança recém-implementada.
   - Detectar drift em qualquer das categorias:
     - **Mapa de arquivos-chave** desatualizado (arquivo novo não listado,
       arquivo renomeado, arquivo removido)
     - **Workflow comum** que não menciona novo passo necessário
     - **Armadilha conhecida** que foi corrigida ou nova armadilha
       descoberta
     - **Padrão** mudou (ex.: novo helper canônico substitui antigo)
     - **Referência cruzada** quebrada ou faltando

3. **Propor diff** (não aplicar): em cada `CLAUDE.md` que precisa de
   atualização, gerar um diff legível com:
   - Linha/seção afetada
   - Mudança proposta
   - Justificativa de uma frase

4. **Marcar drift detectado**: se a mudança implementada **divergir** do
   que o `CLAUDE.md` afirma (ex.: padrão novo conflita com regra antiga),
   destacar como `🚨 DRIFT` no relatório.

5. **Devolver relatório estruturado** ao usuário/leader com:
   - Áreas verificadas
   - Diffs propostos por arquivo
   - Drifts detectados
   - Recomendação de ação (aplicar diffs, discutir drift no Garbage
     Collection Day, criar nova subárea)

### Restrições

- **Nunca commita** mudança em `CLAUDE.md` sem aprovação humana explícita.
- **Não cria** `CLAUDE.md` novo. Se uma área cresceu o suficiente para
  merecer um filho próprio, sinaliza no relatório como `📁 NEW SUBAREA
  CANDIDATE` e deixa para o ritual semanal decidir.
- **Não toca em `docs/`** — esses arquivos têm dono próprio (autor da
  feature). Apenas verifica se referências cruzadas em `CLAUDE.md`
  apontam para arquivos que existem.

### Loop com Garbage Collection Day

O ritual semanal de manutenção (Garbage Collection Day) lê todos os
relatórios de drift acumulados pelo `doc-maintainer` e decide:

- Quais drifts viram regra/lint/template (consolidação no `CLAUDE.md`)
- Quais filhos novos criar (quando uma subárea acumulou complexidade)
- Quais regras estão obsoletas e podem ser removidas
- Se algum `CLAUDE.md` cresceu além do alvo (8KB) e precisa quebrar em
  filho

Sem esse loop humano, o `doc-maintainer` viraria fofocador — só
detectando, sem ação. Com o loop, vira o sensor que alimenta o
ritual.

## Conscious Deferrals (decisões de não criar CLAUDE.md filho — gatilhos para revisão)

Esta seção registra subáreas que **foram conscientemente deferidas** durante
a hierarquização inicial. Não é negação; é "não agora, e aqui está o sinal
que faria mudar de ideia". O `doc-maintainer` deve consultar esta lista ao
detectar drift recorrente — quando um gatilho dispara, ele sinaliza
`📁 PROMOTE-CANDIDATE` no relatório do Garbage Collection Day.

### `libraries/nestjs-libraries/src/database/prisma/`

- **Decisão (2026-05-08):** não criar `database/prisma/CLAUDE.md`. As regras
  do data layer estão cobertas em [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md)
  (padrão Repository, helpers de teste, pitfalls de Prisma + crypto), e o
  conteúdo "interessante" de cada repo já vive nos filhos onde o repo é
  consumido (`subscriptions/` em `ai/`, `flows/` em `chat/` + `orchestrator/`,
  `credentials/` + `integrations/` em `social/`).
- **Mitigações tomadas em vez de fragmentar:**
  1. Mapa de domínio em [`docs/architecture/database-schema.md`](../architecture/database-schema.md)
     com 55+ models agrupados por subdomínio + cross-link para o `CLAUDE.md` certo.
  2. Pitfall #6 em [`libraries/nestjs-libraries/CLAUDE.md`](../../libraries/nestjs-libraries/CLAUDE.md)
     sobre o quirk de duas channels de migration (Prisma DDL vs
     `StartupMigrationService` idempotente).
  3. Linha de "Add a new table" workflow apontando para o mapa de schema.
- **Gatilhos para promover** (qualquer um faz disparar `📁 PROMOTE-CANDIDATE`):
  - **Repo desenvolve pattern não-trivial próprio** que não cabe em algum filho
    existente (ex.: cursor-based pagination reusada em ≥3 repos, soft-delete
    sweeper que dependa de cron, novo pattern de read-replica).
  - **Cross-table queries padronizadas** se tornam tema (ex.: helper de
    "fetch with org+profile cascade" usado em ≥4 services).
  - **Migrations runbook necessário** — rotação de `ENCRYPTION_KEY`, deploys
    com downtime mínimo, ordem de migration entre channels A e B, recovery
    de migration falha.
  - **Schema evolui para 80+ models** com novos subdomínios não cobertos pelo
    mapa atual.
  - **Sessão real** em que um agente "caça" relacionamento entre tabelas
    sem encontrar resposta no mapa nem no parent (heurística do `doc-maintainer`:
    contar buscas grep no diretório `database/prisma/` durante uma sessão; se
    > 5 sem edit, sinalizar).

### `apps/frontend/src/components/launches/`

- **Decisão:** não criar `launches/CLAUDE.md`. 59 arquivos com domínio forte
  (composer, calendar context, providers de IA, modals), mas o pattern dos
  componentes ainda é o mesmo do resto do frontend.
- **Gatilhos para promover:**
  - Novo subsistema de composer (multi-step com state machine, drag-and-drop
    avançado, etc.) ganha sua própria abstração não documentada.
  - Calendar context vira hook compartilhado com semântica não-óbvia.
  - Mais de 80 componentes neste diretório.

### `apps/backend/src/api/`

- **Decisão:** não criar `api/CLAUDE.md`. 30+ controllers seguem padrão
  uniforme já documentado em [`apps/backend/CLAUDE.md`](../../apps/backend/CLAUDE.md).
- **Gatilhos para promover:**
  - Novo padrão arquitetural de rota (ex.: API REST muta para gRPC + REST
    híbrido, ou versionamento agressivo no `public-api`).
  - Workflow de adicionar controller fica complexo o suficiente para
    encher meia tela do parent.

### Como o `doc-maintainer` deve usar esta seção

Ao terminar de analisar um diff e antes de fechar o relatório:

1. Para cada caminho tocado pelo diff, checar se algum dos itens "Conscious
   Deferrals" se aplica.
2. Se sim, comparar a mudança contra os "gatilhos para promover".
3. Se um gatilho disparar, adicionar uma seção `📁 PROMOTE-CANDIDATE` ao
   relatório com:
   - Caminho candidato a virar filho
   - Qual gatilho disparou
   - Quantas mudanças no caminho desde a última revisão
   - Recomendação para o Garbage Collection Day
4. Se não, **não criar** o filho — só registrar a passagem como sinal acumulado.

A intenção é evitar tanto fragmentação prematura (tudo vira CLAUDE.md filho)
quanto dump no parent (o parent CLAUDE.md inchando até voltar a ser o
problema original). O ritual humano semanal arbitra.

## Implementação — não fazer agora

A implementação envolve:

1. Definir a tool `Edit` restrita por glob em `.claude/agents/doc-maintainer.md`.
2. Escrever o system prompt do agente com a especificação acima
   (provavelmente 200-400 linhas).
3. Hook `Stop` ou `SubagentStop` no `.claude/settings.json` que invoca
   `doc-maintainer` automaticamente após implementação não-trivial.
4. Critério de "não-trivial" — heurística (linhas alteradas > N, ou
   diretórios afetados ≥ 2, ou arquivos `*.module.ts` alterados, etc.).
5. Template de relatório de drift estruturado (markdown).
6. Mecânica do Garbage Collection Day (template de ritual + checklist).

**Nada disso vive aqui.** Este documento é o escopo apenas. A
implementação acontece em PR separado quando a hierarquia estiver
consolidada (ao menos uma semana de uso).

## Referências

- [`/CLAUDE.md`](../../CLAUDE.md) — raiz da hierarquia que este agente mantém
- [Anthropic Claude Code — Subagents](https://docs.claude.com/en/docs/claude-code/sub-agents) — referência da API
