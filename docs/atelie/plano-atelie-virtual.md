# Ateliê Virtual — Plano AT-0 (Taxonomia, Briefing e Contrato)

> Decisão de negócio (Felipe, 2026-07-02): a Vocaccio se divide em **Front-office** (o app,
> autonomia do usuário — todo o `PLANO-MESTRE.md` atual) e **Back-office / Ateliê Virtual**
> (entregáveis robustos operados por agentes no Claude Code — Felipe, depois Nicolas, depois
> agências). Este documento é a AT-0: planejar taxonomia, briefing, escala e contrato ANTES
> de qualquer tela, seguindo a regra do projeto de não equiparar features a modelos de dados
> sem antes desenhar CRUD/estado vazio/escala.
>
> **Nome oficial: "Ateliê Virtual"** (não "Agência Virtual" — o BUSINESS-PLAN §15 já usa a
> metáfora Ateliê para "curadoria humana + tecnologia"; "Agência" briga com o próprio
> manifesto anti-agência-genérica).

---

## 1. O que muda no ecossistema

Nada de novo estruturalmente — isto **nomeia e comercializa** o que já estava desenhado:

- Camada 11 do `PLANO-MESTRE.md` já separa agentes **CLAUDE SYSTEM** (internos, sem UI) dos
  **WEB** (dashboard) — os CLAUDE SYSTEM são o motor do Ateliê.
- Fase G já previa "front (browser) + back (agentes no Claude)" combinados.
- O fluxo **System → Web** (Camada 11) já é o caminho de entrega: produzir → Supabase
  Storage → portal de aprovação → cliente aprova.

O que é novo: (1) **catálogo de serviços contratáveis** com briefing guiado e
preço/prazo estimado; (2) uma **fila de pedidos** (`ServiceRequest`) que o back-office lê;
(3) um **cockpit local** para operar essa fila sem escrever prompt por prompt.

---

## 2. Taxonomia de serviços (v0)

| Serviço | Categoria | Onde entrega | Skills/MCPs já disponíveis |
|---|---|---|---|
| Site institucional | Presença digital | Back-office | Next.js + DS Vocaccio (nativo, sem lib nova) |
| Landing page | Presença digital | Back-office | idem + skill `impeccable` (crítica de UI) |
| Plano de comunicação/marketing | Estratégia | Back-office | Context Pack + Religare + `docx`/`pdf` |
| Plano de growth/negócios | Estratégia | Back-office | idem + referências Fase G (growth próprio) |
| Funil de automação (roteiro) | Estratégia | Back-office | Context Pack + Camada 9 (automações) |
| Roteiro / script de conteúdo | Produção de conteúdo | Back-office | Context Pack + Religare (tom/voz) |
| Tutorial / documentação | Produção de conteúdo | Back-office | skill `docx`/`pptx` |
| Análise de redes/site/concorrência | Inteligência | Back-office | FireCrawl MCP (Snape/Luna já previstos) |
| Vídeo longo / curto animado | Produção audiovisual | **Nicolas** (não desenvolver aqui) | skills `hyperframes:*`, `maestro`, `video-use` como fallback futuro |
| Carrossel, copy curta, agendamento | Conteúdo recorrente | **Front-office** (já existe/roadmap) | Volatis/Augeo |

Regra de triagem: **repetitivo e padronizável → front-office; profundo, único, exige
julgamento humano → Ateliê**. Serviços do Ateliê que se tornarem padronizáveis descem para
o front-office com o tempo — esse é o motor de evolução do produto, não uma exceção.

---

## 3. Matriz de escopo → preço/prazo (proposta v0, faixas "a confirmar")

Cada serviço tem 3 níveis de robustez. Preço/prazo são **faixas com confirmação humana**,
nunca um cálculo automático fechado (evita promessa que o Ateliê não cumpre):

| Nível | Definição | Prazo (faixa) | Preço (faixa) |
|---|---|---|---|
| Simples | 1 entregável, sem iteração, briefing curto | "a partir de X dias úteis" | "a partir de R$ X" |
| Padrão | 1 entregável + 1 rodada de ajuste | "X–Y dias úteis" | "R$ X–Y" |
| Robusto | Múltiplos entregáveis/páginas, iteração ampla, integrações | "confirmação em até 24h" | "sob orçamento" |

O usuário escolhe **o que quer e o que não quer** dentro do serviço (ex.: site com/sem
blog, com/sem multilíngue) — cada opção soma/subtrai do nível e ajusta a faixa. A tabela
completa de opções por serviço é conteúdo de produto, não schema — vive num
`ServiceOffering.optionsSchema` (JSON), não em colunas fixas.

---

## 4. Contrato de dados (rascunho — não implementar ainda)

```prisma
model ServiceOffering {
  id            String   @id @default(uuid())
  slug          String   @unique        // "site-institucional"
  name          String
  category      String                  // presença-digital | estrategia | conteudo | inteligencia | audiovisual
  deliveryMode  String                  // "backoffice" | "frontoffice" | "nicolas"
  briefingSchema Json                   // campos do formulário guiado
  optionsSchema  Json                   // toggles de escopo → nível
  active        Boolean  @default(true)
}

model ServiceRequest {
  id           String   @id @default(uuid())
  crmClientId  String                   // sempre escopado por cliente (Fase H não fecha portas)
  offeringId   String
  briefing     Json                     // respostas do formulário
  scopeLevel   String                   // simples | padrao | robusto
  priceRange   String?                  // faixa exibida ao usuário
  leadTimeRange String?
  status       String   @default("solicitado")
  // solicitado -> confirmado -> em_producao -> em_revisao -> entregue -> aprovado -> arquivado
  deliverableUrl String?                // Supabase Storage
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Notas de compatibilidade com o resto do plano:
- `crmClientId` desde o dia 1 — mesma regra da Fase H (não fechar portas de tenancy).
- Nenhum branding hard-coded no catálogo — para revenda white-label futura (Fase H).
- Todo `ServiceRequest` carrega/consome o **Context Pack** do `crmClientId` + PDF Religare
  (quando existir) antes de qualquer produção — autenticidade é obrigatória, não opcional.
- Validação **Hagrid** (checklist de aderência à marca) antes de status `entregue`.

---

## 5. Fluxo operacional

```
Front-office: usuário abre "Ateliê Virtual" → escolhe serviço → preenche briefing guiado
  → escolhe opções de escopo → vê faixa de preço/prazo → confirma
      ↓
ServiceRequest criado (status: solicitado) na tabela Supabase
      ↓
Back-office: cockpit local (rota interna, ex. /atelie/fila, ou skill local) lista a fila,
  mostra briefing + Context Pack + Religare do cliente
      ↓
Operador (Felipe/Nicolas/agência) aciona a skill/agente certo no Claude Code
  → entregável gerado → validação Hagrid → Supabase Storage
      ↓
status: entregue → aparece no portal de aprovação existente (Camada 10.3/Fase 2)
  → cliente aprova/pede ajuste, igual ao fluxo Volatis atual
```

Nenhuma infraestrutura nova: a fila é uma tabela; o "cockpit" é uma tela a mais no mesmo
Next.js (atrás de role `OWNER`/`OPERATOR`) ou, na v0, nem precisa de tela — uma skill local
que lê a tabela via Prisma/SQL direto já resolve o dia a dia.

---

## 6. Fases (encaixe no `PLANO-MESTRE.md`, faseamento paralelo — não bloqueia F1-F6)

```
AT-0  — taxonomia + contrato                                          ✅ CONCLUÍDA (2026-07-02)
AT-1  — Ateliê manual: skill local + templates de briefing            ✅ CONCLUÍDA (2026-07-02)
AT-2  — ServiceRequest real + cockpit local (/atelie/fila)             ✅ CÓDIGO PRONTO
        (2026-07-02) — validação real (boot/migration) PENDENTE, ver seção abaixo
AT-3  — Aba "Ateliê Virtual" pública no front-office (catálogo, briefing
        guiado, preço/prazo) — encaixa após Fase 3.5 (coerência visual),
        antes/dentro da Fase G
```

### AT-2 — o que foi escrito (2026-07-02) e o que falta validar

**⚠️ Este worktree não tem `node_modules`/DB (mesma restrição documentada no plano de
leveza) — nada abaixo rodou `prisma generate`, `tsc`/build ou boot real.** Segue o mesmo
protocolo usado no protótipo Konva: código escrito e revisado por leitura, validação real
fica para você a partir de `C:\dev\vocaccio`.

**Backend (Controller → Service → Repository, RBAC `OWNER`/`OPERATOR`):**
- Schema: `ServiceOffering`, `ServiceRequest`, `ServiceRequestEvent` + 4 enums novos em
  `schema.prisma` (aditivo — nenhuma tabela existente alterada). `Project` ganhou a relação
  inversa `serviceRequests`.
- Migration manual (sem `prisma migrate dev` real — mesma ressalva da VOC-34):
  `libraries/nestjs-libraries/src/database/prisma/migrations/20260702_at2_atelie_service_request/`
- `ProjectRepository.getContextPackSnapshot()` (novo método, aditivo) — calcula os dois
  flags descobertos no teste da AT-1: `contextPackComplete` (businessArea+colors+typography+
  persona+cta1 preenchidos) e `hasReligareProfile` (algum Expert do Client tem
  `ReligareProfile`).
- `libraries/nestjs-libraries/src/database/prisma/atelie/` — `service-offering.repository.ts`,
  `service-request.repository.ts`, `service-request.service.ts` (mesmo padrão de
  `content.repository.ts`/`content.service.ts`).
- `apps/backend/src/api/routes/atelie.controller.ts` — `/hub/atelie/offerings`,
  `/hub/atelie/fila`, `/hub/atelie/fila/:id`, `/hub/atelie/projects/:projectId/requests`,
  `/hub/atelie/fila/:id/status`, `/hub/atelie/fila/:id/events` — todas
  `@VocaccioRoles(OWNER, OPERATOR)` (cockpit interno, não client-facing).
- Registrado em `database.module.ts` (providers globais) e `api.module.ts`
  (`authenticatedController`).
- Seed idempotente do catálogo (separado do `seed.ts` principal de propósito — não mexe em
  dado de cliente real): `seed-atelie-offerings.ts`, script `pnpm run prisma-seed-atelie`.
  8 slugs, espelhando exatamente `docs/atelie/briefings/*.md`.

**Frontend:**
- `apps/frontend/src/components/atelie/use-atelie-fila.hook.ts` (SWR, hooks separados por
  query, sem eslint-disable) + `fila-client.component.tsx` (kanban por status, badges de
  Context Pack incompleto/sem Religare, botão "Gerar prompt do operador" — monta o prompt
  estruturado localmente, **nenhuma chamada a API de IA a partir do cockpit**, conforme
  princípio da Seção 5).
- Rota `apps/frontend/src/app/(app)/(site)/atelie/fila/page.tsx` — **sem entrada no menu de
  propósito**: é o cockpit interno da AT-2, não a aba client-facing da AT-3 (que ainda não
  existe). Segurança real é o RBAC do backend, não a ausência de link.

**⏸️ AT-3 em espera (decisão 2026-07-02, Felipe):** confirmado — segurar a AT-3 até a Fase
3.5 (coerência visual) rodar, para não construir a primeira tela pública do Ateliê em cima
do design ainda fragmentado. **Lembrete pendente:** Felipe não conseguiu testar a AT-2
nesta sessão (sem ambiente disponível) — relembrar o passo a passo de validação abaixo ao
final da AT-3, quando ela for retomada.

**Passo a passo de validação (só você consegue, a partir de `C:\dev\vocaccio`):**
1. `git pull`/merge desta branch.
2. `pnpm install` (regenera lockfile se necessário).
3. `pnpm run prisma-generate`.
4. Conferir a migration manual: `pnpm dlx prisma@6.5.0 migrate diff --from-migrations ./libraries/nestjs-libraries/src/database/prisma/migrations --to-schema-datamodel ./libraries/nestjs-libraries/src/database/prisma/schema.prisma --shadow-database-url <sua_url_shadow>` (ou, mais simples: `pnpm run prisma-migrate` local contra um banco de desenvolvimento/shadow, deixando o Prisma conferir/gerar a migration de verdade a partir do schema já editado — **preferível a confiar cegamente no SQL escrito à mão**).
5. `pnpm run prisma-migrate-deploy` (produção) só depois do passo 4 confirmar consistência.
6. `pnpm run prisma-seed-atelie` (idempotente — seguro rodar mais de uma vez).
7. Build real: `pnpm run build` (não só `tsc --noEmit`) no backend e frontend.
8. Boot real (`pnpm run dev-backend` ou `curl` em produção) + teste manual: logar como
   OWNER, `POST /hub/atelie/projects/:projectId/requests` com um briefing de teste, conferir
   que aparece em `GET /hub/atelie/fila` e na tela `/atelie/fila`, avançar status, gerar o
   prompt do operador.

### AT-1 — o que foi entregue (2026-07-02)

- Skill de projeto `.claude/skills/atelie/SKILL.md` — operação manual: identifica serviço,
  cria a instância do pedido, reúne Context Pack + Religare, produz o entregável com as
  skills existentes (`docx`/`pdf`/`pptx`/`impeccable`/`canvas-design` + DS Vocaccio),
  aplica o checklist de aderência à marca ("Hagrid" manual), salva a entrega.
- 8 templates de briefing em `docs/atelie/briefings/` (um por serviço da taxonomia da
  Seção 2, exceto vídeo — do Nicolas — e carrossel/copy — já front-office): estrutura
  comum (`_template.md`) + perguntas específicas por serviço.
- Pastas de trabalho `docs/atelie/pedidos/` (instância preenchida por cliente) e
  `docs/atelie/entregas/` (arquivo final) — gitignoradas por conterem dados reais de
  clientes (só `.gitkeep` versionado).
- **Sem tabela, sem tela** — de propósito: valida o fluxo operacional antes de desenhar o
  cockpit da AT-2.

## 7. Riscos e decisões pendentes com o Felipe

1. Faixas reais de preço/prazo por serviço (esta AT-0 só propõe a estrutura, não os valores).
2. Confirmar nome definitivo da aba no menu ("Ateliê Virtual" recomendado).
3. Billing: cobrança avulsa por `ServiceRequest` vs. incluída em plano — depende da base de
   billing do Postiz (Camada 2, Área de Perfil) já mapeada mas não implementada.
4. Quando Nicolas integrar vídeo, o "vídeo" vira `ServiceOffering` real com
   `deliveryMode: "nicolas"` — contrato já genérico o suficiente, não precisa migração.
