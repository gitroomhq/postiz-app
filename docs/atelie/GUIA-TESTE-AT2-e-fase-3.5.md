# Guia de teste — AT-2 (Ateliê Virtual) + Fase 3.5 (coerência visual)

> Escrito 2026-07-02. Ambos foram implementados neste worktree (`quirky-hertz-b159aa`), que
> **não tem DB** — nada disso rodou boot completo com backend real ainda. Este guia é o
> passo a passo pra você validar tudo de uma vez, a partir de `C:\dev\vocaccio` (o checkout
> que tem ambiente completo).

**Update (mesma sessão, depois de escrito o guia acima):** rodei `pnpm install` neste
worktree (deu certo, ~1.6GB de `node_modules`) e subi o **frontend isolado** (`pnpm --filter
./apps/frontend run dev`, sem backend/DB) só pra confirmar que o build compila e a página
sobe sem erro. Resultado: **Next.js compilou limpo, `/auth` (tela de cadastro) renderizou
corretamente** (confirmado via accessibility snapshot — título, formulário, avatares,
depoimentos, tudo presente). Não consegui tirar screenshot em pixels (a ferramenta de
screenshot deu timeout repetidamente nesta sessão — parece limitação do ambiente, não do
código). E, como esperado, `/hub/crm` redireciona de volta pra `/auth` sem sessão — ou seja,
**as telas de CRM da Fase 3.5 só dão pra ver de verdade com backend+DB reais** (login
funcional), que é exatamente o que você vai ter em `C:\dev\vocaccio`. Isso é uma confirmação
parcial (o app builda e não quebra), não uma validação visual das telas refatoradas.

## 0. Preparar o ambiente

```powershell
cd C:\dev\vocaccio
git fetch
git merge claude/quirky-hertz-b159aa   # ou o nome real da branch desta sessão — conferir com `git branch -a`
pnpm install                            # regenera node_modules/lockfile se precisar
pnpm run prisma-generate
```

## 1. Validar a migration da AT-2 (schema novo, aditivo)

A migration `20260702_at2_atelie_service_request` foi escrita à mão (sem `prisma migrate dev`
real). **Antes de aplicar em produção**, confira que ela bate com o schema:

```powershell
pnpm run prisma-migrate   # roda "migrate dev" contra seu banco de DEV — deixa o Prisma
                           # conferir/gerar a migration de verdade a partir do schema.prisma
                           # já editado. Se ele reclamar de divergência com o SQL escrito à
                           # mão, é preferível deixar o Prisma regenerar do zero.
```

Se estiver tudo consistente, aplique de fato:

```powershell
pnpm run prisma-migrate-deploy   # produção, só depois do passo acima confirmar
pnpm run prisma-seed-atelie      # popula o catálogo de 8 serviços — idempotente, pode rodar
                                  # de novo sem medo
```

## 2. Build real (não só typecheck)

```powershell
pnpm run build
```

Se der erro de TypeScript em algum arquivo `atelie/*` ou nos componentes de CRM
(`hub/crm/*`, Fase 3.5), é o primeiro lugar a olhar — já revisei manualmente e corrigi um
bug real (imports mortos `Button`/`Card` em `clients-list.component.tsx`), mas o build é a
prova definitiva.

## 3. Boot real

```powershell
pnpm run dev-backend   # frontend + backend juntos
```

## 4. Testar a AT-2 (cockpit do Ateliê)

1. Logar como `OWNER` (usuário seed).
2. Pegar o `projectId` de um projeto existente (ex.: Nanda Biolchini, do teste da AT-1).
3. Criar um pedido de teste via API (ou Postman/Insomnia/curl):
   ```
   POST /hub/atelie/projects/:projectId/requests
   {
     "offeringSlug": "plano-comunicacao-marketing",
     "briefing": { "objetivo": "teste AT-2" },
     "scopeLevel": "PADRAO"
   }
   ```
4. Abrir `http://localhost:4200/atelie/fila` no browser — o pedido deve aparecer na coluna
   "Solicitado", com badges de alerta se o Context Pack do projeto estiver incompleto ou se
   o cliente não tiver perfil Religare (mesmo achado do teste manual da AT-1).
5. Clicar em "Gerar prompt do operador" — deve copiar um texto pro clipboard com o briefing
   + os alertas. Clicar na seta de avançar status — o card deve mudar de coluna.
6. Conferir `GET /hub/atelie/offerings` retorna os 8 serviços semeados.

## 5. Testar a Fase 3.5 (coerência visual — CRM)

Abrir no browser, em dark E light mode:
- `/hub/crm` (lista de clientes) — badges de status, botão "Novo cliente".
- `/hub/crm/[id]` (detalhe do cliente) — cards de projeto, modais de contato/interação,
  botões (salvar/cancelar).
- `/hub/crm/projetos/novo` e `/hub/crm/projetos/[id]` — formulário completo (inputs, selects,
  textareas, tags de persona).
- Kanban de conteúdo dentro de um projeto — botões "Enviar para aprovação", "Novo item",
  "Gerar link de aprovação".

O que checar: pill/radius consistentes, cores vindas de `--voc-*` (não roxo cru do Postiz),
nenhum layout quebrado pelos novos primitivos (`Button`/`Card`/`Badge`/`Input`/`Select`/
`Field`) substituindo os elementos hand-rolled antigos.

**Pendente da Fase 3.5** (não fiz nesta rodada — a sessão do agente foi cortada por limite):
Volatis (`components/volatis/*`) e o(s) componente(s) de portal ainda não foram auditados/
padronizados; primitivos `Toggle`/`Accordion`/`Panel` ainda não existem (só criar quando
houver uma tela real pedindo). Ver detalhes em `PLANO-MESTRE.md`, seção "Fase 3.5".
