# Religare — Inventário & Contingência (lado Claude Code)

Status: inventário do baseline real + plano de contingência para desenvolvimento paralelo
Data: 2026-07-02
Autoria: Claude Code (mantenedor de `C:\dev\vocaccio`)
Contraparte: Codex (`C:\dev\vocaccio-codex\docs\religare\*`, somente leitura)

> Este documento **não autoriza e não executa** integração, migração de schema,
> deploy, seed, upload ou qualquer escrita em produção. É um retrato do código
> real que mantenho, para comparação futura contra o plano do Codex.

---

## 1. Baseline e estado

### 1.1 Repositório principal (fonte de verdade do lado Claude)

- Caminho: `C:\dev\vocaccio`
- Branch: `fix/voc-idor-project-content`
- Commit (HEAD): `6621201c9834b7ed3cfe2f15aedaa6070fb9db64`
- **É exatamente o baseline que o Codex consultou em 2026-07-01.**

Verificação de identidade dos documentos-fonte (SHA-256 recomputado hoje, bate
com o registrado no `README.md` do Codex):

| Documento | SHA-256 (hoje) | Confere |
| --- | --- | --- |
| `docs/Aprimoramento-Religare.md` | `4CB01845DA1CFF5FA9C214E895B692FA72A3D170E531DF226204D4EBA4705367` | ✅ |
| `docs/BUSINESS-PLAN.md` | `5D4CF02C1202ACDB8F3797884982795495570EB3886D495213894EB619083732` | ✅ |

### 1.2 Sessão em worktree (onde este doc foi produzido)

- Este trabalho rodou em `C:\dev\vocaccio\.claude\worktrees\kind-haslett-28b375`,
  branch `claude/kind-haslett-28b375`, commit `7ad6865f` (limpo).
- **O código Religare inspecionado foi lido de `C:\dev\vocaccio` @ `6621201c`**,
  não do worktree, para que o inventário reflita o baseline correto.
- O worktree está limpo; o repo principal tem mudanças locais **não relacionadas
  ao Religare** (redesign de layout/tokens/CRM) + os `docs/*.md` do Religare não
  rastreados. Todas preservadas — nada foi alterado.

### 1.3 Regra de baseline para comparações futuras

Qualquer comparação Codex↔Claude posterior deve declarar novo commit, data e
`git status --short`. "O código atual" sem hash não é evidência (mesma regra do
`CONTINGENCIA-INTEGRACAO.md` §3).

---

## 2. Capacidades realmente implementadas (rotas → arquivos)

Módulo registrado em `apps/backend/src/api/api.module.ts:73` (controller) e
`database.module.ts:111-112` (service + repository).

### 2.1 API HTTP — `apps/backend/src/api/routes/religare.controller.ts`

Base: `/hub/religare`. Autorização por `@VocaccioRoles(...)` (RBAC por org da
sessão, **não do body** — bom). `org` vem de `@GetOrgFromRequest()`.

| Método | Rota | Papéis | O que faz |
| --- | --- | --- | --- |
| GET | `/context` | OWNER/OPERATOR/EDITOR/VIEWER_INTERNAL | lê `religareContext` da org (`agency`\|`therapy`, default `agency`) |
| PUT | `/context` | OWNER/OPERATOR | grava contexto |
| GET | `/profiles` | READ_ROLES | lista paginada (search + page) |
| GET | `/profiles/:id` | READ_ROLES | detalhe |
| GET | `/experts/:expertId/profile` | READ_ROLES | perfil por expert (1:1) |
| POST | `/profiles` | OWNER/OPERATOR | cria (aplica limite por plano) |
| PUT | `/profiles/:id` | OWNER/OPERATOR | atualiza dados + `brandProfile` |
| POST | `/profiles/:id/questionnaire` | OWNER/OPERATOR/EDITOR | submete respostas + **computa tudo síncrono** |
| POST | `/profiles/:id/recompute` | OWNER/OPERATOR/EDITOR | recomputa a partir das respostas salvas |
| DELETE | `/profiles/:id` | OWNER | soft-delete |

### 2.2 Camada de negócio — `.../prisma/religare/religare.service.ts`

- `createProfile`: checa `countProfiles` vs `religareProfileLimit(tier)`; super
  admin ignora limite.
- `_computeAndPersist` (núcleo): scoring de arquétipos + vocacional/ikigai →
  Tzolkin (`kinForDate`) → fase lunar → **geocode on-demand se faltarem coords**
  → astrologia (try/catch → `null`) → Human Design (try/catch → `null`) →
  síntese textual → `buildDNA` → grava tudo e seta `status: 'COMPLETE'`.
- `getContext`/`setContext`: contexto por organização.

### 2.3 Repositório — `.../prisma/religare/religare.repository.ts`

- `PAGE_SIZE = 20` fixo; `listProfiles` faz `skip/take`; `countProfiles`
  retorna total; ambos filtram `deletedAt: null`.
- `PROFILE_LIST_SELECT` (leve) vs `PROFILE_DETAIL_SELECT` (com todos os blobs
  JSON) — separação de listagem/detalhe já existe.
- `saveQuestionnaireResults` força `status: 'COMPLETE'`.

### 2.4 Motores de cálculo — `libraries/helpers/src/utils/religare/`

TypeScript puro / determinístico, salvo geocode e ephemeris:

| Arquivo | Função | Dependência externa |
| --- | --- | --- |
| `tzolkin.ts` | Kin Dreamspell (âncora 26/07/1987 = Kin 34, contagem em UTC) | nenhuma |
| `moon.ts` | fase lunar | nenhuma |
| `archetypes.ts` | scoring de arquétipos | nenhuma |
| `vocational.ts` | scoring vocacional + Ikigai | nenhuma |
| `signs.ts` | grau eclíptico → signo (PT) | nenhuma |
| `astrology.ts` | mapa natal tropical/Placidus | `circular-natal-horoscope-js` 1.1.0 (Moshier, sem build nativo) |
| `hd.ts` + `hd-data.ts` | Human Design | **reusa `computeNatalChart`** (mesma ephemeris, sem chamada externa nova) |
| `synthesis.ts` | texto de síntese determinístico | nenhuma |
| `dna.ts` | `ReligareDNA` (taxonomia temática) | nenhuma |
| `themes.ts`, `types.ts` | tipos/temas | nenhuma |
| `fragments/`, `export/markdown.ts` | fragmentos + export markdown | nenhuma |

- Geocoding: `.../prisma/religare/religare-geocode.ts` — 1 chamada keyless ao
  Open-Meteo (host hardcoded, place URL-encoded, `AbortController` 4 s, falha →
  `null`). Coords resolvidas são persistidas (resiliente a outage futuro).

### 2.5 Frontend — `apps/frontend/src/…/hub/religare/`

- Páginas: `hub/religare/page.tsx`, `/onboarding/page.tsx`,
  `/perfil/[id]/page.tsx`.
- Componentes: `religare-home`, `religare-onboarding`, `religare-profile`,
  `religare-astrology-tab`, `religare-human-design-tab`, `religare-essence-widget`.
- Hooks SWR: `use-religare-profiles`, `use-religare-profile`,
  `use-religare-mutations`, `use-religare-context` (cada um em hook próprio,
  conforme regra do projeto).
- Export PDF: `religare-pdf-export.ts` (jsPDF).
- Vocabulário/marca: `religare-vocabulary.ts`.
- Seed dev: `scripts/seed-felipe-religare.ts` (findFirst → update|create; **um
  perfil só**, para dev local — não é seed de produção).

---

## 3. Contrato, schema, versão/licença, testes

### 3.1 Schema Prisma — `model ReligareProfile` (schema.prisma:814)

Tudo numa linha só, com vários blobs JSON (confirma a crítica do Codex §2):

```prisma
id, orgId, expertId (@unique), name,
birthDate?, birthTime? (String "HH:mm"), birthPlace?, birthLat?, birthLng?, birthTz?,
answers Json?, kinNatal Int?, kinData Json?,
archetypePrimary?, archetypeSecondary?, archetypeScores Json?, vocational Json?,
synthesis String?, astrology Json?, dna Json?, humanDesign Json?, brandProfile Json?,
status String @default("DRAFT"),      // só DRAFT | COMPLETE
shareToken String? @unique,           // presente, sem política de emissão/expiração
createdAt, updatedAt, deletedAt?,
@@index([orgId]), @@index([deletedAt])
```

- `Organization.religareContext String?` (schema.prisma:23) guarda o modo.
- Relação 1:1 opcional com `Expert` via `expertId @unique`.

### 3.2 Contrato de I/O (DTOs) — `dtos/religare/profile.dto.ts`

- `CreateReligareProfileDto`: `name` (2-120), `birthDate` (string ISO, **sem
  validação de formato de data**), `birthTime` (`@MaxLength(5)`, sem regex
  HH:mm), `birthPlace` (2-160), lat/lng/tz opcionais.
- `SubmitQuestionnaireDto.answers`: apenas `@IsObject()` — **validação rasa**, o
  shape interno (`archetypes`/`vocational`/`ikigai`) não é validado profundamente
  (confirma crítica do Codex).
- `RELIGARE_CONTEXTS = ['agency','therapy']`.
- **Não há versionamento de contrato** (nenhum `schemaVersion`/`v1`).

### 3.3 Versão/licença dos motores

- `circular-natal-horoscope-js` `1.1.0` (package.json:157) — usado por astrologia
  e HD. **Licença verificada em 2026-07-02: `Unlicense` (domínio público)** —
  uso comercial explicitamente permitido, sem obrigações. Risco de licença: nulo.
- `jspdf` `^3.0.1` (package.json:187).
- Nenhum campo `engineId`/`engineVersion`/`inputHash`/`computedAt`/`confidence`
  gravado — os resultados são JSON "cru" sem proveniência (confirma crítica).

### 3.4 Testes existentes

- **Nenhum.** Busca por `*.spec.ts`/`*.test.ts` contendo "religare" retornou
  vazio. Não há corpus de referência, nem fixtures. (Confirma o principal
  problema do baseline.)

---

## 4. WIP / não testado / só planejado

| Item | Estado real |
| --- | --- |
| Astrologia / Human Design | Implementados e chamados, mas **sem teste de referência**; falha vira `null` silencioso |
| `shareToken` | Coluna existe e é `@unique`, **sem** emissão/expiração/revogação/escopo/rota pública |
| `status` | Só `DRAFT`/`COMPLETE`; "COMPLETE" = pipeline terminou, não revisão de qualidade |
| Proveniência/confiança | Não existe (nenhum `Observation`/`CalculationRun`) |
| Consentimento/retenção/PII | Não modelado |
| Precisão da hora (`exata/aproximada/desconhecida`) | Não existe; `birthTime` obrigatório no DTO |
| Confirmação de geocoding pelo operador | Não existe; usa o 1º resultado |
| Paginação na UI | Backend pagina (20/pág), **frontend ignora**: `useReligareProfiles` busca só página 0 e usa `res.items`, descarta `total` |
| Grimório editorial / Context Pack | Só planejado (lado Codex) — não existe no baseline |
| Fila/worker para cálculo | Não existe; cálculo roda **síncrono no request** |
| Idempotência/histórico de runs | Não existe |

---

## 5. Riscos técnicos e de produto conhecidos

Reafirmo e ancoro no código os pontos que o prompt exigiu considerar:

1. **Sem testes de referência** → qualquer refactor de cálculo é cego. (§3.4)
2. **JSON sem versão/proveniência/hash** → impossível saber com que motor um
   resultado foi gerado nem detectar divergência. (§3.3)
3. **Cálculo pesado no request** (`_computeAndPersist` chama ephemeris + geocode
   dentro do POST) → pode bloquear event loop e estourar timeout. (`religare.service.ts:110`)
4. **Geocoding ambíguo** → `geocodePlace` pega `results[0]`; cidade homônima
   resolve errado silenciosamente. (`religare-geocode.ts:37`)
5. **Validação rasa de payload** → `answers` só `@IsObject()`; sem limite de
   tamanho/profundidade. (`profile.dto.ts:105`)
6. **Paginação truncada na UI** → só 20 perfis visíveis, sem aviso. (§4)
7. **`shareToken` prematuro** → superfície de compartilhamento sem política de
   segurança; risco de vazamento se uma rota pública for adicionada sem escopo.
8. **Soft-delete + `expertId @unique`** → um expert com perfil soft-deletado
   **bloqueia** criar novo perfil (unique não ignora `deletedAt`); precisa de
   unique parcial ou liberar `expertId` no delete.
9. **Import eager de jsPDF** → `religare-pdf-export.ts` importado estaticamente em
   `religare-profile.component.tsx:21`; jsPDF entra no bundle mesmo sem exportar.
10. **Falha silenciosa astro/HD** → `catch { = null }` esconde erro do operador;
    "sem dados" e "erro" ficam indistinguíveis.
11. **Erro de data/hora não validado no DTO** → strings livres chegam ao motor;
    só o `computeNatalChart` valida (e joga pro `null`).

Produto: promessa/limites simbólicos, base legal de PII e unit economics ainda
indefinidos (alinhado ao que o Codex também aponta).

---

## 6. Decisões do lado Claude que o Codex ainda não conhece

Estas decisões estão no baseline ou nas memórias de projeto e podem divergir do
plano Codex:

- **Religare é 1º cidadão do monorepo Vocaccio**, não bounded context isolado:
  service/repository vivem em `libraries/nestjs-libraries` e cálculos em
  `libraries/helpers` — compartilhados com o resto do ecossistema (ex.: `tzolkin`
  também alimenta o widget "Kin do dia" do Hub).
- **Tenancy = `Organization` + RBAC `VocaccioRole`** já em produção; autorização
  vem da org da sessão. O Codex propõe IDs independentes + external refs — isso
  **colide** com o modelo atual (ver §7).
- **Limites por plano usam os tiers herdados do Postiz** (STANDARD/TEAM/PRO/
  ULTIMATE; FREE=1, STANDARD=5, resto=∞) — `religare-limits.ts`. Os nomes do
  PLANO-MESTRE (Individual/Básico/…) **ainda não** existem em billing.
- **Vínculo com `Expert`** (1:1) já é parte do domínio; o CRM usa
  `use-experts.hook`. O Codex trata "pessoa/caso" como entidade nova.
- **Contexto `agency`/`therapy`** já implementado no baseline (o Codex fala em
  segmentos mais amplos: PF/terapeuta/expert/agência).
- **Astro e HD usam a MESMA lib** (`circular-natal-horoscope-js`); não há segundo
  motor. Se o Codex escrever um motor novo, haverá dois → precisa de benchmark.
- **Redesign de UI em andamento** (mudanças locais não commitadas em
  `layout/*`, `colors.scss`, `vocaccio-tokens.scss`, `crm/*`) — tokens/tema podem
  divergir do que o Codex assume.

---

## 7. Mudanças planejadas (lado Claude) que podem colidir

| Domínio | Plano Claude (memórias) | Colisão potencial com Codex |
| --- | --- | --- |
| Schema | Evoluir `ReligareProfile` in-place; astrologia antes de HD | Codex quer modelo decomposto (`Observation`/`CalculationRun`/`Grimoire`…) → **schema divergente** |
| Endpoints | Manter `/hub/religare/*` no backend Nest | Codex quer contratos versionados + Context Pack como 1ª superfície |
| Identidade/tenancy | `Organization` + `Expert` + `VocaccioRole` | Codex: IDs próprios + tabela de referência externa |
| UI | Redesign host-theme (tokens `--new-*`) em curso | Codex: dark imersivo + Manrope/Cormorant; alinhar tokens |
| Storage | Sem uploads hoje | Codex: storage privado + retenção antes de anexos |
| Filas/IA | Cálculo síncrono; Temporal existe no orchestrator | Codex: `CalculationQueuePort` (adapter local, sem Temporal no módulo) |
| Billing | Tiers Postiz | Codex: planos nomeados — reconciliar |

---

## 8. Classificação inicial de cada componente

| Componente | Classe | Justificativa |
| --- | --- | --- |
| `tzolkin.ts`, `moon.ts`, `signs.ts` | **Reusar** | Determinístico, sem deps, já compartilhado; só falta teste |
| `archetypes.ts`, `vocational.ts` | **Reusar** | Scoring puro; adicionar fixtures |
| `astrology.ts` / `hd.ts` | **Adaptar** | Manter, mas envolver com versão/proveniência + testes + validação de licença |
| `religare-geocode.ts` | **Adaptar** | Bom isolamento; falta confirmação do operador + cache por lugar normalizado |
| `synthesis.ts`, `dna.ts` | **Adaptar** | Reusáveis como base autoral; migrar p/ camada de interpretação com evidências |
| DTOs (`profile.dto.ts`) | **Substituir** | Precisam de validação profunda + versionamento de contrato |
| `model ReligareProfile` | **Substituir (aditivo)** | Decompor em agregados; migração só aditiva, nunca destrutiva |
| `shareToken` | **Adiar** | Não expor até política completa |
| `religare-pdf-export.ts` | **Adaptar** | Tornar lazy + builder editorial de Grimório |
| Frontend hooks/telas | **Reusar/Adaptar** | Base sólida; corrigir paginação e estados de erro |
| `religare-limits.ts` | **Adiar** | Reconciliar com billing antes de mudar |
| RBAC/`VocaccioRole` | **Reusar** | Já em produção; base de autorização |

---

## 9. Plano para evitar escrita cruzada, migrações concorrentes e duas fontes de verdade

- **Propriedade**: Claude é dono exclusivo de `C:\dev\vocaccio`; Codex é dono de
  `C:\dev\vocaccio-codex\docs\religare`. Nenhum lado escreve na árvore do outro.
- **Sem elo físico**: proibido symlink, dependência por caminho local, worktree
  compartilhado ou banco de dev comum entre os dois repos.
- **Migrações**: enquanto durar o paralelo, **nenhuma** migração de schema
  Religare é aplicada dos dois lados. Se/quando integrar, migração **somente
  aditiva** e ensaiada (Gate C do Codex). Regra de memória: nunca `db push` em
  mudança de tipo; dados dos clientes são reais.
- **Fonte de verdade única por artefato**: contratos e fixtures trafegam por
  documento/JSON Schema/fixtures anonimizadas — nunca cópia ad hoc de pastas.
- **Baseline versionado**: toda comparação declara commit + `git status`.
- **Revisão**: antes de qualquer branch de integração futura, Moody (diff) e
  Severus (segurança/perf) revisam — e só sob comando explícito do Felipe.

---

## 10. Fixtures / contratos seguros para comparação futura (a produzir depois)

**Não criados agora** (o prompt proíbe copiar dados pessoais). Especificação do
que será seguro comparar quando autorizado:

- Casos **sintéticos/anonimizados** (sem nome/local reais), cobrindo:
  fuso histórico, horário de verão, fronteira de signo/casa/gate, hora desconhecida.
- Para cada caso: input explícito → saída esperada de Tzolkin, fase lunar,
  big three astrológico e tipo/autoridade HD, obtidas de 2 referências
  independentes quando possível.
- Formato: JSON com `engineId` + `engineVersion` + `inputHash`, versionável em
  Git (sem PII). Comparável byte-a-byte contra o motor do Codex.
- Contrato de I/O exportável como JSON Schema/OpenAPI a partir dos DTOs atuais,
  marcado como `v0-baseline` (não versionado hoje) para servir de âncora.

---

## 11. Feature flag, shadow run, backup e rollback

- **Feature flag**: qualquer motor/fluxo novo entra atrás de flag **desligada**;
  o fluxo manual/atual continua sendo o caminho padrão.
- **Shadow run**: rodar motor novo em paralelo, comparar saída contra o baseline,
  registrar divergências — **sem** afetar persistência canônica nem usuário.
- **Backup**: fluxo permitido `Hostinger → backup validado → transformação
  testada → novo destino`. Proibido: seed local → produção; JSON local →
  sobrescrita; sync bidirecional improvisado.
- **Rollback**: desligar flag e voltar ao fluxo anterior; preservar registros
  novos em tabelas **aditivas**; nunca downgrade destrutivo de schema; invalidar
  links de compartilhamento do fluxo interrompido; cancelar jobs por idempotency.
- **Gatilhos de rollback**: vazamento/cross-tenant, divergência de cálculo acima
  do limite, corrupção de respostas/revisões, alta de erro/latência, custo de IA
  acima do teto, impossibilidade de explicar proveniência.

---

## 12. Perguntas e conflitos que exigem decisão humana (Felipe)

1. **Modelo de dados**: decompor `ReligareProfile` em agregados (Codex) **ou**
   evoluir in-place (baseline)? Define migração aditiva vs. reescrita.
2. **Identidade/tenancy**: manter `Organization`+`Expert`+`VocaccioRole` **ou**
   IDs Religare independentes + external refs? Impacta autorização e billing.
3. **Onde nasce o código novo**: `vocaccio-codex` (Codex) vs. `libraries` do
   monorepo (padrão atual). Afeta reuso do `tzolkin` compartilhado.
4. ~~**Licença** de `circular-natal-horoscope-js` 1.1.0~~ **RESOLVIDO
   (2026-07-02): `Unlicense` / domínio público — uso comercial livre.**
5. **Billing**: reconciliar tiers Postiz (STANDARD/TEAM/PRO/ULTIMATE) com os
   planos nomeados do PLANO-MESTRE.
6. **`shareToken`**: remover do baseline até haver política, ou manter dormente?
7. **PII/base legal**: quando modelar consentimento/retenção — pré-requisito para
   qualquer persistência real de dados sensíveis.
8. **Prioridade Astrologia vs. Human Design**: memória diz "astrologia antes de
   HD"; confirmar contra o roadmap Codex.

---

## 13. Divergências resumidas vs. plano Codex

- **Arquitetura**: Codex = bounded context portável e decomposto; baseline =
  integrado ao monorepo com um modelo monolítico + blobs JSON.
- **Identidade**: Codex = IDs próprios; baseline = acoplado a `Organization`/`Expert`.
- **Cálculo**: Codex = fila/porta + proveniência/versão; baseline = síncrono, sem
  versão nem histórico.
- **Testes/corpus**: Codex = pré-requisito; baseline = inexistente.
- **Convergências**: ambos concordam em geocode isolado, deterministic-first,
  sem API paga no MVP, curadoria humana, e integração só por adapters/flags/
  rollback sob autorização explícita.

---

## 14. Apêndice A — Recomendações técnicas por decisão (lado Claude)

Recomendações do Claude para cada decisão aberta da §12. Princípio único:
**o baseline é bom demais para descartar e imaturo demais para congelar** →
quase tudo é "adaptar de forma aditiva", nunca reescrever cego nem manter cego.

### A.1 Schema — decompor (Codex) vs. evoluir in-place

**Evolução aditiva em duas velocidades.** Manter `ReligareProfile` para o que já
funciona. **Adicionar** uma tabela `ReligareCalculationRun` (aditiva, migração
não-destrutiva) com `engineId`, `engineVersion`, `inputHash`, `computedAt`,
`status`, `output Json` — resolve proveniência/versão (riscos #2 e #3) sem tocar
produção. **Adiar** a decomposição completa (`Observation`/`IntegrationMatrix`/
`Grimoire`) até existir corpus de teste. Reversível (drop de tabela aditiva).

### A.2 Tenancy — ecossistema vs. IDs independentes

**Manter `Organization` + `VocaccioRole` como fonte de autorização** (já em
produção, já corrige o IDOR da branch atual). Tratar `expertId` como vínculo
opcional/nullable — não como "a pessoa". Portabilidade futura entra via tabela
`external_ref`, não via troca de base de identidade. Trocar identidade em
produção = alto risco de quebra silenciosa de autorização, zero valor imediato.

### A.3 Onde nasce o código novo

**Cálculo determinístico puro nas `libraries`** (compartilhado — `tzolkin` já
alimenta o "Kin do dia" do Hub; duplicar = risco #1 "duas fontes de verdade").
Orquestração/persistência **experimental** o Codex prototipa isolado e devolve
por cópia auditável ou pacote versionado — nunca import por caminho local.

### A.4 Licença da ephemeris — RESOLVIDO

`circular-natal-horoscope-js` 1.1.0 = **`Unlicense` (domínio público)**,
verificado em 2026-07-02. Uso comercial livre, sem obrigações. Sinal verde.

### A.5 Billing

**Tiers Postiz (`STANDARD`/`TEAM`/`PRO`/`ULTIMATE`) = verdade técnica; nomes do
PLANO-MESTRE = camada de apresentação**, mapeada num lugar só (`religare-limits.ts`,
que já é esse lugar). Não renomear enums do banco. Preço/margem/CAC = rodada de
negócio à parte (o próprio `BUSINESS-PLAN.md` ainda não tem esses números).

### A.6 `shareToken`

**Manter a coluna, garantir que está inerte, documentar que está inerte.** Não
remover (migração destrutiva sem ganho). Risco real = adicionar rota pública sem
política; no baseline nenhuma rota lê `shareToken`. Comentar no schema como
"reservada — não expor sem escopo + expiração + revogação + auditoria + rate limit".

### A.7 PII / consentimento / retenção

**Pré-requisito da primeira persistência de dado de terceiro real, não do
desenvolvimento.** Dev/baseline hoje só usa dados sintéticos/do Felipe → sem
obrigação ainda. Antes do 1º cliente pagante: modelar `ConsentRecord`, precisão
da hora (`exata/aproximada/desconhecida`) e retenção. Base legal/termos exigem
validação jurídica antes de persistir dado sensível de terceiro (hora/local de
nascimento + anamnese tocam saúde/espiritualidade → LGPD reforçada).

### A.8 Astrologia antes de Human Design — SIM

Razão técnica reforça a de produto: **HD depende de astrologia no código**
(`hd.ts` reusa `computeNatalChart`) → validar a base astrológica valida o insumo
do HD. Astrologia tem 2 referências independentes fáceis → corpus mais rápido.
HD tem menos fontes canônicas e mais variação de convenção → por último, reduz
risco de solidificar erro. Converge com a Fase 2 do Codex.

### Fio condutor para levar ao Codex

> "Aceito a arquitetura-alvo do Codex como destino, mas o caminho é **aditivo e
> testável**: proveniência via `CalculationRun` primeiro, corpus de validação
> depois, decomposição por último — nada destrutivo em produção, nada de segundo
> motor, integração só por adapter sob autorização explícita."

---

## 14-B. Apêndice B — Revisão após ler os documentos de cálculo do Codex (2026-07-02)

Li (só leitura) os documentos novos do lado Codex, com destaque para
`REGISTRO-CALCULOS-E-COBERTURA.md`, `REVISAO-BASES-CALCULO-2026-07-02.md`,
`AUDITORIA-E-BACKLOG-EXECUTAVEL-2026-07-02.md`, `GOVERNANCA-…`, `CENTRAL-DADOS-…`
e `FORMULARIOS-PUBLICOS-…`. O sistema-alvo do Codex tem cálculos **muito mais
completos, precisos e versionados** que o baseline. Isso muda parte da minha
classificação e adiciona superfícies de integração. Esta seção **prevalece**
sobre a §8 onde houver conflito.

### B.1 Achado crítico — Tzolkin diverge e afeta PRODUÇÃO AO VIVO

O baseline (`tzolkin.ts`) usa **diferença simples de dias** e **avança no 29/02**.
A base Dreamspell do Codex trata **29/02 como `0.0 Hunab Ku` (não avança)**.
Divergência material e acumulada:

| Data | Motor atual (baseline) | Base Dreamspell (Codex) |
| --- | ---: | ---: |
| 2026-07-01 | 214 | **204** |
| 2026-07-02 | 215 | **205** |

- **Impacto além do Religare:** o mesmo `kinForDate` alimenta o widget
  **"Kin do dia" do Hub, que já está em produção** (memória de projeto
  "Hub fixes" já registrava "Kin do dia errado"). Ou seja, a correção do Tzolkin
  não é só um tema Religare — é uma **decisão de produto sobre o ecossistema
  inteiro**: adotar a convenção Dreamspell muda o Kin exibido hoje aos usuários.
- **Reclassificação:** `tzolkin.ts` sai de **Reusar** → **Substituir** (motor
  puro, versionado, com regra de 29/02 e fixtures canônicas, incl.
  `2026-07-01 = Kin 204`). **Não corrigir unilateralmente sem coordenar** com o
  Codex, que está reconstruindo esse motor como P0.
- ⚠️ Isto é uma constatação, **não uma ação**: não alterei `tzolkin.ts`.

### B.2 Convergência forte a registrar

- Minha recomendação **A.1 (`ReligareCalculationRun`)** é quase idêntica ao tipo
  `CalculationRun` do registro canônico do Codex (engineId, engineVersion,
  inputHash, status, confidence, output, warnings…). **Adotar o schema do Codex
  como contrato canônico** desse artefato.
- Ambos os lados concordam: deterministic-first, zero IA para matemática, cache
  por hash/versão, cálculo pesado fora do request, `CalculationQueuePort` com
  adapter local (Temporal só na integração), sem motor duplicado em Python/PHP.
- O Codex adotou o **`REGISTRO-CALCULOS-E-COBERTURA.md` como fonte de verdade dos
  motores** (status `DEFINED→…→VALIDATED`). **Aceito esse registro como a régua
  compartilhada**; a classificação reusar/adaptar/substituir do Claude deve ser
  lida contra o status de cada motor lá.

### B.3 Reclassificação dos motores à luz do registro Codex

A direção de reuso **inverte** para a camada de cálculo quando os motores do
Codex atingirem `VALIDATED`: o motor validado e versionado do Codex passa a ser
canônico; o do baseline vira legado a aposentar. A infraestrutura do ecossistema
(RBAC, org, Prisma, UI existente, billing) **continua canônica do lado Claude**.

| Componente baseline | Classe anterior (§8) | Classe revisada | Motivo |
| --- | --- | --- | --- |
| `tzolkin.ts` | Reusar | **Substituir** | diverge da regra 29/02; Codex reconstrói (P0) |
| `moon.ts` | Reusar | **Adaptar/Substituir** | Codex quer fase lunar astronômica validada (AS-11) |
| `astrology.ts` | Adaptar | **Adaptar → candidato a substituir** | Codex validará efemérides/fuso/casas; se `VALIDATED`, vira canônico |
| `hd.ts`/`hd-data.ts` | Adaptar | **Substituir (faseado)** | Codex quer HD-01..12 validado + escopo básico/avançado explícito |
| `archetypes`/`vocational` | Reusar | **Adaptar** | Codex tem bancos novos (A01–A12, RIASEC V01–V18) + prior heurístico |
| `synthesis`/`dna` | Adaptar | **Adaptar** | viram camada de interpretação versionada com evidências |
| DTOs/validação | Substituir | **Substituir** | Codex versiona `QuestionnaireItem`/contratos v1 |
| RBAC/org/Prisma/UI host | Reusar | **Reusar (canônico Claude)** | plumbing de produção não muda |

### B.4 Novas superfícies de integração (não existem no baseline)

Surgiram no plano Codex e **colidem/estendem** o modelo atual — registrar para o Gate B:

- **Formulários públicos sem login** (e-mail verificado + sessão pública limitada
  + autosave + histórico não destrutivo). Colide frontalmente com meu modelo
  `Organization`+`VocaccioRole` (autorização por sessão). Precisa de fronteira
  server-side; e-mail **não** é identidade global (isolar por tenant).
- **Motor de formulário genérico reutilizável** (Religare + briefings de
  marketing) — mantendo domínios separados.
- **Central de Dados + exportação** (CSV nativo TS com proteção a formula
  injection/RFC 4180/UTF-8 BOM; XLSX por adapter único server-side; JSON
  versionado como contrato canônico).
- **White label por tokens/presets** (sem código arbitrário) — conecta à Fase H
  do meu roadmap.

### B.5 Meu documento satisfaz o input da Fase 6 do Codex

O `AUDITORIA-E-BACKLOG-EXECUTAVEL` (Fase 6) e a `CONTINGENCIA-INTEGRACAO` (§4)
exigem, antes de integrar, um **inventário novo do lado Claude com commit/status
+ contratos + classificação reusar/adaptar/substituir/adiar**. **Este documento é
exatamente esse artefato** (baseline `6621201c`, §1). Ressalva: a classificação
de cálculo acima já incorpora a régua do registro Codex.

### B.6 Decisões humanas adicionais (somam-se à §12)

9. ~~**Convenção Tzolkin no ecossistema:**~~ **RESOLVIDO (Felipe, 2026-07-02):**
   convenção canônica = **Dreamspell / Sincronário da Paz** (29/02 = `0.0 Hunab
   Ku`, fora da contagem), validável contra **tzolkin.io** e
   **sincronariodapaz.org/calcula-kin/**. O motor do Codex é a referência fiel
   (nomenclatura + base de cálculo + convenções da comunidade BR). Unificar
   também no Hub "Kin do dia", comunicando a mudança aos usuários. Fixtures devem
   bater com os dois sites (âncora `1987-07-26 = Kin 34`; `2026-07-01 = Kin 204`).
10. **Identidade em formulário público:** como reconciliar "e-mail verificado sem
    login" (Codex) com `Organization`+`VocaccioRole` (baseline) na integração?
11. **Direção de reuso da camada de cálculo:** confirmar que, uma vez `VALIDATED`,
    os motores do Codex tornam-se canônicos e o baseline é aposentado (não manter
    os dois).
12. **Governança compartilhada:** o registro `REGISTRO-CALCULOS-E-COBERTURA.md`
    passa a valer como régua também do lado Claude na integração?

---

## 15. Confirmação de não-ação

Nenhuma integração entre pastas, alteração de schema, migração, `db push`, seed,
deploy, upload ou escrita em produção foi executada. Nada em
`C:\dev\vocaccio-codex` foi alterado, movido ou apagado (só leitura).

Ações desde a criação: (1) **leitura local** do `package.json`/`LICENSE` de
`circular-natal-horoscope-js` em `node_modules` (só leitura, resolveu A.4);
(2) **leitura só-leitura** dos documentos de cálculo do Codex em
`C:\dev\vocaccio-codex\docs\religare` (nada alterado lá); (3) **edições apenas
nos documentos deste repo**: este arquivo (§3.3, §12, Apêndices A e B) e a criação
de `docs/religare/PROMPT-PARA-CODEX-RELIGARE.md`. Nenhuma outra escrita no
repositório. Nenhum commit ou push foi feito.
