# Docker Compose Setup Guide

You have three Docker Compose options:

## Option 1: Infrastructure Only (Recommended for Development)

This runs only the database and Redis in Docker, while you run the apps locally. This is faster for development with hot-reload.

**File:** `docker-compose.dev.yaml`

```bash
# Start infrastructure
docker compose -f docker-compose.dev.yaml up -d

# Or use the npm script
pnpm run dev:docker

# Then run apps locally
pnpm run dev
```

**Access:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: http://localhost:8081 (admin@admin.com / admin)
- RedisInsight: http://localhost:5540

## Option 2: Single Container (Matches Production Pattern) ⭐ Recommended

This runs everything in one container, just like production. All services (backend, frontend, workers, cron) run together.

**File:** `docker-compose.single.yaml`

### Setup

1. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Configure your `.env`** with at minimum:
   ```env
   DATABASE_URL="postgresql://postiz-local:postiz-local-pwd@postiz-postgres:5432/postiz-db-local"
   REDIS_URL="redis://postiz-redis:6379"
   JWT_SECRET="your-secret-key-here"
   FRONTEND_URL="http://localhost:4200"
   NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
   BACKEND_INTERNAL_URL="http://localhost:3000"
   
   # TikTok Configuration
   TIKTOK_CLIENT_ID="your-tiktok-client-id"
   TIKTOK_CLIENT_SECRET="your-tiktok-client-secret"
   
   # Storage (use local for development)
   STORAGE_PROVIDER="local"
   NOT_SECURED="true"
   ```

3. **Start all services:**
   ```bash
   docker compose -f docker-compose.single.yaml up -d
   ```

4. **View logs:**
   ```bash
   # All services in one container
   docker compose -f docker-compose.single.yaml logs -f postiz
   ```

5. **Stop services:**
   ```bash
   docker compose -f docker-compose.single.yaml down
   ```

**Access:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: http://localhost:8081 (optional)
- RedisInsight: http://localhost:5540 (optional)

**Why this approach:**
- ✅ Matches production architecture
- ✅ Simpler - one container to manage
- ✅ All logs in one place
- ✅ Easier to debug TikTok issues (all services together)

## Option 3: Full Stack in Docker (Separate Containers)

This runs everything in Docker containers. Good for testing the full stack or if you don't want to install Node.js locally.

**File:** `docker-compose.full.yaml`

### Setup

1. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Configure your `.env`** with at minimum:
   ```env
   DATABASE_URL="postgresql://postiz-local:postiz-local-pwd@postiz-postgres:5432/postiz-db-local"
   REDIS_URL="redis://postiz-redis:6379"
   JWT_SECRET="your-secret-key-here"
   FRONTEND_URL="http://localhost:4200"
   NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
   BACKEND_INTERNAL_URL="http://localhost:3000"
   
   # TikTok Configuration
   TIKTOK_CLIENT_ID="your-tiktok-client-id"
   TIKTOK_CLIENT_SECRET="your-tiktok-client-secret"
   
   # Storage (use local for development)
   STORAGE_PROVIDER="local"
   NOT_SECURED="true"
   ```

3. **Start all services:**
   ```bash
   docker compose -f docker-compose.full.yaml up -d
   ```

4. **View logs:**
   ```bash
   # All services
   docker compose -f docker-compose.full.yaml logs -f
   
   # Specific service
   docker compose -f docker-compose.full.yaml logs -f postiz-backend
   docker compose -f docker-compose.full.yaml logs -f postiz-frontend
   ```

5. **Stop services:**
   ```bash
   docker compose -f docker-compose.full.yaml down
   ```

**Access:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: http://localhost:8081
- RedisInsight: http://localhost:5540

### First Time Setup

On first run, the database needs to be initialized:

```bash
# The backend will automatically run prisma-db-push on startup
# But if you need to do it manually, you can exec into the backend container:
docker compose -f docker-compose.full.yaml exec postiz-backend pnpm run prisma-db-push
```

### Troubleshooting

**Port already in use:**
- Stop any local services using ports 3000, 4200, 5432, 6379
- Or change ports in docker-compose.full.yaml

**Database connection issues:**
- Make sure postgres container is healthy: `docker compose -f docker-compose.full.yaml ps`
- Check DATABASE_URL in .env matches docker-compose settings

**Build issues:**
- Clear Docker cache: `docker compose -f docker-compose.full.yaml build --no-cache`
- Rebuild: `docker compose -f docker-compose.full.yaml up -d --build`

**View logs for debugging:**
```bash
# Backend logs (where TikTok posting happens)
docker compose -f docker-compose.full.yaml logs -f postiz-backend

# Workers logs (where posts are processed)
docker compose -f docker-compose.full.yaml logs -f postiz-workers
```

### Development Workflow

**For active development (with code changes):**
- Use Option 1 (infrastructure only) + local apps
- Hot-reload works better
- Faster iteration

**For testing/debugging TikTok:**
- Use Option 2 (single container) ⭐ Recommended
- Matches production setup
- All services together, easier to debug
- Good for testing TikTok integration end-to-end

**For microservices-style debugging:**
- Use Option 3 (separate containers)
- Each service isolated
- Can restart services independently

### TikTok Authentication in Docker

When using Docker, make sure:

1. **TikTok App Redirect URI** includes:
   - `http://localhost:4200/integrations/social/tiktok` (for local access)
   - Or your server's public URL if accessing remotely

2. **Environment variables** are set in `.env`:
   ```env
   TIKTOK_CLIENT_ID="your-client-id"
   TIKTOK_CLIENT_SECRET="your-client-secret"
   FRONTEND_URL="http://localhost:4200"
   ```

3. **Check logs** for TikTok authentication:
   ```bash
   # Single container (Option 2)
   docker compose -f docker-compose.single.yaml logs -f postiz | grep -i tiktok
   
   # Separate containers (Option 3)
   docker compose -f docker-compose.full.yaml logs -f postiz-backend | grep -i tiktok
   docker compose -f docker-compose.full.yaml logs -f postiz-workers | grep -i tiktok
   ```
