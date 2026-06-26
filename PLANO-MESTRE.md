# Vocaccio | Social Media HUB — Plano Mestre v6
**Spec-Driven Development | Claude Code executor | Codex revisor**

> Ecossistema Soul 2 Soul: Vocação + Marketing + Redes Sociais + Growth
> *Resultados com autenticidade*

> **v6 (2026-06-10):** versão otimizada do v5. Mudanças: specs just-in-time (não mais
> todas antecipadas), convenção única de checkpoint (`checkpoint-faseN.md`), Camadas
> 16/19 marcadas como concluídas com versões reais, correções da estrutura real do
> Postiz (pnpm workspaces, portas), scheduling BullMQ no MVP / Temporal na Fase 3.
> Nenhuma decisão da Camada 18 foi alterada.
> Original v5: `C:\Users\felip\.claude\plans\ainda-n-o-comece-a-kind-fog.md`
>
> **v6.1 (2026-06-11):** Religare redesenhado — dois modos (individual + agência/terapeuta),
> dois PDFs (Vocacional + Marca), stack HD nativa TypeScript (`openhumandesign-library` +
> `sweph`), planos com limites definidos, dashboard dual com/sem Religare, MBTI/Eneagrama
> movidos para pós-conclusão, astrologia prevista pós-conclusão.

---

## ⚠️ PROTOCOLO ANTI-ESTOURO DE TOKENS

```
1. Cada sessão começa lendo /phases/checkpoint-faseN.md mais recente (< 200 linhas)
2. Ao final de QUALQUER sessão: gerar checkpoint compacto antes de parar
3. Usar RTK em TODOS os comandos bash (rtk git diff, rtk pnpm install, etc.)
4. Dumbledore usa Haiku para tarefas simples, Sonnet para criação
5. Nunca re-ler arquivo que já foi lido na sessão
6. Implementar em micro-tarefas de 1 arquivo por vez
7. Prompt caching obrigatório desde a Fase 1
8. Máximo de 1 agente Explore por sessão, nunca 3 paralelos
```

**Agente Economizador (Dumbledore):** antes de task complexa avaliar — modelo mínimo
suficiente? contexto já em cache? algo já implementado resolve? dá pra quebrar em 2?

**Referência de qualidade visual (Dumbledore):** skill `impeccable` instalada globalmente
(`~/.claude/skills/impeccable`) — usar como referência prioritária de boas práticas de
front-end (hierarquia visual, acessibilidade, espaçamento, motion, anti-padrões) em toda
tarefa de UI do Vocaccio. Flitwick audita com ela antes de fechar tela/componente;
McGonagall inclui como critério de "pronto" ao planejar passos de front-end.

## FLUXO DE EXECUÇÃO

```
Planejar (Codex) → Specs (Claude Code) → Implementar (Claude Code)
→ Checkpoint (salvar) → Revisar (Codex) → Corrigir (Claude Code) → Repetir
```

---

## CAMADA 0 — SPECS (just-in-time)

> **v6:** specs são criadas **no início da fase que as usa**, não todas antecipadamente.
> A árvore abaixo é o mapa de referência completo; cada fase materializa sua parte.

```
/specs/
├── shared/        design-tokens, auth-rbac✅F1, database-schema✅F1,
│                  agent-roster, memory-system(F4), security
├── hub/           01-crm-admin✅F1, 02-client-project✅F1,
│                  03-magic-dashboard(F1), 04-lp-landing(F1+)
├── religare/      01-onboarding…05-self-consultation (F5)
├── volatis/       01-carousel-builder…06-publishing-hub (F2-F3),
│                  07-vitrine-netflix ⛔ RESERVADO
├── augeo/         01-copy-lab, 02-seo-hub, 03-launches (F6)
├── automations/   01-rules-engine (F7), 02-typebot (F8), 03-chatwoot (F8+)
└── external-agents/  chatgpt-* (F3+)
```

---

## CAMADA 1 — ARQUITETURA TÉCNICA

### Pasta mãe única — `C:\dev\vocaccio` (decisão 2026-06-10)

> **Workspace oficial do projeto.** Todos os chats/sessões abrem aqui. As antigas
> pastas `Automação\vocaccio-ecosystem` (repo) e `Automação\Vocaccio-Ecossistema`
> (assets) foram FUNDIDAS nesta única pasta e arquivadas (`_ARQUIVADO-*`).
> Motivos: nomes quase idênticos confundiam as sessões; OneDrive sincronizando
> node_modules causava lentidão/locks; git push é o backup do que importa.

```
C:\dev\vocaccio\               ← fork de gitroomhq/postiz-app (felipeweb7/vocaccio-ecosystem)
├── apps/
│   ├── frontend/              ← Next.js 16 (porta 4200) — UI Vocaccio por cima
│   ├── backend/               ← NestJS (porta 3000)
│   ├── orchestrator/          ← Temporal workers (Fase 3)
│   └── extension/             ← extensão Chrome do Postiz (não usar no MVP)
├── libraries/
│   └── nestjs-libraries/src/database/prisma/schema.prisma  ← SCHEMA AQUI
├── docs/referencias/          ← assets de marca, design systems, análises, prompts
├── specs/                     ← specs just-in-time
├── phases/                    ← checkpoints de sessão ← CRÍTICO
├── PLANO-MESTRE.md            ← este arquivo
└── pnpm-workspace.yaml        ← pnpm workspaces puro (SEM Turborepo, SEM NX)
```

### Scripts reais do Postiz

```powershell
pnpm --filter ./apps/frontend run dev    # só frontend (Fases 0-1)
pnpm run dev-backend                     # frontend + backend em paralelo
pnpm run prisma-generate                 # gerar client
pnpm run prisma-db-push                  # aplicar schema no Supabase
# Backend OOM no watch mode: $env:NODE_OPTIONS="--max-old-space-size=4096"
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + TypeScript (fork usa 16.2.6) |
| Backend | NestJS (já em Postiz) |
| Database | PostgreSQL + Prisma + pgvector (via Supabase) |
| Monorepo | **pnpm workspaces** (estrutura nativa do Postiz) |
| Scheduling MVP (F1-F2) | **BullMQ + Upstash Redis** |
| Scheduling F3+ | Temporal Cloud free tier (workers Postiz/orchestrator) |
| Auth | NextAuth.js + argon2id |
| Styling | Tailwind + CSS vars DS Vocaccio |
| Animations | Framer Motion |
| Realtime / Storage | Supabase Realtime / Supabase Storage |
| Canvas (carrosséis) | **Konva.js** — 3 layers/stage, 1080×1350px nativo |
| Video (carrosséis) | **Remotion** — export MP4 in-browser (skill `maestro`) |
| Human Design / Astrologia | **`openhumandesign-library` + `sweph`** — TypeScript nativo, sem microserviço |
| Tzolkin / Kin | Algoritmo puro TypeScript (zero dependência externa) |
| Fase da Lua | `astronomia` npm |
| Video (edição) | KyaniteLabs/mcp-video (FFmpeg, Apache 2.0) |
| Agent Orchestration | **Ruflo** — swarm multi-agente, HNSW memory |
| Reverse Proxy | Vercel edge (free) / Caddy só em VPS futuro |

---

## CAMADA 2 — AUTENTICAÇÃO E ACESSO

**Tipo A — Login/senha (equipe interna):** dashboard, Hub, CRM, criação de conteúdo,
configurações, integrações, agentes, relatórios, publicação.

**Tipo B — Link único livre (cliente final, MVP):** materiais pendentes de aprovação,
histórico, Kanban do próprio projeto, status, comentários. Nunca: admin, CRM, outros
clientes, configurações.

### Roles

| Role | MVP | Acesso |
|------|-----|--------|
| `OWNER` | ✅ | Total |
| `OPERATOR` | ✅ | Interno por permissão |
| `EDITOR` | ✅ | Criação/edição de conteúdo |
| `VIEWER_INTERNAL` | ✅ | Visualização interna |
| `CLIENT_USER` | ❌ futuro | Login próprio, só seus projetos (schema já prevê) |
| `GUEST_LINK` | ✅ | Link único — portal aprovação |
| `VISITOR` | ✅ | LP pública |

### Segurança do link único

Token longo (UUID v4 + HMAC), hasheado no banco, revogável, rate limit IP+token,
permissões revalidadas no backend a cada request, logs de visualização/aprovação/
comentário/ajuste, senha curta opcional futura (OFF no MVP).

### Segurança geral (obrigatório)

argon2id (não bcrypt) · 2FA p/ OWNER e OPERATOR · RBAC + RLS por cliente/projeto ·
tokens OAuth criptografados AES-256-GCM, nunca expostos ao frontend · refresh token
rotation · rate limit login 5/15min, APIs 100/min, webhooks 20/min · CSRF · HMAC-SHA256
em webhooks · escopos OAuth mínimos · rotação de tokens · logs de auditoria · backup
diário (30d) · RLS entre clientes.

### Admin inicial

`.env` (NUNCA commitar): `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `ADMIN_NAME`,
`ADMIN_ROLE=OWNER`. Fase 1: `prisma db seed` cria OWNER; 1º login exige troca de senha.

### Área de Perfil do Usuário (planejado 2026-06-25, definir fase de execução)

Hoje `/settings` só tem métricas/notificações/shortlink (`global.settings.tsx`) — falta uma
área de conta pessoal coerente. Reunir, seguindo boas práticas de UX (separar "minha conta"
de "configurações da ferramenta"):

- **Troca de senha** — **CORREÇÃO 2026-06-25**: confirmado via grep que NÃO existe nenhum
  endpoint de "trocar senha logado" no backend (só `/auth/forgot`+`/auth/forgot-return`,
  fluxo NÃO-autenticado por link de e-mail, herdado do Postiz). Falta backend E frontend —
  endpoint novo (validar senha atual + nova senha + `providerName: LOCAL`) e a UI de fato.
  Confirmado na prática: Felipe precisou de um link de reset gerado manualmente (sem SMTP
  configurado) por não haver nenhuma forma de trocar senha estando logado.
- **Foto de perfil** — `User.pictureId` já existe no schema; falta upload/crop na UI.
- **Dados pessoais** — nome, e-mail, fuso horário (`User.timezone` já existe).
- **Gestão de plano** — upgrade/downgrade/renovação/cancelamento. Base de billing já
  existe (`billing.controller.ts`, `main.billing.component.tsx`) — avaliar se é reuso direto
  ou precisa de UI própria mais simples pro usuário final (vs. painel admin).
- **Contato com suporte** — canal de abertura de ticket/dúvida (a definir: e-mail direto,
  formulário, ou integração com ferramenta externa).
- **isSuperAdmin** (ver `User.isSuperAdmin`, bypass de limites de plano implementado
  2026-06-25 em `permissions.guard.ts` + `religare.service.ts`) é uma flag de plataforma,
  setada só via banco/script — NUNCA expor na UI de perfil nem aceitar via request do
  próprio usuário (vetor de escalação de privilégio).

**Onde encaixar:** não é MVP-crítico (link único/portal do cliente final não precisa disso),
mas é básico para qualquer usuário interno (Tipo A) usar o produto no dia a dia — sugestão:
puxar para o final da Fase 1/início da Fase 2, junto de outros itens de polimento de conta,
e não deixar para a última camada (CAMADA 11+) que é mais sobre agentes/automação.

**Reforço ao vivo (Felipe, 2026-06-25):** ao navegar `/settings` em busca de troca de senha,
achou a tela "bem precária em nomes, design, UI/UX" — labels em inglês não traduzidas
misturadas com PT ("Date Metrics", "Email Notifications", "Success/Failure/Streak Reminder
Emails"), e nenhuma separação visual entre configuração de ferramenta (Webhooks, Postagem
Automática, Conjuntos, Developers) e conta pessoal. Quando esta área for trabalhada, revisar
TODA a navegação de `/settings` (não só adicionar a aba de perfil), incluindo tradução
completa das labels existentes.

---

## CAMADA 3 — CRM SIMPLIFICADO (somente admin)

```
/hub/crm/
├── /clientes            → lista, busca, status, responsável
├── /clientes/novo       → cadastro
├── /clientes/[id]       → visão 360 (tabs: Projetos, Contatos, Interações,
│                          Materiais, Métricas, Observações internas)
├── /projetos            → todos os projetos
├── /projetos/[id]       → cadastro completo
└── /tarefas             → pendências internas
```

**Dummy data (seed):** Camila Caeron, PlanGroup, Nanda Biolchini, Plan10,
Gigantes pela própria natureza, Vocaccio (interno) — cada um com 3 rascunhos,
2 aguardando aprovação, 1 aprovado, briefing, redes fictícias, kanban, métricas
simuladas, oráculo do dia.

---

## CAMADA 4 — CADASTRO GLOBAL DE CLIENTE E PROJETO

Entidade central consultada pelos 3 sistemas e todos os agentes.

| Campo | Uso pelos agentes |
|-------|------------------|
| Nome, cliente vinculado | Identificação |
| Logo (upload) | Cedrico, Hagrid |
| Área de atuação | Todos |
| Redes sociais + @s | Percy, Arthur |
| Slogan | Hagrid, Hermione |
| Cores (primária + secundárias) | Cedrico, Flitwick |
| Tipografia | Cedrico, Flitwick |
| Produtos/Serviços | Hermione, Fred & George |
| Persona (nome + dores + desejos) | Hermione, Cedrico |
| Tom de linguagem (select) | Todos |
| Site / Bio link | Luna, Snape / Percy |
| CTA 1, CTA 2, CTA 3 | Hermione, Cedrico, Fred & George |
| Briefing livre | Todos |
| Análise vocacional vinculada (FK → Religare) | Sibila, Hagrid |
| Owner do projeto (FK → User) | Dashboard, Sincronário |
| Localidade + fuso horário | Sincronário, moon phases |

> **Regra crítica:** todo agente recebe o Context Pack do projeto antes de qualquer
> geração. A análise vocacional do owner tem peso nas tarefas criativas.

---

## CAMADA 5 — MEMÓRIA POR PROJETO

| Memória | Conteúdo | Storage |
|---------|----------|---------|
| `brand_memory` | Marca, tom, restrições, erros passados | pgvector |
| `content_memory` | Posts publicados, temas, aprovações | PostgreSQL + embeddings |
| `vocational_memory` | Briefing + análise cosmológica | PostgreSQL |
| `growth_memory` | Métricas, campanhas, SEO | PostgreSQL |
| `agent_memory` | Decisões dos agentes, contexto anterior | pgvector |
| `external_agent_context` | Context Pack → ChatGPT | JSON gerado |

**Context Pack** (≤ 2.000 tokens, gerado ao criar/atualizar projeto): identidade,
persona, CTAs, tom, exemplos aprovados, restrições, análise vocacional resumida.

---

## CAMADA 6 — APRENDIZADO COM PEDIDOS DE REVISÃO

```
Cliente pede ajuste → ReviewSignal → Dumbledore classifica (Haiku)
→ Hagrid avalia impacto (Sonnet, se relevante)
→ Padrão recorrente → memória compacta | Pontual → só histórico
```

| Tipo de sinal | Exemplo | Armazenamento |
|------|---------|---------------|
| Pontual | "Trocar essa imagem" | Histórico do conteúdo |
| Preferência leve | "Menos formal" | Candidato à memória |
| Regra de marca | "Nunca usar essa palavra" | brand_memory |
| Aprendizado criativo | "Hooks diretos performam" | content_memory |
| Restrição estratégica | "Não vender X agora" | project_memory |

**Anti-sobrecarga:** não salvar todo comentário como vetor; resumo semanal/mensal;
só padrões recorrentes; memórias com data/origem/confiança; operador aprova;
Context Pack ≤ 2.000 tokens.

---

## CAMADA 7 — DEPLOYMENT (SEM VPS — STACK GRATUITA)

```
Vercel (free)        → frontend + aprovar.vocaccio.com.br (route group)
Railway ($5/mês)     → backend NestJS
Supabase (free)      → PostgreSQL + pgvector, Auth, Storage, Realtime, backup
Upstash (free 10k/d) → Redis: cache + filas BullMQ
Temporal Cloud(free) → workers F3+ (scheduling Postiz)
Hostinger (já paga)  → apenas DNS
```

**Domínios:** vocaccio.com.br (LP) · app.vocaccio.com.br (dashboard) ·
aprovar.vocaccio.com.br (portal) · api.vocaccio.com.br (Railway).

Deploy: `git push` → CI/CD automático Vercel/Railway. `.env.production` só nos
dashboards. Backup diário via GitHub Actions → pg_dump → Supabase Storage.
**Migração futura (com receita):** Hostinger VPS + Caddy + Docker Compose.

---

## CAMADA 8 — POSTIZ COMO COCKPIT

**Usar direto:** agendamento 13 redes, calendário, publicação, histórico, upload,
OAuth por rede, métricas, workers/Temporal, webhooks self-host.

**Construir por cima:** UI Vocaccio (substituir frontend), dashboard mágico, cadastro
cliente/projeto, Context Pack + agentes HP, Sincronário, portal link único, CRM,
aprendizado com revisões, automações.

### 🔗 Conexões de APIs e Redes Sociais — por cliente (decisão arquitetural)

O modelo multi-tenant da Vocaccio prevê múltiplas empresas (clientes) por assinatura.
Portanto, as conexões OAuth a redes sociais (Instagram, LinkedIn, Facebook, etc.) e APIs
de terceiros devem ser **por cliente**, não por organização/conta.

**Regra:** cada `CrmClient` terá sua própria coleção de canais conectados (tabela
`clientChannel` ou similar, FK → `client.id`). Ao criar conteúdo ou publicar, o contexto
de qual cliente está ativo determina quais canais aparecem.

**Planos:** o limite de clientes/canais simultâneos é o discriminador dos planos pagos.
- **Starter:** até N clientes, M canais por cliente
- **Pro/Agency:** ilimitado ou limite elevado

**Impacto no Postiz:** a entidade `channel` do Postiz é por `organizationId`. Precisamos
de uma camada de indireção: cada `CrmClient` mapeia para sua própria `organization`
(sub-org) no Postiz, ou criamos uma tabela `clientChannel` que sobrescreve o contexto de
publicação. Definir a abordagem técnica no início da Fase 3 (Volatis/publishing).

---

## CAMADA 9 — AUTOMAÇÕES ESTILO MANYCHAT

```
MVP (F7):  Regras fixas + webhooks  (ex: "QUERO" → link; aprovou → Kanban+notifica;
           publicou → métricas+notifica; prazo → alerta)
F8:        Typebot (fluxos visuais, iframe no painel)
F8+:       Chatwoot (inbox unificada + handoff humano + CRM)
WhatsApp:  MVP notificações unidirecionais; futuro bidirecional Meta Cloud API oficial
           (Evolution API só laboratório; Rich627 plugin só canal interno OWNER)
```

---

## CAMADA 10 — SISTEMAS PRINCIPAIS

### 10.1 HUB + DASHBOARD MÁGICO

Menu 6 quadradinhos: Religare · Volatis · Augeo · Hub/Home · Clientes · Config
(não contratados: cadeado + CTA upgrade).

**Dashboard SEM Religare contratado:**
Métricas sociais (posts 30d, alcance, engajamento) · aprovações pendentes ·
publicações hoje · alertas · widget bloqueado com CTA "Conheça o Religare".

**Dashboard COM Religare contratado:**
Fase da Lua · Kin do Dia (Tzolkin) · Oráculo do Dia (banco curado: Rumi, Jung,
Lao Tzu, Alan Watts...) · Essência do Owner (2 arquétipos, kin natal, tipo HD) ·
Posts 30d / Alcance / Engajamento · gráfico 30/60/90d · aprovações pendentes ·
publicações hoje · alertas.

### 10.2 RELIGARE — Conexão com sua Essência Vocacional

**Módulo autônomo** — pode ser contratado separadamente. Dois modos de uso coexistem:

```
MODO INDIVIDUAL  → pessoa preenche os próprios dados e obtém sua leitura
MODO AGÊNCIA     → agência/terapeuta cria perfis para seus clientes/pacientes
```

O campo `context_type: 'agency' | 'therapy'` no workspace ajusta o vocabulário
das telas e do PDF gerado — sem duplicar lógica ou telas.

**Planos e limites:**

| Plano | Perfis Religare | Clientes sociais (Volatis) | Obs |
|-------|-----------------|---------------------------|-----|
| Individual | 1 (próprio) | — | Só leitura pessoal |
| Básico | 5 | 5 | Agência pequena / terapeuta solo |
| Intermediário | ilimitado | 50 | |
| Enterprise | ilimitado | ilimitado | |
| Admin | ilimitado | ilimitado | Equipe Vocaccio |

PDF 2 (Perfil de Marca) bloqueado no plano Básico → CTA upgrade.

**Plano Terapeuta** — profissionais de saúde mental e holísticos usam o mesmo
produto com `context_type: 'therapy'`: vocabulário clínico/holístico, "paciente"
no lugar de "cliente", sem seção de marca/negócio.

**Kin do dia no calendário de publicação (planejado 2026-06-25, pós-Tzolkin estável):**
Depois que o Tzolkin estiver estável/operante, mostrar o Kin de cada dia direto na tela
de calendário (`/launches`, `apps/frontend/src/components/launches/calendar.tsx` — a mesma
view de semana/mês/dia mostrada no print do Felipe) para ajudar a decidir a melhor data de
publicação também segundo o Tzolkin. Precisa de um **toggle de visibilidade** do Kin (ligar/
desligar a exibição) — não forçar pra quem não usa Religare/não quer esse contexto na
agenda. Avaliar se o toggle é por usuário (preferência salva) ou só on/off de sessão.

**Rotas:**

```
/religare                     → home (lista de perfis no modo agência/terapeuta,
                                ou perfil próprio no modo individual)
/religare/onboarding          → criar novo perfil
/religare/onboarding/[id]/link → gerar link sem login para o próprio preencher
/religare/perfil/[id]         → leitura completa (tabs abaixo)
/religare/perfil/[id]/exportar → gerar PDF 1 ou PDF 2
/religare/link/[token]        → formulário sem login para preenchimento externo
```

Tabs do perfil: **Essência** (arquétipos + vocacional) · **Tzolkin** (kin natal + kin do dia) ·
**Human Design** (tipo, autoridade, perfil, canais, gates definidos) ·
**Consulta** (chat com Sibila, oráculo do dia).

*Tabs futuras (pós-conclusão):* Astral · Numerologia · MBTI · Eneagrama.

**Cálculos — zero IA, zero API paga, zero microserviço:**

| Cálculo | Lib / Estratégia |
|---------|-----------------|
| Human Design (tipo, autoridade, perfil, gates) | `openhumandesign-library` + `sweph` (TypeScript nativo) |
| Tzolkin / Kin | Algoritmo puro TypeScript (~30 linhas) |
| 2 Arquétipos Jung | Questionário + scoring local (12 arquétipos) |
| Teste Vocacional | Questionário + scoring local (chamados ranqueados) |
| Fase da Lua | `astronomia` npm |
| Astrologia *(pós-conclusão)* | `sweph` — mesma lib já instalada |

Síntese narrativa final: **Sibila** (Sonnet + cache) — roda UMA vez ao fechar
o onboarding, resultado salvo no banco. Não regera a cada acesso.

**Os dois PDFs — "Passaporte de Essência":**

```
PDF 1 — Perfil Vocacional  (Religare puro)
  • 2 Arquétipos Jung
  • Kin natal + interpretação
  • Tipo HD, Autoridade, Perfil, Canais e Gates principais
  • Resultado do Teste Vocacional
  • Síntese narrativa (Sibila)

PDF 2 — Perfil de Marca  (Religare + negócio — plano Intermediário+)
  • Tudo do PDF 1
  • Negócio: segmento, público, tom de voz, pilares de conteúdo
  • Diretrizes de identidade visual
  • Palavras-chave de essência para copy
```

**Uso em agentes externos (sem gastar tokens internos):**

```
Heavy users  → Projeto Claude personalizado
               system prompt com instruções de copy/imagem autêntica
               usuário anexa PDF 1 ou PDF 2 por sessão

Light users  → GPT Custom Agent (ChatGPT)
               instruções configuradas na plataforma
               usuário anexa o mesmo PDF

O sistema Vocaccio apenas gera e hospeda os PDFs — zero token gasto no fluxo.
```

Specs: `/specs/religare/` — criar no início da Fase 5 (ou adiantada se Religare
for contratado antes do Volatis por algum cliente piloto).

### 10.3 VOLATIS

Rotas: /dashboard · /criar/carrossel (7 steps) · /criar/video (Lupin) ·
/criar/identidade (Hagrid + Flitwick) · /clientes/[id]/board+assets ·
/portal/[token]/ (feed, revisar/[id], historico, kanban, comentarios) ·
/calendario (Sincronário drag-and-drop: mês/semana/dia, painel Kin+Lua+fuso,
filtros) · /publicar (Postiz engine) · /vitrine ⛔ RESERVADO (flag OFF).

**Portal do cliente — permissões:** ver/aprovar/pedir ajuste/comentar/histórico/
kanban ✅ · criar post/editar briefing/integrar redes/ver outros clientes ❌.

**Construtor de carrosséis — Konva.js (browser-only, sem servidor):**

```
1. Mini-briefing inline (estilo system-prompt v4)
2. Cedrico (Sonnet+cache, INTERNO) → JSON {slides:[{headline,body,mediaSlot}],cta,legenda}
3. Editor Konva WYSIWYG: 10 slides (Capa + 8 + CTA), stage 1080×1350 (4:5),
   thumbnails 221×276, 3 layers/stage (background Rect | media Image | content Text)
4. Painel esquerdo (acordeões): Template (JSON troca visual) · Autofill ·
   Campos Globais (brand, @handle, copyright, avatar) · Texto (fonte, kerning,
   line-height, RGBA) · Word Highlight · Mídia (10 slots, drag-to-reorder,
   PNG/JPG/WebP/MP4) · Fundo por slide · CTA toggle · Proporção 4:5|9:16 ·
   Histórico (autosave + restaurar, Supabase)
5. Export: PNG canvas.toDataURL() · ZIP (JSZip) · PDF LinkedIn (jsPDF) ·
   MP4 Remotion (skill maestro / Charlie Weasley)
6. Preview Instagram: modal smartphone mockup, setas, dots
```

URL: `#/studio/[projectId]/[slideIndex]` (hash router compartilhável).

**30 Google Fonts (via @fontsource — sem CDN):**

| Categoria | Fontes |
|-----------|--------|
| Serif editorial | Playfair Display, Cormorant Garamond, EB Garamond, Merriweather, Libre Baskerville |
| Condensada/impacto | Barlow Condensed, Bebas Neue, Oswald, Anton, Black Han Sans |
| Sans moderna | Inter, Plus Jakarta Sans, Space Grotesk, DM Sans, Outfit |
| Geométrica | Raleway, Montserrat, Nunito, Poppins, Quicksand |
| Display especial | Abril Fatface, Righteous, Syne, Fredoka One, Clash Display |
| Script/cursiva | Dancing Script, Pacifico, Sacramento |
| Monospace | Space Mono, JetBrains Mono, Roboto Mono |

### 10.4 AUGEO

Rotas: /dashboard (KPIs) · /copy-lab (Hermione gera, McGonagall revisa) · /lp-lab ·
/lancamentos (Fred & George — 11 tipos: Semente, Interno, Meteórico, Relâmpago,
Perpétuo, Desafio, Imersão, CPL, Lista de espera, Comunidade, Evento ao vivo) ·
/seo (keywords FireCrawl, on-page, AEO, GEO) · /concorrentes (Snape) ·
/campanhas (Moody) · /relatorios (PDFs DS Vocaccio).

---

## CAMADA 11 — ECOSSISTEMA DE AGENTES HARRY POTTER

**Dois tipos:** CLAUDE SYSTEM (interno, ops pesadas, sem UI — output vai ao portal de
aprovação) × WEB (Next.js API route com streaming, interface no dashboard).

### Agentes CLAUDE SYSTEM

| # | Nome | Modelo | Função | Trigger |
|---|------|--------|--------|---------|
| 1 | **Dumbledore** | Sonnet (router) | Orquestrador, roteamento, token budget, Ruflo | Toda sessão |
| 5 | **Hagrid** | Sonnet + cache | Guardião da marca — valida todo output | Pré-aprovação |
| 7 | **Lupin** | Sonnet + mcp-video | Edição de vídeo, Reels, cortes | Demanda |
| 8 | **Dobby** | Haiku | Transcrição (Groq), legendas burn | Pós-Lupin |
| 12 | **Arthur Weasley** | Haiku + Composio | Integrações, Drive, webhooks | Automático |
| 13 | **Bill Weasley** | Sonnet | Engenharia, front-end, debug | Dev interno |
| 14 | **Charlie Weasley** | Sonnet | Remotion, MP4 carrosséis (skills maestro, hyperframes) | Export vídeo |
| 16 | **Snape** | Sonnet + FireCrawl | Intel competitiva | Demanda |
| 17 | **McGonagall** | Sonnet + cache | Revisão de qualidade — última camada | Pré-aprovação |
| 18 | **Flitwick** | Sonnet + canvas-design | Direção de arte, templates Konva | Demanda |

### Agentes WEB

| # | Nome | Modelo | Função | Onde |
|---|------|--------|--------|------|
| 2 | **Sibila** | Sonnet + cache | Religare — síntese cosmológica, chat | /religare |
| 3 | **Hermione** | Sonnet + cache | Copy Lab | /augeo/copy-lab |
| 4 | **Cedrico** | Sonnet + cache | Carrosséis — JSON → Konva | /volatis/criar/carrossel |
| 6 | **Fred & George** | Sonnet | Lançamentos | /augeo/lancamentos |
| 9 | **Luna** | Sonnet + FireCrawl | SEO/AEO/GEO | /augeo/seo |
| 10 | **Moody** | Sonnet | Tráfego/ads Meta + Google | /augeo/campanhas |
| 11 | **Percy** | Haiku | Publisher multi-plataforma | /volatis/publicar |
| 15 | **Ron Weasley** | Haiku | Kanban, tarefas | /hub (sidebar) |
| 19 | **Ginny Weasley** | Sonnet | Estratégia social, timing | /volatis/dashboard |
| 20 | **Sprout** | Haiku | Growth orgânico | /augeo/seo |

### Fluxo System → Web

```
Claude System produz → Supabase Storage + registro no banco
→ portal /volatis/portal/[token] exibe na fila
→ Aprovar | Pedir ajuste | Comentar
→ Aprovado: Percy agenda → Postiz publica → métricas
→ Ajuste: ReviewSignal → Dumbledore roteia (Hagrid/Hermione/Cedrico)
```

### Roteamento Dumbledore (com Ruflo)

```
Haiku  → routing, classificação, formatting, < 200 tokens saída
Sonnet → criação, análise, síntese, pesquisa (padrão)
Opus   → identidade visual estratégica, síntese cosmológica profunda (raro)
Cache  → obrigatório em system prompts > 1.000 tokens
Ruflo  → swarm_init (paralelo) · agent_spawn (delegar) · memory_store/search (HNSW)
```

---

## CAMADA 12 — AGENTES EXTERNOS (ChatGPT) E INTERNOS

Cedrico opera **internamente** (Sonnet + cache + system prompt v4 em
`volatis-content/system-prompt-maquina-carrosseis-v4.md`). ChatGPT externo =
fallback manual + geração de imagens.

**Internos:** Cedrico (JSON carrossel) · Hermione (copy) · Fred & George (cronograma)
· Dobby (legenda+hashtags). **Externos:** Imagem (upload no slot de mídia) ·
Reels/Legenda (insumo do Dobby). Externos recebem Context Pack completo.

**Estratégia de agentes externos com Religare:**
O PDF gerado pelo Religare (PDF 1 ou PDF 2) é o veículo de contexto para IAs externas.
Usuário anexa o PDF numa sessão Claude ou GPT e obtém copy/imagem dentro das
diretrizes de essência — sem gastar tokens internos do sistema.

- Heavy users → Projeto Claude (system prompt de copy + PDF anexado)
- Light users → GPT Custom Agent (instruções + PDF anexado)

---

## CAMADA 13 — VÍDEO (LUPIN + mcp-video)

Base: KyaniteLabs/mcp-video (119 tools, Apache 2.0). Requisito: FFmpeg ✅ instalado.

```
Upload → análise cenas+silêncio → transcrição (Dobby/Groq) → sugestão 3-8 cortes
→ operador seleciona → resize 9:16 + legenda queimada + áudio normalizado
→ thumbnails → checkpoint obrigatório → pacote por plataforma
```

---

## CAMADA 14 — LP DE VENDA + LOGIN

LP pública com login no header. Assets: `Assets/logo-vocaccio-sem-fundo.png` + DS
Vocaccio. Referências: academypass.ai + circle.so/br.
Estrutura: Hero Orbital → Manifesto Soul 2 Soul → 3 sistemas (cards glass) →
dashboard demo → fluxo Essência→Conteúdo→Crescimento → social proof → planos/CTA → footer.

---

## CAMADA 15 — SKILLS E MCPs

**Skills:** maestro (Charlie+Lupin) · video-use (Lupin) · hyperframes:* (Charlie/Bill)
· canvas-design (Flitwick) · pdf (Sibila) · docx/pptx (Hermione) · code-review (McGonagall).

**MCPs:** Ruflo ✅ registrado (`claude mcp add ruflo -- cmd /c ruflo mcp start`) ·
firecrawl-mcp-server (Snape/Luna) · mcp-seo-marketing (Luna) · KyaniteLabs/mcp-video
(Lupin/Dobby) · Google Drive Composio (Arthur) · Postiz MCP (Percy/Arthur).

**Ruflo no Vocaccio:** swarm_init (Cedrico+Flitwick paralelo; Snape+Luna paralelo;
Fred&George+Hermione+Moody sequência) · memory_store/search HNSW complementa pgvector.

---

## CAMADA 16 — INSTALAÇÕES E CONTAS — ✅ CONCLUÍDO (Fase 0, 2026-06-06)

### Local (verificado)

| Ferramenta | Versão real | Status |
|-----------|-------------|--------|
| Node.js | v24.14.1 | ✅ (Postiz pede 22.x — funciona com warning; nvm-windows se necessário) |
| pnpm | 10.6.1 | ✅ |
| Git | 2.54.0 | ✅ |
| FFmpeg | 8.1.1 | ✅ |
| Ruflo | 3.10.37 + MCP conectado | ✅ |
| Claude Code CLI | instalado | ✅ |
| turbo global | instalado (desnecessário — Postiz não usa) | — |

### Cloud (todas criadas, região São Paulo onde aplicável)

| Serviço | Status | Detalhe |
|---------|--------|---------|
| GitHub | ✅ | fork `felipeweb7/vocaccio-ecosystem` |
| Vercel | ✅ | conectado ao GitHub |
| Supabase | ✅ | ref `xtjzfypktrpepwhzbvfb` · Data API ON · auto-expose OFF · auto-RLS ON |
| Railway | ✅ | conta criada (deploy na F1+) |
| Upstash | ✅ | `funny-snake-143891` · eviction OFF (protege filas BullMQ) |
| Groq | ✅ | API key |
| Firecrawl | ✅ | API key |
| Composio | ⏳ | criar quando Arthur entrar (F3+) |
| Temporal Cloud | ⏳ | criar na F3 |

`.env` + `.env.local` preenchidos na raiz do repo (NestJS lê `.env`, Next lê `.env.local`).
Credenciais backup: `...\OneDrive\...\Automação\sec.txt` (fora do repo — migrar para
gerenciador de senhas). **Senha do DB tem `@` → `%40` na URL.**

### Fora do escopo MVP

~~Playwright p/ carrosséis~~ (canvas nativo) · ~~MinIO~~ (Supabase Storage) ·
~~VPS~~ (stack gratuita) · ~~Docker Desktop~~ (opcional).

### ✅ Risco do OneDrive RESOLVIDO (2026-06-10)

Projeto movido para `C:\dev\vocaccio` (fora do OneDrive) via robocopy — 391k arquivos,
3,29GB, sem reinstalar dependências. Pastas antigas arquivadas como `_ARQUIVADO-*` em
`Automação\` (podem ser deletadas manualmente após confirmação de que tudo funciona).

---

## CAMADA 17 — FASEAMENTO (v6)

Cada fase termina com: specs da fase + checklist aceite + testes mínimos + revisão
segurança + `/phases/checkpoint-faseN.md` salvo.

```
Fase 0  — Setup + arquitetura                       ✅ CONCLUÍDA (2026-06-06)
Fase 1  — Auth + CRM + cliente/projeto + seed + dashboard base   ← EM ANDAMENTO
Fase 2  — Portal link único + Kanban + aprovação
Fase 3  — Volatis/Postiz cockpit + Sincronário + publicação (+ Temporal)
Fase 3.5 — Revisão geral de FE / coerência visual   ← APÓS validar o criador de carrosséis
Fase 4  — Memória por projeto + aprendizado com revisões
Fase 5  — Religare + onboarding + cálculos HD/Tzolkin/Arquétipos + PDFs + Sibila
Fase 6  — Augeo + lançamentos + SEO/AEO/GEO
Fase 7  — Automações regras fixas + webhooks
Fase 8  — Typebot + Chatwoot + WhatsApp bidirecional
Fase 9  — Vídeo Lupin + mcp-video + Dobby
Fase 10 — Vitrine Netflix ⛔ somente após comando explícito
Fase ∞  — Interface agentes em tempo real ⛔ pós-conclusão
Fase G  — Growth Engine Vocaccio (escala p/ agências: front + back agentes) ⛔ penúltima
Fase H  — White-Label Growth Hub (plataforma revendável: CRM vendas, inbox,
          pagamentos, API, mobile, white-label marca-da-agência) ⛔ ÚLTIMA FASE
Pós-conclusão — MBTI + Eneagrama no Religare ⛔ pós-conclusão
Pós-conclusão — Astrologia natal no Religare (`sweph` já instalado) ⛔ pós-conclusão
```

---

### Fase 3.5 — Revisão geral de FE / coerência visual (escopo)

Disparada **após** a validação do criador de carrosséis. Objetivo: dar um ar atualizado e
coerente às novas interfaces, eliminando a inconsistência visual antes de virar bola de neve.
Princípio-guia (ver [[feedback-vocaccio-ui-host-theme]] na memória):

- **Estrutura = Postiz dark (`--new-*`); COR/acentos = Vocaccio sempre (`--voc-*` aurora/rosa)**,
  nunca o roxo `--new-btn-primary` do Postiz. Esquecer o Postiz como prioridade visual.
- **Sistema de design unificado:** definir tokens de acento Vocaccio semânticos e um conjunto
  pequeno de primitivos (botão, input, select, toggle, card, accordion, painel) reutilizados em
  TODAS as telas novas (CRM, hub, Volatis, portal) — parar de hand-rolar componentes divergentes.
- **Marca:** logo = símbolo aurora suave oficial (`/vocaccio-symbol.png`); favicons Vocaccio
  (svg/png/ico) — concluído nesta sessão, validar em todas as telas.
- **Processo:** toda mudança de UI verificada no browser (loop visual via Claude in Chrome),
  não só typecheck.
- Auditar telas já entregues (Fases 1–3) e padronizar contra o sistema unificado.

---

### Fase G — Growth Engine Vocaccio (ÚLTIMA FASE — anotação/visão)

> **Status:** anotação de visão para a última fase. **Não implementar agora** —
> registrada aqui para guiar decisões de arquitetura ao longo de todas as fases
> anteriores (não fechar portas para dados/métricas que essa fase vai consumir).

**Tese.** Camada de **escala/growth focada em agências** dentro do Vocaccio HUB que
combina **front (web browser)** com **back (operação direta com agentes no Claude)** —
fechando o ciclo completo do ecossistema Soul 2 Soul como um fluxo contínuo:

```
ESSÊNCIA          →   FUNIL / AUTOMAÇÃO   →   RESULTADOS / MÉTRICAS   →   ESCALA / GROWTH
(Religare)            (Volatis + Augeo +      (analytics, atribuição,     (Fase G — esta:
 vocação, tom,         automações,             métricas por cliente/        metodologia própria
 copy, ideias)         publicação)             campanha)                    de crescimento)
```

A Fase G não inventa um produto novo: ela **conecta e operacionaliza** o que as fases
anteriores já produzem, transformando dados em decisões de otimização **data-driven sem
perder a essência** (a vocação/Religare permanece o filtro de toda recomendação).

**Princípios:**
- **Metodologia própria de crescimento** da Vocaccio — inspirada em referências de
  growth, mas autoral e ancorada na essência (não copiar playbook genérico).
- **Riqueza de dados e métricas** via integrações (analytics de redes, atribuição de
  funil, métricas de campanha/CAC, conversões) para decisões data-driven.
- **Front + back combinados:** dashboards de growth no browser **+** agentes de growth
  no back (orchestrator/Claude) executando análise, recomendação e otimização contínua.
- **Por cliente (multi-tenant):** métricas, funis e recomendações sempre no escopo do
  `CrmClient` ativo (coerente com a decisão de canais por cliente da Camada 8).
- **Sem perder a essência:** toda otimização passa pelo filtro vocacional/marca
  (Hagrid + Religare) antes de virar recomendação — growth autêntico, não vaidade.

**Referências de pesquisa (inspiração — NÃO fonte de verdade; criar metodologia própria):**
- skills/agentes de growth: `github.com/realjaymes/marketingagentskills`
- skills de growth p/ SaaS: `github.com/ekinciio/saas-growth-marketing-skills`
- metodologia de growth (BR): `picogrowth.com.br`

> Os materiais de concorrentes anexados na origem desta anotação são **apenas
> inspiração visual/conceitual** e **não devem ser tratados como base de informação**.

**A definir quando a fase chegar:** métricas e fontes de integração; agentes de growth
(novos papéis HP ou extensão de Ginny/Sprout/Moody); contrato front↔back; como a
metodologia própria é versionada e aplicada por plano (provável diferencial Agency/Pro).

---

### Fase H — White-Label Growth Hub (ÚLTIMA FASE — anotação/visão)

> **Status:** anotação de visão para a ÚLTIMA fase. **Não implementar agora** — registrada
> aqui para guiar decisões de tenancy/branding/billing ao longo de TODAS as fases anteriores
> (não fechar portas para o que essa fase vai consumir). Decidida em 2026-06-20.
> Referência conceitual: helenacrm.com/white-label-para-agencias-de-marketing (apenas
> inspiração — NÃO fonte de verdade).

**Tese.** A Vocaccio deixa de ser só ferramenta da agência e vira **plataforma SaaS
revendável**: a agência (cliente pagante) revende um Growth HUB completo aos *seus próprios
clientes* — marketing, produtores de conteúdo, terapeutas — sob a **marca da agência**.
A Fase G **otimiza** (data-driven growth); a Fase H **comercializa** (plataforma white-label).
São teses distintas, por isso fases distintas.

**Modelo de tenancy — 3 níveis (decisão estrutural, reservar desde já):**

```
Vocaccio (plataforma)
  └─ Agência  (cliente pagante — assina um plano Vocaccio)
       └─ CrmClient  (cliente da agência — AGORA é tenant: login próprio + marca da agência)
            └─ Leads/contatos do CrmClient  (público final — CRM de vendas, inbox, broadcast)
```

- O nível `CrmClient` evolui de "registro no CRM admin" para **tenant com login próprio**
  — encaixa no role `CLIENT_USER` já reservado na **Camada 2** desde a Fase 1.
- Coerente com **canais por cliente** (Camada 8, `crmClientId` em `Integration`) — a mesma
  indireção multi-tenant que já está sendo implementada agora é a fundação desta fase.
- **Não fechar portas nas fases anteriores:** nada de branding Vocaccio hard-coded; limites
  de plano pensados em 3 níveis (agência → nº de CrmClients → nº de leads/canais); toda
  entidade nova com `crmClientId` no escopo.

**Branding white-label — decisão confirmada (2026-06-20):**
A marca que o cliente-do-cliente vê é a **da AGÊNCIA** (logo, cores, domínio próprio).
Rodapé discreto **"powered by Vocaccio"**. NÃO é white-label para a agência (a agência
sabe que é Vocaccio) — é white-label para os clientes DA agência. Provável gate de plano:
white-label total com domínio próprio liberado em Agency/Enterprise (a definir).

**Funcionalidades (mapa Helena → plano):**

| Funcionalidade | Origem no plano | Esforço Fase H |
|----------------|-----------------|----------------|
| Central de Atendimento (inbox omnichannel) | Camada 9 / F8 (Chatwoot) | reaproveitar + white-label |
| CRM | Camada 3 (hoje admin interno) | promover a CRM vendável por tenant |
| Automação / Chatbot / ManyChat próprio | Camada 9 (F7 regras → F8 Typebot) | reaproveitar + white-label |
| Agentes de IA (p/ o lead do cliente) | Camada 11 (HP, hoje internos) | novo papel: bot voltado ao público final |
| Relatórios | Augeo /relatorios | white-label por tenant |
| **Rastreio do Lead** (pipeline de vendas) | — NOVO | CRM de vendas (estágios, atribuição) |
| **Disparo em Massa** (broadcast WA/email) | — NOVO | Meta Cloud API + provedor email |
| **Pagamentos** (checkout/cobrança) | — NOVO | billing dos clientes-dos-clientes |
| **API pública + Webhooks** | webhooks ✅ / API ✗ | developer platform (chaves, escopos, docs) |
| **Aplicativo Mobile** | — NOVO | provável PWA antes de app nativo |

**A definir quando a fase chegar:** gateway de pagamento (Stripe vs. nacional p/ PIX);
estratégia mobile (PWA vs. React Native vs. Expo); modelo de billing em cascata (Vocaccio
cobra a agência, agência cobra o cliente — repasse ou markup); domínios personalizados
(CNAME por tenant + TLS automático); isolamento de dados (RLS em 3 níveis); quais agentes
HP são expostos ao público final e com que guarda-corpos (Hagrid no loop).

**⚠️ NÃO FECHAR PORTAS — impacto nas fases anteriores (revisão estrutural 2026-06-20):**

Cada item abaixo é uma decisão a tomar *quando a fase chegar*, mas com a Fase H em mente
para evitar migração dolorosa. Ordenado por risco.

| Fase | Risco | O que fazer já (barato) para não travar a Fase H |
|------|-------|--------------------------------------------------|
| **F2 — Portal aprovação** | 🔴 alto | É EXATAMENTE a tela que o CrmClient-tenant mostrará sob a marca da agência. Branding (logo/cores/nome) deve vir de **dado** (do `Client`/`Project`), nunca constante Vocaccio. O domínio `aprovar.vocaccio.com.br/[token]` deve ser tratado como base trocável (preparar p/ CNAME por tenant no futuro), não espalhado hard-coded. |
| **F3 — Canais por cliente** | 🔴 alto | **Estado real (auditado 2026-06-20):** `Integration.crmClientId` é hoje uma **coluna-etiqueta/filtro** sobre o `organizationId` do Postiz — o CrmClient NÃO é tenant de 1ª classe. Funciona p/ a F3, mas não constrói em direção à Fase H. **Salto da Fase H** = promover `Client` a tenant (mapear p/ sub-org Postiz ou equivalente), não estender a tag. Decidir o caminho de promoção antes de espalhar lógica que assuma "Integration pertence à org, crmClientId é só view". |
| **F8 — Inbox/Chatbot/WhatsApp** | 🟠 médio | O "ManyChat próprio" white-label briga com **iframe** de Typebot/Chatwoot (trazem a marca deles). Decidir cedo: self-host com branding total, ou construir nativo. WhatsApp/Meta Cloud API precisa de **credencial por tenant** (cada CrmClient com seu número), não uma conta global. |
| **F6 — Relatórios (Augeo)** | 🟠 médio | PDFs hoje saem com DS Vocaccio hard-coded. Gerar branding do relatório a partir de **dado do tenant** (mesma regra do portal). |
| **F7 — Automações/Webhooks** | 🟡 baixo | Regras ("QUERO→link") e segredos de webhook devem ter escopo `crmClientId` desde já. É a semente da **API pública** da Fase H (chaves/escopos por tenant). |
| **F1 — Modelo de dados** | 🟡 baixo | `CLIENT_USER` já reservado (Camada 2) ✅. `Client` hoje tem `name/email/segment/website/status/notes` — **sem branding, sem vínculo User↔Client, sem limites**. Faltam: campos de **branding no `Client`** (logo/cores/**domínio**/nome público — hoje só no `Project`), **membership User↔Client** (login do tenant) e campo nullable de **limite de leads/contatos**. **Momento natural de adicionar:** a fatia "briefing de marca no lado Volatis/CRM Client" (roadmap Religare) — o mesmo brand-data alimenta geração de conteúdo E o portal white-label. NÃO criar branding em dois lugares. |
| **F4 — Memória / F-G — Growth** | 🟡 baixo | Garantir `crmClientId` no escopo de toda memória/métrica (RLS em 3 níveis). Métricas agregam: lead → CrmClient → agência. Apenas aditivo se o escopo já existir. |

---

## CAMADA 18 — DECISÕES CONFIRMADAS (inalteradas desde v5)

| Decisão | Escolha |
|---------|---------|
| Auth interno | ✅ Login/senha (argon2id) |
| Auth cliente MVP | ✅ Link único livre (sem login) |
| Auth cliente futuro | ✅ CLIENT_USER (schema preparado desde F1) |
| Chamado Vocacional | ✅ 7-10 perguntas → 3-5 chamados ranqueados |
| Eneagrama | ⛔ Pós-conclusão (fora do MVP do Religare) |
| MBTI | ⛔ Pós-conclusão (fora do MVP do Religare) |
| Astrologia natal | ⛔ Pós-conclusão (`sweph` já instalado quando chegar) |
| Base Volatis | ✅ Fork do Postiz |
| Agente Religare | ✅ Sibila (Sonnet + cache — roda 1x no onboarding, salva no banco) |
| Religare modos | ✅ Individual + Agência + Terapeuta (`context_type`) |
| Religare PDFs | ✅ PDF 1 Vocacional (todos) · PDF 2 Marca (Intermediário+) |
| Religare HD stack | ✅ `openhumandesign-library` + `sweph` — TypeScript nativo, sem microserviço |
| Religare limites | ✅ 1/5/ilimitado/ilimitado (individual/básico/intermediário/enterprise) |
| Clientes sociais limites | ✅ 5/50/ilimitado (básico/intermediário/enterprise) |
| Agentes externos | ✅ PDF anexado em Claude Project (heavy) ou GPT Agent (light) |
| Guardião da marca | ✅ Hagrid |
| Carrosséis motor | ✅ Konva.js (browser-only) |
| Carrosséis agente | ✅ Cedrico interno (Sonnet + cache; prompt v5 = emite JSON do schema, não HTML/Playwright — ver `system-prompt-maquina-carrosseis-v5-delta.md`) |
| Carrosséis export PNG | ✅ canvas.toDataURL() — zero servidor |
| Carrosséis export MP4 | ✅ Remotion (maestro / Charlie Weasley) |
| Lançamentos | ✅ Fred & George |
| Publisher | ✅ Percy |
| Vídeo edição | ✅ Lupin + KyaniteLabs/mcp-video |
| Hospedagem MVP | ✅ Vercel + Railway + Supabase (gratuito) |
| Hospedagem futuro | ✅ Hostinger VPS + Docker (com receita) |
| Domínio aprovação | ✅ aprovar.vocaccio.com.br/[token] |
| ManyChat MVP | ✅ Regras fixas + webhooks |
| ManyChat futuro | ✅ Typebot + Chatwoot |
| WhatsApp produção | ✅ Meta Cloud API oficial |
| Vitrine Netflix | ✅ Reservada, flag OFF |
| Agentes real-time | ✅ Pós-conclusão |
| White-Label Growth Hub | ✅ Fase H (ÚLTIMA) — plataforma revendável, separada da Fase G |
| Tenancy white-label | ✅ 3 níveis: Vocaccio → Agência → CrmClient (tenant c/ login) → leads |
| Marca white-label | ✅ Marca da AGÊNCIA + rodapé "powered by Vocaccio" (não da Vocaccio) |
| Orquestração | ✅ Ruflo + Dumbledore |
| Dummy data | ✅ Camila, PlanGroup, Nanda, Plan10, Gigantes, Vocaccio |
| LP referências | ✅ academypass.ai + circle.so/br |

## SPECS/ASSETS QUE EXISTEM (não recriar — agora em `docs/referencias/` no repo)

**Design System (2 documentos complementares):**
- `docs/referencias/vocaccio-design-system.md` ← **PRINCIPAL** (2026-06-10): marca,
  essência, paleta, tipografia, fotografia, diretrizes UI/UX, tom de voz.
  Direciona TODA a parte visual do projeto.
- `docs/referencias/vocaccio-design-system-ui-tokens.md` ← complemento técnico:
  tokens, botões, formulários, hero orbital, motion, checklist de implementação.

**Volatis/carrosséis:**
`docs/referencias/volatis-content/system-prompt-maquina-carrosseis-v4.md` (+ design-system,
principios-design, banco-de-headlines, filtro-editorial, manual-de-qualidade, referencias)
· `docs/referencias/analise-completa-maquina-de-carrosseis.txt`
· `docs/referencias/analise-tecnica-maquina-de-carrosseis.md`
· `docs/referencias/Exemplo-de-criador-de-carrosseis-em-browser.png`
· `docs/referencias/Assets/` (logos + favicon Vocaccio)

---

## CAMADA 19 — SETUP LOCAL — ✅ CONCLUÍDO (ver checkpoint-fase0.md)

Comando para retomar dev:
```powershell
cd C:\dev\vocaccio
pnpm --filter ./apps/frontend run dev    # http://localhost:4200
```

## CAMADA 20 — DEPLOY VERCEL/RAILWAY (executar na F1+, guia no plano v5)

Resumo: Vercel → Import repo → Root Directory `apps/frontend` → env vars → domínio
CNAME na Hostinger. Railway → Deploy from GitHub → `apps/backend` → env vars →
api.vocaccio.com.br. ⚠️ ADMIN_EMAIL/PASSWORD nunca na Vercel — seed local.

## CAMADA 21 — PERFORMANCE (estratégia por fase)

F0-2 dev speed > perf · F3: thumbnails Konva estáticos via toDataURL (só slide ativo
com stage vivo), IntersectionObserver, @fontsource dynamic import, export em Web
Worker, autosave debounce 2s, dynamic imports (konva, remotion, swisseph), next/image
· F4: pgBouncer, índices (projects.clientId, content.projectId+status, pgvector
ivfflat), sem N+1, Context Pack no Redis TTL 1h · F5+: BullMQ p/ ZIP/PDF/transcrição,
ISR na LP · F6+: Vercel Analytics, Sentry free, alerta LCP > 3s.

---

**Estado atual: Fase 0 ✅ concluída · Fase 1 (Auth + CRM) em andamento.**
Cada sessão: ler `/phases/checkpoint-faseN.md` mais recente antes de qualquer coisa.
