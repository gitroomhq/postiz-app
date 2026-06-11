# Spec — CRM Admin (Fase 1)
> Fonte: PLANO-MESTRE.md Camada 3. Acesso: OWNER e OPERATOR (CRUD); EDITOR/VIEWER_INTERNAL (leitura).

## Rotas

| Rota | Conteúdo |
|---|---|
| `/hub/crm/clientes` | Lista com busca, filtro por status, responsável |
| `/hub/crm/clientes/novo` | Form de cadastro (nome, responsável, contatos, notas) |
| `/hub/crm/clientes/[id]` | Visão 360 — tabs: Projetos, Contatos, Interações, Materiais, Métricas, Observações internas |
| `/hub/crm/projetos` | Todos os projetos (tabela: nome, cliente, owner, status) |
| `/hub/crm/projetos/[id]` | Cadastro completo do projeto (campos da Camada 4 — ver 02-client-project.md) |
| `/hub/crm/tarefas` | Pendências internas (`InternalTask`: título, assignee, due date, status) |

## Comportamento das tabs da visão 360
- **Projetos:** cards dos projetos do cliente, link para `/hub/crm/projetos/[id]`
- **Contatos:** CRUD inline de `ClientContact`
- **Interações:** timeline de `ClientInteraction` (tipo, resumo, autor, data) + form rápido
- **Materiais:** placeholder na F1 ("disponível na Fase 2") — listará conteúdos do projeto
- **Métricas:** na F1, dados simulados do seed; reais na F3 (Postiz)
- **Observações internas:** campo `Client.notes`, autosave com debounce

## Dummy data (seed obrigatório)

6 clientes, cada um com 1 projeto homônimo:

| Cliente | Projeto |
|---|---|
| Camila Caeron | Camila Caeron |
| PlanGroup | PlanGroup |
| Nanda Biolchini | Nanda Biolchini |
| Plan10 | Plan10 |
| Gigantes pela própria natureza | Gigantes |
| Vocaccio | Vocaccio (interno) |

Cada dummy inclui: briefing resumido, redes fictícias (`socialHandles`), persona,
CTAs, 2 contatos, 3 interações, 2 tarefas internas, métricas simuladas (JSON estático
na F1). Estados de conteúdo (3 rascunhos / 2 aguardando / 1 aprovado) entram na
Fase 2 com o modelo de aprovação — na F1, registrar como contagens simuladas no
widget de métricas.

## UI
- Usar DS Vocaccio (`docs/referencias/vocaccio-design-system.md` + `vocaccio-design-system-ui-tokens.md`)
- Construir como route group novo no frontend Postiz (`apps/frontend/src/app/(vocaccio)/hub/crm/...`)
  sem quebrar rotas existentes do Postiz
- Tabela + busca podem usar componentes já presentes no fork (Mantine/Tailwind)

## Critérios de aceite
- [ ] CRUD completo de Cliente e Projeto funcionando contra o Supabase
- [ ] Visão 360 com as 6 tabs (Materiais como placeholder)
- [ ] Seed popula os 6 clientes dummy
- [ ] Permissões: EDITOR/VIEWER não veem botões de criar/editar/excluir
- [ ] Busca e filtro por status na lista de clientes
