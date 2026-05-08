# Próximo Trabalho — Agente `doc-maintainer`

> **Status:** apenas escopo. Não implementar antes de aprovação explícita.

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
