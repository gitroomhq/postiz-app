# Postiz - Guia de Setup Local (Desenvolvimento e Producao)

## Indice

1. [Pre-requisitos](#pre-requisitos)
2. [Ferramentas Necessarias](#ferramentas-necessarias)
3. [Setup para Desenvolvimento](#setup-para-desenvolvimento)
4. [Setup para Producao Local](#setup-para-producao-local)
5. [URLs e Portas](#urls-e-portas)
6. [Ferramentas de Debug/Admin](#ferramentas-de-debugadmin)
7. [Comandos Uteis](#comandos-uteis)
8. [Variaveis de Ambiente](#variaveis-de-ambiente)
9. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

| Ferramenta    | Versao Requerida         | Motivo                                      |
|---------------|--------------------------|---------------------------------------------|
| **Node.js**   | `>=22.12.0 <23.0.0`     | Runtime do projeto (definido em `engines`)   |
| **pnpm**      | `10.6.1`                 | Gerenciador de pacotes (definido em `packageManager`) |
| **Docker**    | Ultima versao estavel    | Para PostgreSQL, Redis, Temporal e servicos  |
| **Docker Compose** | v2+               | Orquestracao dos containers                  |
| **Git**       | Qualquer versao recente  | Controle de versao                           |

### Instalar Node.js 22

```bash
# Via nvm (recomendado)
nvm install 22
nvm use 22
node -v 
```

### Instalar pnpm

```bash
# Via corepack (recomendado, ja vem com Node.js)
corepack enable
corepack prepare pnpm@10.6.1 --activate

# Ou via npm
npm install -g pnpm@10.6.1
```

---

## Ferramentas Necessarias

### Obrigatorias
- **Node.js 22** - Runtime JavaScript
- **pnpm 10.6.1** - Gerenciador de pacotes (NUNCA use npm ou yarn)
- **Docker + Docker Compose** - Para os servicos de infraestrutura

### Opcionais (mas recomendadas)
- **pgAdmin** - Interface web para gerenciar PostgreSQL (ja incluso no docker-compose.dev.yaml)
- **RedisInsight** - Interface web para gerenciar Redis (ja incluso no docker-compose.dev.yaml)
- **Temporal UI** - Interface web para monitorar workflows (ja incluso no docker-compose.dev.yaml)

---

## Setup para Desenvolvimento

### Passo 1: Clonar o repositorio (se ainda nao fez)

```bash
git clone <url-do-repositorio>
cd robo-multipost
```

### Passo 2: Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com os valores minimos obrigatorios:

```env
# Obrigatorios
DATABASE_URL="postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="coloque-uma-string-aleatoria-longa-aqui"

# URLs do projeto
FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
BACKEND_INTERNAL_URL="http://localhost:3000"

# Storage local
STORAGE_PROVIDER="local"

# Developer Settings
NX_ADD_PLUGINS=false
IS_GENERAL="true"
```

> **IMPORTANTE:** O `DATABASE_URL` deve bater com as credenciais do PostgreSQL no `docker-compose.dev.yaml` (usuario: `postiz-local`, senha: `postiz-local-pwd`, db: `postiz-db-local`).

### Passo 3: Subir os servicos de infraestrutura

```bash
pnpm run dev:docker
```

Isso sobe via `docker-compose.dev.yaml`:
- **PostgreSQL 17** na porta `5432`
- **Redis 7** na porta `6379`
- **pgAdmin** na porta `8081`
- **RedisInsight** na porta `5540`
- **Temporal** (Elasticsearch + PostgreSQL + Server + Admin Tools + UI)
  - Temporal Server na porta `7233`
  - Temporal UI na porta `8080`

Aguarde todos os containers ficarem saudaveis:

```bash
docker ps
```

### Passo 4: Instalar dependencias

```bash
pnpm install
```

> O `postinstall` roda automaticamente o `prisma-generate` para gerar o client do Prisma.

### Passo 5: Criar/atualizar o schema do banco de dados

```bash
pnpm run prisma-db-push
```

Isso aplica o schema Prisma (`libraries/nestjs-libraries/src/database/prisma/schema.prisma`) diretamente no PostgreSQL.

### Passo 6: Rodar o projeto em modo de desenvolvimento

```bash
pnpm run dev
```

Isso inicia em paralelo:
- **Backend** (NestJS) - porta `3000`
- **Frontend** (Vite + React) - porta `4200`
- **Orchestrator** (Temporal workers) - conecta ao Temporal na porta `7233`
- **Extension** (Browser extension)

### Atalhos para rodar partes individuais

```bash
# Apenas backend + frontend (sem orchestrator)
pnpm run dev-backend

# Apenas backend
pnpm run dev:backend

# Apenas frontend
pnpm run dev:frontend

# Apenas orchestrator
pnpm run dev:orchestrator
# Rodar com front + back + orchestrator em porta distinta
pnpm run --filter ./apps/orchestrator --filter ./apps/backend --filter ./apps/frontend --parallel dev


```

### Desenvolvimento com Stripe (opcional)

```bash
pnpm run dev:stripe
```

Isso sobe o listener do Stripe CLI + o servidor de desenvolvimento.

---

## Setup para Producao Local

Ha duas formas de rodar em producao localmente:

### Opcao A: Build manual + PM2

#### Passo 1: Subir infraestrutura

```bash
pnpm run dev:docker
```

#### Passo 2: Instalar dependencias

```bash
pnpm install
```

#### Passo 3: Build do projeto

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

Isso faz o build sequencial de:
1. Frontend (Vite/React)
2. Backend (NestJS)
3. Orchestrator (NestJS)

#### Passo 4: Push do schema no banco

```bash
pnpm run prisma-db-push
```

#### Passo 5: Iniciar com PM2

```bash
# Instalar PM2 globalmente (se nao tiver)
npm install -g pm2

# Rodar
pnpm run pm2
```

Isso executa: limpa processos PM2 anteriores, push do prisma, e sobe todos os servicos via PM2.

#### Rodar servicos individuais em producao

```bash
# Frontend
pnpm run start:prod:frontend

# Backend
pnpm run start:prod:backend

# Orchestrator
pnpm run start:prod:orchestrator
```

### Opcao B: Docker Compose completo (producao containerizada)

#### Passo 1: Subir tudo com Docker Compose

```bash
docker compose up -d
```

Isso usa o `docker-compose.yaml` que inclui:
- **Postiz App** (imagem pre-construida) na porta `4007` -> `5000` internamente
- **PostgreSQL 17**
- **Redis 7.2**
- **Spotlight** (Sentry debug) na porta `8969`
- **Temporal Stack** completo

#### Configurar variaveis

As variaveis de ambiente ja estao definidas no `docker-compose.yaml`. Para customizar, edite diretamente no arquivo ou use um `.env`.

**URLs de producao Docker:**
- App: `http://localhost:4007`
- API: `http://localhost:4007/api` (proxy via Nginx interno)

### Opcao C: Build Docker manual (Dockerfile.dev)

```bash
# Build da imagem
docker build -t postiz-local -f Dockerfile.dev .

# Rodar (ajuste as env vars conforme necessario)
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://postiz-user:postiz-password@host.docker.internal:5432/postiz-db-local" \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  -e JWT_SECRET="sua-secret-aqui" \
  -e FRONTEND_URL="http://localhost:5000" \
  -e NEXT_PUBLIC_BACKEND_URL="http://localhost:5000/api" \
  -e BACKEND_INTERNAL_URL="http://localhost:3000" \
  -e IS_GENERAL="true" \
  -e STORAGE_PROVIDER="local" \
  postiz-local
```

A imagem Docker usa:
- Node.js 22 (bookworm-slim)
- pnpm para instalar dependencias
- Build completo do projeto
- Nginx como reverse proxy (porta 5000)
  - `/` -> Frontend (porta 4200)
  - `/api/` -> Backend (porta 3000)
  - `/uploads/` -> Arquivos locais
- PM2 para gerenciamento de processos

---

## URLs e Portas

### Desenvolvimento

| Servico              | URL                          | Porta |
|----------------------|------------------------------|-------|
| Frontend             | http://localhost:4200        | 4200  |
| Backend API          | http://localhost:3000        | 3000  |
| PostgreSQL           | localhost                    | 5432  |
| Redis                | localhost                    | 6379  |
| pgAdmin              | http://localhost:8081        | 8081  |
| RedisInsight         | http://localhost:5540        | 5540  |
| Temporal Server      | localhost                    | 7233  |
| Temporal UI          | http://localhost:8080        | 8080  |

### Producao (Docker Compose)

| Servico              | URL                          | Porta |
|----------------------|------------------------------|-------|
| App (Nginx proxy)    | http://localhost:4007        | 4007  |
| API (via proxy)      | http://localhost:4007/api    | 4007  |
| Spotlight (Sentry)   | http://localhost:8969        | 8969  |
| Temporal UI          | http://localhost:8080        | 8080  |

---

## Ferramentas de Debug/Admin

### pgAdmin (Gerenciar PostgreSQL)

- URL: http://localhost:8081
- Login: `admin@admin.com` / `admin`
- Ao adicionar servidor, use:
  - Host: `postiz-postgres` (dentro do Docker) ou `localhost` (fora)
  - Port: `5432`
  - User: `postiz-local`
  - Password: `postiz-local-pwd`
  - Database: `postiz-db-local`

### RedisInsight (Gerenciar Redis)

- URL: http://localhost:5540
- Adicionar database: `localhost:6379` (ou `postiz-redis:6379` dentro do Docker)

### Temporal UI (Monitorar Workflows)

- URL: http://localhost:8080
- Visualize workflows, activities e execucoes do orchestrator

---

## Comandos Uteis

```bash
# Desenvolvimento
pnpm run dev                    # Roda tudo (backend + frontend + orchestrator + extension)
pnpm run dev-backend            # Roda backend + frontend
pnpm run dev:docker             # Sobe containers de infraestrutura

# Build
pnpm run build                  # Build de tudo (frontend + backend + orchestrator)
pnpm run build:frontend         # Build apenas do frontend
pnpm run build:backend          # Build apenas do backend
pnpm run build:orchestrator     # Build apenas do orchestrator

# Producao
pnpm run pm2                    # Roda em producao com PM2
pnpm run start:prod:frontend    # Roda frontend em producao
pnpm run start:prod:backend     # Roda backend em producao
pnpm run start:prod:orchestrator # Roda orchestrator em producao

# Banco de Dados (Prisma)
pnpm run prisma-db-push         # Aplica schema no banco
pnpm run prisma-db-pull         # Puxa schema do banco
pnpm run prisma-generate        # Gera o Prisma Client
pnpm run prisma-reset           # CUIDADO: Reseta o banco completamente

# Testes
pnpm run test                   # Roda testes com cobertura

# Docker
pnpm run docker-build           # Build da imagem Docker
docker compose up -d            # Sobe producao completa
docker compose -f docker-compose.dev.yaml up -d  # Sobe infraestrutura dev
```

---

## Variaveis de Ambiente

### Obrigatorias

| Variavel                     | Descricao                          | Valor Dev                                                           |
|------------------------------|------------------------------------|---------------------------------------------------------------------|
| `DATABASE_URL`               | URL do PostgreSQL                  | `postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local` |
| `REDIS_URL`                  | URL do Redis                       | `redis://localhost:6379`                                            |
| `JWT_SECRET`                 | Secret para tokens JWT             | Qualquer string longa e aleatoria                                   |
| `FRONTEND_URL`               | URL do frontend                    | `http://localhost:4200`                                             |
| `NEXT_PUBLIC_BACKEND_URL`    | URL publica da API                 | `http://localhost:3000`                                             |
| `BACKEND_INTERNAL_URL`       | URL interna da API                 | `http://localhost:3000`                                             |
| `IS_GENERAL`                 | Modo geral                         | `true`                                                              |
| `NX_ADD_PLUGINS`             | Desabilita auto-discovery NX       | `false`                                                             |

### Opcionais Importantes

| Variavel                     | Descricao                          |
|------------------------------|-------------------------------------|
| `STORAGE_PROVIDER`           | `local` ou `cloudflare`            |
| `UPLOAD_DIRECTORY`           | Diretorio para uploads locais      |
| `OPENAI_API_KEY`             | Para funcionalidades de IA          |
| `X_API_KEY` / `X_API_SECRET` | Twitter/X API                      |
| `FACEBOOK_APP_ID/SECRET`     | Facebook/Instagram API             |
| `LINKEDIN_CLIENT_ID/SECRET`  | LinkedIn API                       |
| `TIKTOK_CLIENT_ID/SECRET`    | TikTok API                         |
| Stripe vars                  | Para pagamentos                     |
| Email vars                   | Para envio de emails                |

Consulte o `.env.example` para a lista completa de variaveis.

---

## Troubleshooting

### Erro de conexao com PostgreSQL

```
Error: Can't reach database server at localhost:5432
```

**Solucao:** Verifique se os containers estao rodando:
```bash
docker ps | grep postiz-postgres
```

### Erro de conexao com Redis

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solucao:** Verifique se o Redis esta rodando:
```bash
docker ps | grep postiz-redis
```

### Erro no Prisma generate

```
Error: Cannot find module '.prisma/client'
```

**Solucao:**
```bash
pnpm run prisma-generate
```

### Erro de memoria no build

```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solucao:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### Porta ja em uso

```bash
# Verificar o que esta usando a porta (ex: 3000)
lsof -i :3000

# Matar o processo
kill -9 <PID>
```

### Temporal nao conecta

Verifique se o Temporal e suas dependencias estao rodando:
```bash
docker ps | grep temporal
```

O Temporal precisa do Elasticsearch e do PostgreSQL dedicado dele (separados do PostgreSQL do Postiz).

### Resetar tudo (desenvolvimento)

```bash
# Parar containers
docker compose -f docker-compose.dev.yaml down -v

# Remover node_modules
rm -rf node_modules

# Reinstalar
pnpm install

# Subir containers novamente
pnpm run dev:docker

# Push do schema
pnpm run prisma-db-push

# Rodar
pnpm run dev
```

# Dica 
se algum processo ficar preso, use kill -9 $(lsof -ti :3000 :4200) 
ou
  lsof -ti:4200 | xargs kill -9; lsof -ti:3000 | xargs kill -9; pnpm run --filter ./apps/orchestrator --filter ./apps/backend --filter ./apps/frontend --parallel dev

  ou 

  pkill -f "nest start --watch" 2>/dev/null; pkill -f "pnpm run --filter ./apps" 2>/dev/null; sleep 1; pnpm run --filter ./apps/orchestrator --filter ./apps/backend --filter ./apps/frontend --parallel dev

  rm -rf apps/frontend/.next pkill -f "nest start --watch" 2>/dev/null; lsof -ti:4200,3000 | xargs kill -9 2>/dev/null; sleep 1; pnpm run --filter ./apps/orchestrator --filter ./apps/backend --filter ./apps/frontend --parallel dev

