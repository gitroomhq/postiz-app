# Checkpoint — Fase 1 (Auth + CRM) — Sessão 2
**Data:** 2026-06-10 · **Status:** schema aplicado ✅ · seed pendente

## ⚠️ REORGANIZAÇÃO (2026-06-10, mesma sessão)
**Workspace oficial agora é `C:\dev\vocaccio`** — repo + referências fundidos numa pasta
mãe única, fora do OneDrive. Movido via robocopy (391k arquivos, 3,29GB, 0 falhas, sem
reinstalar node_modules). Referências de marca/design em `docs/referencias/`. Pastas
antigas em `Automação\` arquivadas como `_ARQUIVADO-*` (deletar manualmente depois de
validar). `.env` criado (cópia do `.env.local`). Memória do Claude migrada para o
projeto `C--dev-vocaccio`. **Abrir todas as sessões futuras em `C:\dev\vocaccio`.**

## Feito nesta sessão
- `PLANO-MESTRE.md` v6 criado na raiz do repo (substitui o v5 de `.claude\plans\` como fonte de verdade)
- Schema Prisma do Postiz analisado (970 linhas, 46 modelos) — delta documentado
- Specs criadas:
  - `specs/shared/auth-rbac.md` — 7 roles, mapeamento VocaccioRole×Role Postiz, argon2id, link único
  - `specs/shared/database-schema.md` — modelos novos (Client, Project, ProjectAccessLink, AccessLinkEvent, ClientContact, ClientInteraction, InternalTask) + alterações aditivas em UserOrganization/User/Integration/Post/Media
  - `specs/hub/01-crm-admin.md` — rotas CRM + dummy data
  - `specs/hub/02-client-project.md` — form do cadastro global

## Correções de fatos (sessão anterior de outro chat estava errada)
- Repo EXISTE: `...\Automação\vocaccio-ecosystem` (remote felipeweb7/vocaccio-ecosystem) ✅
- `phases/checkpoint-fase0.md` EXISTE ✅ · Contas cloud todas criadas ✅ · `.env`/.env.local preenchidos ✅
- Workspace `Vocaccio-Ecossistema` (com hífen) = pasta de assets/referências, NÃO o repo

## Decisões desta sessão
1. **Organization = tenant único** (Kairós/Vocaccio). Clientes = modelo novo `Client`, não Organizations.
2. **Não tocar no enum Role do Postiz** — campo paralelo `vocaccioRole` + mapeamento de compatibilidade.
3. **Só campos aditivos/nullable** em modelos Postiz (compatibilidade com upstream).
4. Repo permanece no OneDrive por ora (funciona); risco documentado no PLANO-MESTRE Camada 16.
5. Marketplace do Postiz (Customer/Orders/Agency) e tabelas mastra_*: ignorar, não deletar.

## Sessão 2 — concluído (2026-06-10)
1. ✅ `schema.prisma` editado — 3 enums novos + 7 modelos novos + 5 campos aditivos
2. ✅ `prisma db push` aplicado ao Supabase sem destruir tabelas existentes
3. ✅ `prisma generate` compilou sem erros
4. ✅ commit `feat(schema): add Vocaccio Phase 1 models and fields`

## Sessão 3 — concluído (2026-06-10)
1. ✅ `seed.ts` criado em `libraries/nestjs-libraries/src/database/prisma/seed.ts`
2. ✅ Script `prisma-seed` no `package.json` raiz (`pnpm dlx tsx ...`)
3. ✅ Seed rodado: 1 Org + 1 OWNER + 6 Clients + 6 Projects + 12 Contacts + 18 Interactions + 12 InternalTasks
   - Owner: `admin@vocaccio.com.br` / `Vocaccio@2024!` (mustChangePassword=true)
   - Org ID: `vocaccio-org-seed`
4. ✅ commit `feat(seed): add Vocaccio Phase 1 seed`

## Sessão 4 — concluído (2026-06-10)
1. ✅ `vocaccioRole` adicionado ao select de `getOrgsByUserId` (organization.repository.ts)
2. ✅ `VocaccioRoles` decorator criado (`vocaccio-roles.decorator.ts`)
3. ✅ `VocaccioRolesGuard` criado e registrado globalmente no `app.module.ts`
4. ✅ `tsc --noEmit` passou sem erros
5. ✅ commit `feat(rbac): add VocaccioRoles guard and decorator`

**Como usar:**
```ts
@VocaccioRoles(VocaccioRole.OWNER, VocaccioRole.OPERATOR)
@Get('clients')
getClients() { ... }
```

## Sessão 5 — concluído (2026-06-10)
1. ✅ `CrmRepository` — listClients (paginado+filtro), getClientById (detalhe 360), create, update, softDelete
2. ✅ `CrmService` — orquestra repository, lança NotFoundException se cliente não encontrado
3. ✅ `CrmController` — 5 endpoints em `/hub/crm/clients`, roles por método conforme matriz
4. ✅ DTOs: `CreateClientDto`, `UpdateClientDto`, `ListClientsDto`
5. ✅ Registrado em `database.module.ts` (global) e `api.module.ts`
6. ✅ `tsc --noEmit` zero erros
7. ✅ commit `feat(crm): add CRM backend routes`

## Próxima sessão
1. **Subir backend + testar rotas** (`pnpm run dev-backend` + curl/Postman)
   - Login com `admin@vocaccio.com.br` / `Vocaccio@2024!` → obter JWT
   - Testar `GET /hub/crm/clients` retorna os 6 clientes do seed
2. **Frontend** — route group `apps/frontend/src/app/(vocaccio)/hub/crm/`:
   - `page.tsx` → lista de clientes (tabela + busca + filtro de status)
   - Usar SWR + `useFetch` hook do `@gitroom/helpers`
   - Componentes com Tailwind 3 (consultar `colors.scss` + `global.scss` antes)

## Pendências conhecidas
- **Cadastro/login do Postiz dá 404** (registrado 2026-06-10). Causa provável: só o
  frontend (4200) estava rodando — o cadastro chama a API do backend
  (`NEXT_PUBLIC_BACKEND_URL=http://localhost:3000`), que não estava de pé.
  Diagnosticar rodando `pnpm run dev-backend` (com NODE_OPTIONS abaixo) e testar de novo.
  De qualquer forma o fluxo de auth será substituído na F1 (argon2id + roles Vocaccio).
- Backend OOM em watch mode → `$env:NODE_OPTIONS="--max-old-space-size=4096"`
- Node 24 vs 22 (warning inofensivo até agora; nvm-windows se virar problema)
- 2FA OWNER/OPERATOR: implementar ainda na F1 (depois do login básico)
- Design system: usar `docs/referencias/vocaccio-design-system.md` (principal, marca/UX)
  + `vocaccio-design-system-ui-tokens.md` (tokens/componentes) em toda UI nova

## Retomar dev
```powershell
cd C:\dev\vocaccio
pnpm --filter ./apps/frontend run dev    # http://localhost:4200
```
