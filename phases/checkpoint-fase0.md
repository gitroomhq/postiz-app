# Checkpoint — Fase 0: Specs e Setup
**Data:** 2026-06-06
**Status:** ✅ CONCLUÍDA

---

## O que foi feito

### Contas cloud criadas
- GitHub: `felipeweb7/vocaccio-ecosystem` (fork do Postiz)
- Vercel: conectado ao GitHub (deploy automático pronto)
- Supabase: projeto `vocaccio-ecosystem` — região São Paulo
- Railway: conta criada (backend NestJS — Fase 1)
- Upstash: banco `vocaccio-redis` — região São Paulo
- Groq: API key gerada (transcrição Whisper — Fase 9)
- Firecrawl: API key gerada (Snape + Luna — Fase 6)

### Softwares instalados
- Node.js v24.14.1 (atenção: Postiz pede 22.x — funciona com aviso)
- pnpm v10.6.1
- Git v2.54.0
- FFmpeg v8.1.1
- Ruflo v3.10.37 (já instalado antes)
- Claude Code CLI (instalado nessa fase)
- turbo (instalado globalmente via npm)

### MCP registrado
```powershell
claude mcp add ruflo -- cmd /c ruflo mcp start
# Status: ✅ connected
```

### Projeto local
- Fork clonado em:
  `C:\Users\felip\OneDrive\Documentos\Kairós Media\Vocaccio\Automação\vocaccio-ecosystem\`
- `pnpm install` executado com sucesso
- `.env` e `.env.local` configurados (todos os valores preenchidos)

### Projeto rodando
```powershell
pnpm --filter ./apps/frontend run dev
# Frontend: http://localhost:4200 ✅
# Página /auth carregando corretamente ✅
```

---

## Estrutura do Postiz (descoberta nessa fase)

| Expectativa do plano | Realidade |
|---|---|
| Turborepo | ❌ Usa pnpm workspaces nativo |
| `pnpm turbo dev` | ✅ `pnpm --filter ./apps/frontend run dev` |
| Frontend porta 3000 | ✅ Porta 4200 (padrão Postiz) |
| Backend porta 3001 | ✅ Porta 3000 (padrão Postiz) |

### Scripts corretos do Postiz
```powershell
# Só frontend (Fase 0-1)
pnpm --filter ./apps/frontend run dev

# Frontend + backend (Fase 1+)
pnpm run dev-backend

# Prisma
pnpm run prisma-generate
pnpm run prisma-db-push
```

### Localização do schema Prisma
```
libraries/nestjs-libraries/src/database/prisma/schema.prisma
```

---

## Avisos conhecidos (não são erros)

1. **pnpm field warning** — pnpm 10.x moveu configurações; o Postiz ainda usa formato antigo. Inofensivo.
2. **Node 24 warning** — Postiz pede Node 22.x. Funciona com aviso. Se causar problema, instalar Node 22 LTS via nvm-windows.
3. **Hydration warning no browser** — causado pela extensão Grammarly. Inofensivo.
4. **Backend OOM** — NestJS em watch mode consome >2GB RAM na compilação inicial. Solução: `$env:NODE_OPTIONS="--max-old-space-size=4096"` antes de rodar.

---

## Variáveis de ambiente
- `.env` e `.env.local` na raiz do projeto (ambos idênticos — NestJS lê `.env`, Next.js lê `.env.local`)
- Credenciais salvas em: `C:\Users\felip\OneDrive\Documentos\Kairós Media\Vocaccio\Automação\sec.txt`
- Supabase project ref: `xtjzfypktrpepwhzbvfb`
- Upstash endpoint: `funny-snake-143891.upstash.io`

---

## Próxima fase: Fase 1

**Objetivo:** Auth + CRM admin + cadastro cliente/projeto + dummy data + dashboard base

**Primeiro passo da Fase 1:**
1. Ler este checkpoint
2. Rodar `pnpm run prisma-db-push` para aplicar schema no Supabase
3. Criar `/specs/shared/auth-rbac.md` antes de qualquer código
4. Implementar NextAuth com roles (OWNER, OPERATOR, EDITOR, VIEWER_INTERNAL, GUEST_LINK)

**Pendências para resolver na Fase 1:**
- Backend com OOM: investigar configuração de memória do NestJS watch mode
- Node 22 vs 24: considerar instalar nvm-windows para trocar versões
- Prisma schema: adaptar schema do Postiz para incluir entidades Vocaccio

---

## Comando para retomar
```powershell
cd "C:\Users\felip\OneDrive\Documentos\Kairós Media\Vocaccio\Automação\vocaccio-ecosystem"
pnpm --filter ./apps/frontend run dev
# Acesso: http://localhost:4200
```
