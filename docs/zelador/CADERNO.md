# Caderno do Zelador — Vocaccio

Watch-list de incidentes agrupados por **causa-raiz** (não por semelhança superficial).
Regra nasce de padrão: ≥2 incidentes mesma causa-raiz → cluster; ≥3 sem plano ativo → rascunho
de correção. Nada persiste em CLAUDE.md/`.md` de agente/hook sem aprovação do orquestrador ou
do usuário. Fix aplicado → cluster fica **graduado** aqui (histórico não se apaga).

Formato de entrada: `AAAA-MM-DD | causa-raiz | incidente(s) | mecanismo proposto | status`

---

## Clusters ativos (≥2 incidentes, mesma causa-raiz)

_(nenhum ainda — primeira ronda)_

## Clusters maduros (≥3, correção rascunhada/pendente de aprovação)

- **2026-07-04 | causa-raiz: painéis com `bg-newBgColorInner`/`bg-newBgColor` (Postiz,
  `#1a1919`/`#0e0e0e`, 100% opaco) pintados por cima de containers já migrados pra glass
  (`.voc-content-shell`/`.voc-glass-shell`), anulando a transparência do pai não importa o
  valor ajustado nele | incidentes: achado ao vivo pelo Felipe via DevTools na tela de Posts
  (`launches.component.tsx`, 3 ocorrências corrigidas — painel "Canais", loading state, área
  do calendário) — `grep -rl "bg-newBgColorInner"` acha **44 outros arquivos** com o mesmo
  padrão (CRM, Religare, Volatis, billing, admin, launches/modais) que NÃO foram auditados
  ainda | mecanismo proposto: Hagrid/Flitwick tratam isso como item explícito da meta "zero
  débito visual Postiz até Fase 4" (já registrada no `.md` de ambos) — auditar arquivo por
  arquivo (não substituição global cega, já que `--new-bgColor*` também é usado em contextos
  que legitimamente precisam de opacidade, ex. popovers/dropdowns) e trocar por
  `bg-transparent`/token glass onde o container pai já é `.voc-glass-*` | status: MADURO,
  correção pontual aplicada só na tela relatada — resto pendente de auditoria dedicada.

## Clusters graduados (correção já aplicada)

_(nenhum ainda)_

## Clusters graduados (correção já aplicada)

- **2026-07-03 | causa-raiz: checklist de poda incompleto (só `--merged`, sem `git status` por
  worktree) | incidente: `interesting-hypatia-fc900b` e `magical-allen-1f35af` foram marcadas
  "candidatas seguras" na ronda de calibração só por estarem `--merged`; ao pedir confirmação
  pro Felipe, descobriu-se que as duas têm `git status` sujo (Portal/Carrossel em
  interesting-hypatia; `.claude/launch.json` em magical-allen) — quase virou perda de trabalho
  não commitado se a exclusão tivesse sido aprovada às cegas | mecanismo: checklist de 5 passos
  adicionado à seção 3 do `.md` do Filch (local + global, commit pendente): `git status --short`
  dentro de CADA worktree candidata é obrigatório antes de recomendar poda; diff sujo = pare e
  resuma, não classifique como lixo | status: GRADUADO — regra já escrita no `.md`, poda das
  duas worktrees continua pausada até o Felipe decidir o que fazer com o diff de cada uma.**

## Em observação (incidente único — aguardando recorrência)

- **2026-07-03** — Fusão Filch/Hagrid pendente no `main`. Os agentes `filch-caretaker.md` e
  `hagrid-brand.md` (+ README atualizado com tabela/legenda dos dois) existem no worktree
  `agitated-williams-e8829c` (commits `dd712029`, `5a3f036a`) mas ainda não chegaram ao `main`
  (`6fede5b3`, sem esses arquivos). Não é erro — é trabalho em andamento neste worktree — mas
  vale acompanhar: se esta branch demorar a mergear, o resto do time (rodando a partir de
  `main` ou de outro worktree) não vê Filch/Hagrid ainda. Observação única, não cluster.

---

## Ronda 2026-07-03 — primeira ronda (calibração/teste)

**Time ativo:** 🔦 Filch (sozinho, ronda de teste).

### Entulho físico (worktrees/branches)
- `git worktree list` a partir de `C:/dev/vocaccio` (main): 3 worktrees além do principal —
  `agitated-williams-e8829c` (5a3f036a, branch atual, não merged em main — trabalho vivo, esta
  própria sessão), `interesting-hypatia-fc900b` (6fede5b3 — **mesmo commit do HEAD do main**),
  `magical-allen-1f35af` (ff806f66, atrás do main).
- `git branch --merged main`: `interesting-hypatia-fc900b` e `magical-allen-1f35af` já estão
  **merged** em main. Isso é sinal forte de worktree candidata a poda — mas Filch não deleta.
  Sinalizado ao dono: **`interesting-hypatia-fc900b` está no mesmo ponto do main (6fede5b3)** —
  se não há sessão viva usando-a, é a primeira candidata a `git worktree remove`.
  `magical-allen-1f35af` também já mergeada (ff806f66 ancestral de main) — mesma checagem antes
  de remover.
- `agitated-williams-e8829c` (esta sessão) está `--no-merged` — trabalho em progresso, correto
  não tocar.

### Sentinela de commit
- Worktree atual (`agitated-williams-e8829c`): `git status` limpo, nada pendente. Sem cobrança.

### Disciplina do time (`.claude/agents/`)
- Todos os 10 agentes têm `model:` no frontmatter (checado via grep): flitwick/sirius/severus/
  edwiges/weasley/hagrid/filch = sonnet; griphook/moody = haiku; mcgonagall = opus. Nenhum
  agente sem recomendação de modelo — **sem cobrança**.
- README local (`.claude/agents/README.md` neste worktree) já reflete Filch e Hagrid na tabela,
  legenda de emoji e protocolos dedicados (linhas 70-98) — bem documentado, sem drift entre
  README e os `.md` individuais.
- Nota: o README do **main** ainda não tem Filch/Hagrid (só chega quando esta branch mergear) —
  ver "Em observação" acima. Não é falha de disciplina, é sequência normal de merge.

### Skills / automação
- Fora de escopo nesta ronda (pedido explícito: sem auditoria de skill nova, sem acionar Hagrid).

### `/goal`
- Nenhuma fase/missão multi-etapas em andamento nesta ronda isolada que justifique propor
  `/goal` agora — revisitar quando o Filch acompanhar uma fase completa (ex. merge da branch
  atual + integração Filch/Hagrid no main).

**Veredito da ronda:** Castelo limpo — só uma poda de worktree para o dono avaliar (checar
sessão viva antes) e nenhuma cobrança de modelo/esforço pendente.
