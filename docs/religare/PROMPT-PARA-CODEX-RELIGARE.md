# Prompt para atualizar o Codex — coordenação Religare (lado Claude → Codex)

> Copie o bloco abaixo e cole no Codex (`C:\dev\vocaccio-codex`). Ele informa o
> Codex sobre o inventário/decisões do lado Claude e pede uma resposta estruturada
> para avaliarmos juntos riscos e o plano de integração futura. **Não autoriza
> integração, migração, deploy nem escrita cruzada.**

---

Você é o Codex trabalhando em `C:\dev\vocaccio-codex`. O lado Claude Code
(mantenedor de `C:\dev\vocaccio`) concluiu um inventário/contingência do Religare
e tomou decisões que você precisa conhecer antes de qualquer integração futura.
Trate `C:\dev\vocaccio` como **somente leitura**; não integre, não migre banco,
não faça deploy e não escreva nada fora de `C:\dev\vocaccio-codex`.

## 1. Contexto e baseline

- Documento-fonte do lado Claude:
  `C:\dev\vocaccio\docs\religare\INVENTARIO-CONTINGENCIA-CLAUDE.md`
  (leia-o só-leitura; é o inventário que sua Fase 6 / `CONTINGENCIA-INTEGRACAO §4`
  exige do lado Claude).
- Baseline inventariado: branch `fix/voc-idor-project-content`,
  commit `6621201c9834b7ed3cfe2f15aedaa6070fb9db64`. Os SHA-256 de
  `Aprimoramento-Religare.md` e `BUSINESS-PLAN.md` conferem com os que você
  registrou em 2026-07-01.
- Li seus documentos de 2026-07-02 (registro de cálculos, revisão de bases,
  auditoria/backlog, governança, central de dados, formulários públicos).

## 2. Decisões e recomendações do lado Claude (para você avaliar)

1. **Schema:** evolução **aditiva**, não reescrita. Manter `ReligareProfile` para
   o que já funciona e adicionar tabela `ReligareCalculationRun` (proveniência +
   versão). Decompor em agregados só depois de haver corpus de teste.
2. **Tenancy:** manter `Organization` + `VocaccioRole` como fonte de autorização
   no ecossistema; portabilidade futura via tabela de referência externa, não via
   troca de identidade.
3. **Onde nasce o código:** cálculo determinístico puro nas `libraries` do
   monorepo (compartilhado com o Hub); orquestração/persistência experimental
   isolada no seu lado e devolvida por cópia auditável/pacote versionado.
4. **Licença da ephemeris:** `circular-natal-horoscope-js` 1.1.0 = **Unlicense
   (domínio público)** — uso comercial livre. Verificado.
5. **Billing:** tiers técnicos Postiz (STANDARD/TEAM/PRO/ULTIMATE) são a verdade;
   nomes comerciais do PLANO-MESTRE ficam numa camada de mapeamento.
6. **`shareToken`:** manter dormente e documentado como reservado; sem rota
   pública até haver política de escopo/expiração/revogação.
7. **PII/consentimento:** pré-requisito antes da primeira persistência de dado de
   terceiro real (não bloqueia dev com dados sintéticos).
8. **Astrologia antes de Human Design** (HD depende do mapa natal no código).

## 3. Achado crítico a alinhar — Tzolkin diverge e afeta produção

O motor `tzolkin.ts` do baseline usa diferença simples de dias e **avança em
29/02**; sua base Dreamspell **não avança** (29/02 = `0.0 Hunab Ku`). Ex.:
`2026-07-01` → baseline 214 vs. Dreamspell **204**.

- O **mesmo** `kinForDate` alimenta o widget "Kin do dia" do **Hub, em produção**.
  Portanto adotar Dreamspell é uma decisão de produto do ecossistema, não só do
  Religare.
- O lado Claude **não vai corrigir unilateralmente**; concordamos que o motor
  correto nasce versionado no seu lado (seu P0) com fixtures canônicas
  (incl. `2026-07-01 = Kin 204`), e depois se decide a unificação no Hub.

## 4. Convergências já acordadas (para você confirmar)

- Seu tipo `CalculationRun` do `REGISTRO-CALCULOS-E-COBERTURA.md` é praticamente
  igual ao que o Claude propôs → **adotá-lo como contrato canônico** do artefato.
- O `REGISTRO-CALCULOS-E-COBERTURA.md` passa a ser a **régua compartilhada** de
  status dos motores (`DEFINED→…→VALIDATED`).
- Deterministic-first, zero IA na matemática, cache por hash/versão, cálculo
  pesado fora do request, `CalculationQueuePort` (Temporal só na integração),
  nenhum motor duplicado em Python/PHP.
- Uma vez `VALIDATED`, os motores do Codex tornam-se **canônicos** e o baseline é
  aposentado (não manter dois motores). A infraestrutura (RBAC, org, Prisma, UI
  host, billing) permanece canônica do lado Claude.

## 5. Superfícies novas suas que colidem/estendem o baseline

- **Formulário público sem login** (e-mail verificado + sessão limitada): colide
  com autorização por `Organization`/`VocaccioRole`. E-mail **não** pode ser
  identidade global — isolar por tenant, derivar no servidor.
- **Central de Dados + export** (CSV/JSON canônico/XLSX server-side).
- **White label por tokens/presets** — conecta à "Fase H" do roadmap Claude.

## 6. O que preciso de você (responda em documentos no SEU lado, sem tocar em `C:\dev\vocaccio`)

1. **Reação ponto a ponto** às 8 decisões da §2 (concorda / ajusta / conflita) e
   às convergências da §4.
2. **Plano do Tzolkin/§3**: confirmar fixtures canônicas e propor como/quando
   unificar a convenção Dreamspell no Hub em produção (com rollback).
3. **Mapa de contrato canônico**: `CalculationRun`, `QuestionnaireItem` v1,
   Context Pack e JSON de export — em JSON Schema/OpenAPI versionado, exportável.
4. **Tabela de classificação por componente** (reusar/adaptar/substituir/adiar)
   do seu lado, cruzada com o status do registro canônico.
5. **Identidade do formulário público** × tenancy do ecossistema: proposta de
   adapter/mapeamento reversível para a integração futura.
6. **Lista de ADRs** que você considera necessários antes do Gate B, com o
   conflito e as opções de cada um.
7. **Fixtures sintéticas** (sem PII) que ambos os lados possam comparar depois.
8. **Riscos que você vê no baseline** que o inventário do Claude não cobriu.

## 7. Restrições (valem para os dois lados)

- Nada de symlink, dependência por caminho local, worktree/banco compartilhado.
- Migração futura só aditiva, ensaiada, com feature flag, shadow run e rollback,
  e **somente sob comando explícito do Felipe**.
- Dados de produção só via `Hostinger → backup validado → transformação testada →
  novo destino`. Proibido seed local → produção e sobrescrita por JSON local.
- Toda comparação futura declara novo commit + `git status --short`.

Ao terminar, entregue: (a) os documentos/ADRs criados no seu lado; (b) um resumo
das divergências remanescentes com o lado Claude; (c) a lista de decisões que
ainda dependem do Felipe. Não execute integração, migração, deploy ou escrita em
produção.
