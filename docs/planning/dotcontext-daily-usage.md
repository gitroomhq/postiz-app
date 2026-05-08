# dotcontext — Workflow Diário

Referência permanente para o uso do dotcontext após o bootstrap. Para a
ativação inicial, veja `dotcontext-bootstrap.md`.

---

## Pré-requisitos

- `.mcp.json` na raiz com servidor dotcontext (já versionado).
- Claude Code aberto no projeto, com MCP carregado e aprovado.
- Skills em `.context/skills/` com status `filled` (Fase 4 do bootstrap
  concluída).

---

## Fluxos comuns

### 1. Para cada nova feature/bug

```
Plan "<descrição da tarefa>" using dotcontext.
[aprovar o plano]
Start the workflow.
```

dotcontext escolhe a escala (QUICK / SMALL / MEDIUM / LARGE), sequencia
agents, aciona skills nas fases corretas (PREVC: Plan / Research / Execute /
Verify / Commit) e atualiza `.context/plans/` automaticamente.

### 2. Usar agent específico ad-hoc

```
Use the security-auditor agent to audit the new webhook handler.
Use the backend-specialist agent to review the integration with Temporal.
Use the database-specialist agent to design the migration for table X.
```

Catálogo completo em `.context/agents/`.

### 3. Gerar artifact pontual via skill

```
Use the commit-message skill to draft a commit for the staged changes.
Use the code-review skill to review the diff in apps/backend/src/foo.
Use the test-generation skill to scaffold specs for foo.service.ts.
Use the bug-investigation skill to triage issue #123.
```

Catálogo completo em `.context/skills/`.

### 4. Sincronizar mudanças vindas de outras IDEs (reverse sync)

Caso você abra Antigravity, edite um arquivo `.agent/...`, e queira
refletir de volta no `.context/`:

```
Use sync.reverseSync to import changes from .agent/ back into .context/.
Show diff before applying.
```

Aplique apenas se o diff fizer sentido — diff confuso geralmente significa
que a mudança deveria ter sido feita direto no `.context/`.

### 5. Detectar drift quando codebase muda

Rotina periódica (sugestão: mensal ou após release):

```
Use context.check to detect documentation drift between .context/docs/ and
the actual codebase. Suggest updates without applying them.
```

Aplica conforme aprovação caso a caso. Esse é o equivalente automatizado do
"Garbage Collection Day" para context engineering.

### 6. Trocar de IDE ("se Claude Code cair")

1. Abra Antigravity (ou Cursor, ou Codex).
2. Os exports de `.agent/` (ou equivalente) já estão lá graças à Fase 7 do
   bootstrap.
3. Trabalhe normalmente.
4. Ao voltar para o Claude Code, rode `sync.reverseSync` se editou conteúdo
   de contexto na outra IDE.

---

## Boas práticas

- **Source-of-truth = `.context/`**: edição manual em `.cursor/rules`,
  `.windsurfrules`, `.github/copilot-instructions.md`, `AGENTS.md`
  (consolidado por export) deve virar PR no `.context/` + export, não
  commit direto. Exceção: o `AGENTS.md` raiz manual atual é o stub neutro
  apontando para `.context/`.
- **Commits do dotcontext** mantêm prefixo `chore(dotcontext):` para serem
  filtráveis no histórico.
- **CHANGELOG**: mudanças em `.context/` que afetem o workflow do agente
  entram no `## [Unreleased]` em `### Documentação` ou `### Alterado`.
- **Não rebase commits do dotcontext em cima do que outras IDEs gerarem**:
  trate como se fosse migration — cada export é um snapshot determinístico
  do `.context/` atual.

---

## Quando NÃO usar dotcontext

- **Mudanças triviais de uma linha** (typo, variável renomeada): direto, sem
  workflow PREVC.
- **Investigação aberta sem objetivo claro** ("o que esse módulo faz?"):
  explore com Read/Grep direto. PREVC só ajuda quando há entrega.
- **Conversa de estratégia de produto**: dotcontext é técnico. Estratégia
  vai em `docs/architecture/` ou ADR específico.

---

## Referências cruzadas

- Bootstrap inicial: `docs/planning/dotcontext-bootstrap.md`.
- Catálogo de agents: `.context/agents/`.
- Catálogo de skills: `.context/skills/`.
- Docs técnicos do dotcontext: `.context/docs/`.
- Stack e padrões do projeto: `CLAUDE.md` raiz.
- Entrypoint neutro para outras IDEs: `AGENTS.md` raiz.
