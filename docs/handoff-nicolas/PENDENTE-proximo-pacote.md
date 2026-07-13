# Pendente — Próximo Pacote de Atualização pro Nicolas

> Lista viva de tudo que mudou no lado Vocaccio/Claude desde o último kit entregue (ver
> memória `project-nicolas-actus`: zip com `.claude/` + agentes HP + design system + logos,
> adaptado pra Mac). Objetivo: quando compilarmos o próximo pacote, não esquecer nada e
> facilitar a reintegração quando ele enviar os fontes do Actus Clip de volta.
>
> **Não compilar o pacote ainda** — só acumular os itens aqui até decidirmos o momento certo
> (provável gatilho: antes dele integrar o Actus Clip ao monorepo, ou quando pedirmos os
> fontes dele de volta).

## Mudanças acumuladas desde o último kit

### Design (mudou de fato — prioridade alta no próximo pacote)
- **System Design "Caminho do Meio"** adotado (commit `d075f53e`) substitui a paleta antiga
  do kit anterior. Novo padrão: SaaS Premium com Aura Mágica (glassmorphism, ambient glows,
  gradiente Aurora `--voc-peach/rose/violet/blue`), Dark/Light mode intercambiáveis.
  Documento definitivo: `docs/handoff-novo-design/vocaccio-system-design-final.md` +
  `docs/handoff-novo-design/prompt-migracao.md` (prompt pronto de migração, útil de reusar
  como referência de como comunicar mudança de DS pro Nicolas também).
- Estrutura visual: Postiz dark (`--new-*`) fica só como esqueleto; cor/acento é sempre
  Vocaccio (`--voc-*`) — regra que o Actus Clip também deve seguir se compartilhar componentes.

### Arquitetura / decisões de produto
- **Fronteira front-office/back-office + DNA visual único do Acto/Actus** (add. 2026-07-13,
  Protocolo Fênix FX-2026-07-07-03). Reconhecido no lado Claude: o Actus **pode ser vendido
  separadamente sem virar produto visualmente independente** (vendável ≠ identidade própria);
  front-office vendável e back-office assistido podem **divergir em interface sem divergir em
  identidade** (mesmo DNA Vocaccio, editor como cockpit operacional). Handoff cross-IDE canônico
  do Codex (referência, não copiar): `C:\dev\vocaccio-codex\docs\NICO-ACTO-HANDOFF-VISUAL-2026-07-07.md`
  e `NICO-ACTO-PROMPT-CLAUDE-CODE-2026-07-07.md`; direção visual em
  `C:\dev\edwiges\SYSTEM-DESIGN-CONSOLIDADO-VOCACCIO.md` §5 (Acto). Vale entrar no próximo pacote.
- **Frente Ateliê Virtual (back-office)** — nova divisão front-office × back-office do
  produto (`docs/atelie/plano-atelie-virtual.md`). Quando o vídeo do Nicolas entrar, vira um
  `ServiceOffering` com `deliveryMode: "nicolas"` dentro desse contrato — vale explicar esse
  encaixe no próximo pacote, já que afeta como o Actus Clip se conecta ao resto. AT-2
  (schema `ServiceOffering`/`ServiceRequest` real + cockpit `/atelie/fila`) já com código
  escrito (2026-07-02) — o modelo de dados que o vídeo do Nicolas vai plugar já existe.
- **Carrosséis: Konva substitui Polotno** (`mini-image-editor.component.tsx`) — decisão
  final 2026-07-09/10, Polotno removido do `package.json`, sem flag (sempre disponível,
  gate só por tier AI). Relevante pro Nicolas se o Actus Clip cogitava usar Polotno/editor externo.
- **Plano de leveza & estabilidade 2026-07** (`docs/auditoria/plano-leveza-2026-07.md`):
  quarentena de rotas Postiz não usadas (`agents`/`plugs`/`third-party`), dieta do dev-loop,
  `NODE_OPTIONS=--max-old-space-size=4096` no tsc/build (relevante pro M1 8GB dele também).
- Auditoria de segurança 2026-06 (48 achados VOC-01..48) rodando em paralelo — parte já
  corrigida (Fase 0/A-E do plano de leveza).

### Ainda não mudou (não incluir, evitar ruído no pacote)
- Contrato de integração Actus↔Vocaccio (`@actus/*` aliases, `IUploadProvider`,
  `crmClientId`, Temporal namespaced, `POST /clips/:id/export-to-vocaccio`) segue o mesmo
  descrito na memória `project-nicolas-actus` — nada de novo aqui ainda.
- Agentes HP (Camada 11 do `PLANO-MESTRE.md`) — roster estável desde o último kit.

## Quando compilar o pacote de fato, incluir:
1. `docs/handoff-novo-design/` (os 3 arquivos) como fonte única do novo DS.
2. Trecho novo do `docs/atelie/plano-atelie-virtual.md` explicando onde o vídeo dele encaixa.
3. Resumo de 1 página do plano de leveza (não o doc inteiro — só o que afeta ambiente/Mac).
4. Confirmar com o Felipe se algo do roster de agentes HP mudou entre o kit antigo e agora
   antes de reenviar `.claude/agents/`.
