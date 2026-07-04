---
name: migration-safety
description: Use antes de qualquer mudança em schema.prisma (libraries/nestjs-libraries/src/database/prisma/schema.prisma) em produção — nova coluna, mudança de tipo, nova tabela, remoção de campo. Checklist obrigatório de migration segura + boot real pós-mudança. Não usar para queries read-only ou para trabalho puramente de frontend.
version: 0.1.0
user-invocable: true
argument-hint: "[descrição da mudança de schema]"
---

Este projeto está em produção com clientes reais (ver `CLAUDE.md` raiz e achado
VOC-29 da auditoria: uso de `db push` já causou risco de perda de dados).
Toda mudança em `schema.prisma` passa por este checklist antes de ser
considerada pronta.

## Passo a passo

1. **Classifique a mudança.**
   - **Aditiva** (nova tabela, nova coluna `nullable` ou com `@default`) → baixo risco.
   - **Destrutiva/ambígua** (mudança de tipo de coluna, remoção de coluna/tabela,
     coluna `NOT NULL` sem default, rename) → alto risco. Pare e confirme com o
     operador (Felipe) antes de prosseguir — dados de clientes reais estão em jogo.

2. **Nunca `prisma db push` em produção.** Use sempre migration versionada:
   ```
   pnpm run prisma-migrate   # gera + aplica migration em dev, versionada em git
   pnpm run prisma-migrate-deploy   # aplica migrations pendentes em prod
   ```
   `pnpm run prisma-db-push` (com `--accept-data-loss`) só serve para prototipagem
   local descartável — nunca para uma mudança que vai virar PR.

3. **Se for mudança de tipo ou destrutiva**, escreva a migration a mão com passo
   intermediário (ex.: coluna nova → backfill → drop da antiga) em vez de deixar
   o Prisma gerar um `ALTER COLUMN` direto. Rode `pnpm run prisma-migrate` e
   **leia o SQL gerado** antes de aplicar.

4. **Depois de qualquer migration**, regenere o client:
   ```
   pnpm run prisma-generate
   ```

5. **Suba o backend real e valide com curl** — `tsc`/build passam mesmo com o
   boot quebrado. Rode `pnpm run dev-backend` (ou `dev:backend`) e faça uma
   chamada real no endpoint afetado pelo schema. Não declare a tarefa concluída
   sem esse boot real.

6. **Seed roda só uma vez.** Se a mudança exige dado novo, não re-rode
   `prisma-seed` cegamente — pode duplicar ou sobrescrever dados de clientes
   reais. Escreva um seed/script incremental específico se necessário.

7. Se algo neste checklist não se aplicar com clareza (ex.: schema multi-tenant,
   RBAC), pare e peça confirmação — não improvise em cima de dados reais.
