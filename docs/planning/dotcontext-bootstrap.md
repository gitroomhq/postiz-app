# Bootstrap: Ativar dotcontext no Robô MultiPost

> **Como usar este arquivo:** execute as fases em ordem. Diferente do bootstrap
> de `CLAUDE.md`, este aqui tem partes que rodam no terminal (instalação MCP) e
> partes que rodam dentro do Claude Code via prompt (chamadas aos gateway
> tools). Marque cada item da Definition of Done à medida que avança.

---

## 1. Por que estamos fazendo isso

**Estado atual no repo (auditado em 2026-05-08):**

- `.context/` existe e foi gerado por uma versão antiga do scaffold.
- `.context/skills/` tem **10 skills com `status: unfilled`** — só
  frontmatter, body vazio. **Sem MCP, ficam vazias para sempre** (geração
  standalone foi removida na v0.8.0 do `@dotcontext/cli`).
- `.context/agents/` tem **14 agents oficiais, todos preenchidos** com
  conteúdo real (~120+ linhas cada). Não há agents extras nem faltantes.
- `.context/docs/` tem **10 docs todos preenchidos** (~2.660 linhas no
  total), incluindo `codebase-map.json` (1.781 linhas).
- O repo referencia `AGENTS.md` na raiz (`.cursor/rules`, `.windsurfrules`).
  Já existe agora como stub apontando para `.context/`.
- Não há referências legadas a `@ai-coders/context`, `ai-context` ou
  `AI_CONTEXT_LANG` — migração de nomenclatura **não é necessária**.
- `.mcp.json` na raiz já configura o servidor MCP do dotcontext, então
  qualquer clone do repo que abra Claude Code pega automaticamente (basta
  reiniciar a sessão).

**Estratégia de portabilidade ("se Claude Code cair amanhã"):**

- `.context/` é a source-of-truth.
- Claude Code consome via MCP gateway (declarado em `.mcp.json`).
- Outras ferramentas (Antigravity, Cursor, Codex) consomem via export
  (`sync.exportRules`, `sync.exportAgents`, `sync.exportSkills`).
- Quando Claude estiver fora, troca de IDE e o conteúdo continua funcionando.

---

## 2. Pré-requisitos

- Node.js 20+ instalado.
- Claude Code v2.x rodando com permissão para configurar MCP.
- Repo `robo-multipost` em estado limpo (commitar pendências antes).
- Branch dedicada para preencher skills:
  `chore/dotcontext-fill-skills` (ou continuação da
  `claude/activate-dotcontext-mcp-KFniE`).

---

## 3. Restrições inegociáveis

- **Não apagar `.context/` existente.** Tem 14 agents preenchidos e
  `.context/docs/` completo. Vamos preencher os 10 skills, não recriar do
  zero.
- **Não rodar geração standalone.** A doc da v0.8.0 deixa claro:
  *"Standalone CLI generation is no longer supported. Use MCP-enabled AI
  tools to create, fill, or refresh context."* Toda escrita em `.context/`
  agora vai via gateway tool MCP.
- **Não confundir com a hierarquia de `CLAUDE.md`.** São trabalhos
  complementares. `.context/` é portabilidade entre IDEs. `CLAUDE.md` é
  instrução nativa do Claude Code. Coexistem.
- **Branch dedicada e commits pequenos** por fase, prefixo `chore(dotcontext)`.
- **Idioma**: pt-BR (sem acentos no CHANGELOG por compatibilidade); body de
  skills/agents em inglês quando o template oficial do dotcontext exigir.

---

## 4. Plano de execução

### Fase 0 — Setup e backup (terminal, ~2 min)

```bash
# Confirmar Node 20+
node --version

# Branch dedicada (se ainda não estiver em uma)
git checkout main
git pull
git checkout -b chore/dotcontext-fill-skills

# Backup do .context/ (segurança antes de mudar skills via MCP)
cp -r .context .context.backup-$(date +%Y%m%d)
echo ".context.backup-*" >> .gitignore

# Confirmar versão do dotcontext disponível
npx -y @dotcontext/cli@latest --version
```

**DoD:** está na branch nova, backup existe, comando `@dotcontext/cli`
responde.

---

### Fase 1 — Ativar MCP do dotcontext no Claude Code (~3 min)

`.mcp.json` na raiz **já existe** com a config:

```json
{
  "mcpServers": {
    "dotcontext": {
      "command": "npx",
      "args": ["-y", "@dotcontext/cli@latest", "mcp"]
    }
  }
}
```

Reinicie o Claude Code para o MCP carregar:

```bash
# encerre a sessão atual (Ctrl+C) e abra de novo no projeto
claude
```

Na primeira vez, o Claude Code pode pedir aprovação do MCP project-scoped —
aprove. Dentro do Claude Code, valide:

```
Liste as ferramentas MCP disponíveis e confirme que o dotcontext aparece
com os gateways: explore, context, plan, agent, skill, sync. Mostre também
os tools dedicados de workflow (workflow-init, workflow-status,
workflow-advance, workflow-manage).
```

**Checkpoint humano:** se o dotcontext **não** aparecer, pare aqui. Causas
prováveis:
- Claude Code não foi reiniciado.
- Versão do Claude Code desatualizada.
- O MCP project-scoped não foi aprovado (`/mcp` para conferir).

Como fallback manual (escopo de usuário, fora do repo):
```bash
claude mcp add dotcontext -- npx -y @dotcontext/cli@latest mcp
```

**DoD:** Claude Code lista os 6 gateways + 4 workflow tools do dotcontext.

---

### Fase 2 — Diagnóstico do `.context/` atual (Claude Code, ~5 min)

Cole no Claude Code:

```
Use o gateway "context" do dotcontext, action "check", para auditar o estado
do .context/ atual. Reporte:

1. Se a estrutura segue o schema da v0.8.0 do @dotcontext/cli.
2. Confirma que os 10 skills estão "unfilled" (security-audit, refactoring,
   commit-message, api-design, bug-investigation, feature-breakdown,
   test-generation, code-review, pr-review, documentation).
3. Confirma que os 14 agents estão presentes e filled (architect-specialist,
   feature-developer, bug-fixer, test-writer, code-reviewer,
   security-auditor, performance-optimizer, documentation-writer,
   backend-specialist, frontend-specialist, database-specialist,
   devops-specialist, mobile-specialist, refactoring-specialist).
4. Reporta drift entre os 10 docs em .context/docs/ e a codebase atual.

Não modifique nada ainda. Apenas reporte um diagnóstico em formato tabela.
```

**Checkpoint humano:** revise o diagnóstico. Se houver drift sério em
algum doc, anote para tratar na Fase 6.

---

### Fase 3 — Migração de nomenclatura legada (N/A neste repo)

Auditoria 2026-05-08 confirmou **zero referências** a `@ai-coders/context`,
`ai-context` ou `AI_CONTEXT_LANG` no repo. **Pule esta fase.**

(Mantida no runbook para repos onde a migração ainda é necessária.)

---

### Fase 4 — Preencher os 10 skills `unfilled` (Claude Code, ~30-60 min)

Os 10 skills (PREVC phases entre parênteses):

| Skill              | Phases |
|--------------------|--------|
| `commit-message`   | E, C   |
| `pr-review`        | R, V   |
| `code-review`      | R, V   |
| `test-generation`  | E, V   |
| `documentation`    | P, C   |
| `refactoring`      | E      |
| `bug-investigation`| E, V   |
| `feature-breakdown`| P      |
| `api-design`       | P, R   |
| `security-audit`   | R, V   |

Cole no Claude Code:

```
Use o gateway "skill" do dotcontext.

1. Action "list": confirme os 10 skills e seus status.
2. Para cada skill com status unfilled, use action "fill" passando contexto
   específico do Robô MultiPost:

   Stack: NestJS + TypeScript backend, Next.js 14 + React + SWR + Tailwind
   frontend, Temporal.io orchestrator, Prisma + PostgreSQL, Mastra+MCP para
   IA. Padrão Controller → Service → Repository, TDD obrigatório, GitLab
   Flow, i18n obrigatório no frontend, Conventional Commits, monorepo PNPM
   com apps/ e libraries/. Branch postiz é mirror do upstream
   gitroomhq/postiz-app.

   O skill deve refletir esses padrões nos exemplos e comandos. Quando o
   skill envolver comandos, use os scripts reais do package.json (pnpm test,
   pnpm dev:*, pnpm build:*, etc.).

Trabalhe um skill por vez. Após cada um, mostre um diff do arquivo gerado
para eu validar antes de gravar. Comece pelos 3 mais usados:
test-generation, code-review, commit-message.
```

**Checkpoint humano por skill:** revisa o diff antes de aceitar. Cada skill
vira doc viva e o conteúdo importa.

**Após os 3 primeiros, faça os 7 restantes:**

```
Continue com os 7 skills restantes seguindo o mesmo padrão:
pr-review, documentation, refactoring, bug-investigation,
feature-breakdown, api-design, security-audit.
```

**DoD:** todos os 10 skills com `status: filled`, conteúdo específico do
projeto, comandos válidos, sem placeholders genéricos.

**Commits:** um por skill, `chore(dotcontext): preenche skill <name>`.

---

### Fase 5 — Refresh dos 14 agents (opcional, ~10-20 min)

Os 14 agents oficiais já estão preenchidos. Esta fase é só um
sanity-check de drift contra a codebase atual:

```
Use o gateway "agent" do dotcontext.

1. Action "discover": liste os 14 agents existentes em .context/agents/.
2. Action "check": para cada agent, identifica se algum tem conteúdo
   desatualizado em relação à codebase atual (ex: referencia padrões
   antigos que mudaram, comandos pnpm errados, paths obsoletos).
3. Se houver drift relevante, action "refresh" no agent específico.
   Mostra diff antes de gravar.

Não force refresh em agents já alinhados — minimiza diff ruidoso.
```

**Checkpoint humano:** decide caso a caso se o refresh vale a pena.

**DoD (opcional):** agents revisados; em caso de refresh, commits
`chore(dotcontext): refresh agent <name>`.

---

### Fase 6 — Refresh dos docs em `.context/docs/` (opcional, ~10-20 min)

Os 10 docs já estão preenchidos. Mesma lógica da Fase 5: detecta drift e
refresha apenas o que precisa.

```
Use o gateway "context" do dotcontext, action "check", para detectar drift
entre .context/docs/ e a codebase atual.

Para cada doc com drift relevante (ex: codebase-map.json desatualizado,
data-flow.md sem AI Provider System, etc.), use action "fill" para
refresh. Mostra diff antes de gravar.

Não duplica conteúdo de /docs/architecture/ ou /docs/operations/ —
referencia sem repetir.
```

**DoD:** docs refrescados conforme necessário.

**Commits:** `chore(dotcontext): refresh docs <area>`, um por bloco.

---

### Fase 7 — Configurar sync para outras IDEs (Claude Code + terminal, ~10 min)

Aqui ativa a portabilidade real. Mínimo recomendado: Claude Code (origem),
Antigravity (backup), Cursor (alternativa), AGENTS.md raiz (Codex/agnóstico).

```
Use o gateway "sync" do dotcontext.

Configure exports para:
1. Antigravity (.agent/) — action exportRules, exportAgents, exportSkills.
2. Cursor (.cursor/) — action exportRules, exportAgents.
3. Codex (AGENTS.md raiz) — action exportContext (gera AGENTS.md unificado).

Use merge strategy "preserve" quando houver conflito com conteúdo manual
existente. Após executar, liste os arquivos gerados/atualizados.
```

Valide manualmente:

```bash
ls -la .agent/ 2>/dev/null
ls -la .cursor/
head -40 AGENTS.md
```

**Importante:** o `AGENTS.md` raiz atual é um stub manual apontando para
`.context/`. Use `merge: preserve` para o export adicionar conteúdo sem
sobrescrever o stub. Idem para `.cursor/rules` e `.windsurfrules` (já são
stubs preenchidos manualmente).

**DoD:** exports ativos para pelo menos Antigravity e Codex (AGENTS.md).

**Commit:** `chore(dotcontext): configura sync para Antigravity, Cursor e Codex`.

---

### Fase 8 — Conectar `.context/` ao `CLAUDE.md` raiz (já feito)

A seção **"Contexto Portável (.context/)"** já foi adicionada no `CLAUDE.md`
durante o bootstrap inicial (commit
`chore(dotcontext): documenta integracao no CLAUDE.md raiz`).

Se o conteúdo precisar de atualização (ex: novos gateways), edite
diretamente — é instrução do Claude Code, não derivada do `.context/`.

---

### Fase 9 — Smoke test do PREVC com tarefa real (Claude Code, ~30 min)

Escolha uma tarefa pequena e real do backlog. Sugestão: algo entre QUICK e
SMALL (bug fix simples ou feature trivial).

Cole no Claude Code:

```
Plan [SUA TAREFA AQUI] using dotcontext.
```

O dotcontext vai:

1. Detectar a escala (QUICK / SMALL / MEDIUM / LARGE).
2. Iniciar o workflow PREVC com as fases adequadas.
3. Pedir aprovação do plano antes de executar.

Após aprovar:

```
Start the workflow.
```

Acompanhe cada fase. Aprove os gates conforme aparecerem.

**Checkpoint humano:** observe especialmente:

- Os agents foram invocados nas fases corretas?
- Os skills foram usados quando faziam sentido (commit-message no fim, etc.)?
- A documentação em `.context/plans/` está sendo atualizada?
- Houve "perda de contexto" comparado a só usar Claude Code direto?

Anote dores para ajustes na próxima iteração.

**DoD:** uma tarefa completa do início ao fim com PREVC.

---

## 5. Definition of Done geral

- [x] `.mcp.json` versionado com servidor dotcontext.
- [x] `AGENTS.md` raiz como entrypoint para `.context/`.
- [x] Seção "Contexto Portável (.context/)" no `CLAUDE.md`.
- [x] Runbook permanente em `docs/planning/dotcontext-bootstrap.md`.
- [x] Guia diário em `docs/planning/dotcontext-daily-usage.md`.
- [ ] Backup `.context.backup-YYYYMMDD/` criado e adicionado ao .gitignore
      (na sessão local antes de Fase 4).
- [ ] Claude Code lista 6 gateways + 4 workflow tools do dotcontext.
- [ ] 10 skills com `status: filled` e conteúdo específico do projeto.
- [ ] 14 agents revisados (refresh opcional).
- [ ] 10 docs em `.context/docs/` revisados (refresh opcional).
- [ ] Sync configurado para Antigravity, Codex (AGENTS.md), e ao menos
      Cursor.
- [ ] Smoke test PREVC passou com uma tarefa real.

---

## 6. Anti-padrões a evitar

- **Apagar `.context/` e recriar do zero**: perde 14 agents preenchidos e
  10 docs com 2.660 linhas de conteúdo. Migra, não substitui.
- **Tentar rodar `npx dotcontext init` ou similar standalone**: não funciona
  mais na v0.8.0. Tudo via MCP.
- **Sincronizar tudo para todas as IDEs**: adiciona apenas as que você
  realmente usa. Mais sync = mais drift potencial.
- **Esquecer reverse sync**: edita `.agent/` ou `.cursor/` direto sem
  reverse sync, e o `.context/` (origem) fica desatualizado. Estabelece o
  ritual.
- **Misturar fontes de verdade**: depois de ativo, conteúdo de regras do
  agente vai pelo `.context/` → export. Não edita `.cursor/rules` direto
  (vira drift).
- **Pular o smoke test PREVC**: o ganho real só fica claro quando você usa
  uma vez de ponta a ponta.

---

## 7. Troubleshooting comum

| Sintoma | Causa provável | Solução |
|---|---|---|
| MCP `dotcontext` não aparece em Claude Code | Sessão não reiniciou | Encerra e reabre o `claude` |
| MCP project-scoped pede aprovação repetida | `.mcp.json` não foi aprovado | `/mcp` no Claude Code para aprovar permanentemente |
| Skills ficam "unfilled" mesmo após `fill` | Falta de contexto suficiente no prompt | Reescreve o prompt com mais detalhe da stack/padrões |
| Conflito merge ao rodar export | Stubs criados manualmente (AGENTS.md, .cursor/rules) | Use `merge: preserve` na primeira passada |
| Drift entre `.context/` e codebase | Mudanças no código não refletiram nos docs | Rotina periódica de `context.check` |
