# Deploying Postiz on Hostinger VPS

This guide walks you through deploying Postiz to `schedule.boldslate.com` using Hostinger VPS.

---

## Step 1: Get Your VPS

1. Log into [Hostinger](https://www.hostinger.com)
2. Go to **VPS** → **Create or Buy VPS**
3. Choose **KVM 2** (8GB RAM, 2 vCPU) — recommended for Postiz
4. Select data center closest to your users (US if targeting US)
5. Complete purchase

---

## Step 2: Install Docker Template

1. In Hostinger panel, go to your VPS → **Settings** → **OS & Panel** → **Operating System**
2. Click **Change OS**
3. Search for **Docker** under Applications
4. Select **Ubuntu 24.04 with Docker**
5. Set a strong root password (save this!)
6. Click **Change OS** and wait ~2-3 minutes

Your VPS now has Docker + Docker Compose pre-installed.

---

## Step 3: Point Your Domain

In your DNS provider (Cloudflare, Hostinger DNS, etc.):

```
Type: A
Name: schedule
Value: [YOUR VPS IP ADDRESS]
TTL: Auto
Proxy: Off (for now — can enable later)
```

Find your VPS IP in Hostinger panel → VPS → **Overview**

Wait 5-10 minutes for DNS to propagate. Test with:
```bash
ping schedule.boldslate.com
```

---

## Step 4: Connect to Your VPS

### Option A: Hostinger Browser Terminal
- VPS → **Overview** → **Browser terminal**

### Option B: SSH from your Mac
```bash
ssh root@[YOUR_VPS_IP]
# or after DNS propagates:
ssh root@schedule.boldslate.com
```

---

## Step 5: Create Project Directory

```bash
mkdir -p /opt/postiz
cd /opt/postiz
```

---

## Step 6: Create Environment File

```bash
nano .env
```

Paste this and fill in your values:

```env
# === Required Settings ===
JWT_SECRET="REPLACE_WITH_RANDOM_64_CHAR_STRING"

# URLs - replace with your actual domain
MAIN_URL="https://schedule.boldslate.com"
FRONTEND_URL="https://schedule.boldslate.com"
NEXT_PUBLIC_BACKEND_URL="https://schedule.boldslate.com/api"
BACKEND_INTERNAL_URL="http://postiz:5000"

# Database (internal Docker network - don't change)
DATABASE_URL="postgresql://postiz:postiz-secure-password-change-me@postgres:5432/postiz"
REDIS_URL="redis://redis:6379"

# === Storage ===
STORAGE_PROVIDER="local"
UPLOAD_DIRECTORY="/uploads"
NEXT_PUBLIC_UPLOAD_DIRECTORY="/uploads"

# === Optional: AI Features ===
OPENAI_API_KEY=""

# === Social Media API Keys ===
# Add these as you connect each platform

# X (Twitter)
X_API_KEY=""
X_API_SECRET=""

# LinkedIn
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""

# Facebook/Instagram/Threads
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
THREADS_APP_ID=""
THREADS_APP_SECRET=""

# TikTok
TIKTOK_CLIENT_ID=""
TIKTOK_CLIENT_SECRET=""

# YouTube
YOUTUBE_CLIENT_ID=""
YOUTUBE_CLIENT_SECRET=""

# Reddit
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""

# Discord
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
DISCORD_BOT_TOKEN_ID=""

# Slack
SLACK_ID=""
SLACK_SECRET=""
SLACK_SIGNING_SECRET=""

# Pinterest
PINTEREST_CLIENT_ID=""
PINTEREST_CLIENT_SECRET=""

# Mastodon
MASTODON_URL="https://mastodon.social"
MASTODON_CLIENT_ID=""
MASTODON_CLIENT_SECRET=""

# === Other Settings ===
IS_GENERAL="true"
DISABLE_REGISTRATION="false"
NX_ADD_PLUGINS="false"
```

Save: `Ctrl+X`, then `Y`, then `Enter`

**Generate a random JWT secret:**
```bash
openssl rand -hex 32
```

---

## Step 7: Create Docker Compose File

```bash
nano docker-compose.yml
```

Paste:

```yaml
services:
  postiz:
    image: ghcr.io/gitroomhq/postiz-app:latest
    container_name: postiz
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: "postgresql://postiz:postiz-secure-password-change-me@postgres:5432/postiz"
      REDIS_URL: "redis://redis:6379"
      BACKEND_INTERNAL_URL: "http://localhost:3000"
      TEMPORAL_ADDRESS: "temporal:7233"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      temporal:
        condition: service_started
    volumes:
      - postiz-uploads:/uploads
    networks:
      - postiz-network
      - temporal-network

  postgres:
    image: postgres:17-alpine
    container_name: postiz-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postiz
      POSTGRES_PASSWORD: postiz-secure-password-change-me
      POSTGRES_DB: postiz
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - postiz-network
    healthcheck:
      test: pg_isready -U postiz -d postiz
      interval: 10s
      timeout: 3s
      retries: 3

  redis:
    image: redis:7.2-alpine
    container_name: postiz-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - postiz-network
    healthcheck:
      test: redis-cli ping
      interval: 10s
      timeout: 3s
      retries: 3

  # --- Temporal (Background Job Processing) ---
  temporal:
    image: temporalio/auto-setup:latest
    container_name: temporal
    restart: unless-stopped
    environment:
      - DB=postgres12
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal-password
      - POSTGRES_SEEDS=temporal-postgres
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
    depends_on:
      - temporal-postgres
    networks:
      - temporal-network
    volumes:
      - ./dynamicconfig:/etc/temporal/config/dynamicconfig

  temporal-postgres:
    image: postgres:16-alpine
    container_name: temporal-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal-password
    volumes:
      - temporal-postgres-data:/var/lib/postgresql/data
    networks:
      - temporal-network

  # --- Caddy (Reverse Proxy + Auto HTTPS) ---
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - postiz-network

volumes:
  postgres-data:
  redis-data:
  temporal-postgres-data:
  postiz-uploads:
  caddy-data:
  caddy-config:

networks:
  postiz-network:
  temporal-network:
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 8: Create Caddy Config (Auto HTTPS)

```bash
nano Caddyfile
```

Paste:

```
schedule.boldslate.com {
    reverse_proxy postiz:5000
}
```

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 9: Create Temporal Config Directory

```bash
mkdir -p dynamicconfig
nano dynamicconfig/development-sql.yaml
```

Paste:

```yaml
system.forceSearchAttributesCacheRefreshOnRead:
  - value: true
    constraints: {}
```

Save.

---

## Step 10: Start Everything

```bash
docker compose up -d
```

Watch the logs:
```bash
docker compose logs -f
```

Wait 2-3 minutes for everything to start. Look for:
- `postiz` container running
- `caddy` obtaining SSL certificate

---

## Step 11: Verify It's Working

Visit: **https://schedule.boldslate.com**

You should see the Postiz login/signup page with a valid HTTPS certificate.

---

## Step 12: Create Your Account

1. Go to https://schedule.boldslate.com
2. Click **Sign Up**
3. Create your account
4. (Optional) Set `DISABLE_REGISTRATION=true` in `.env` after creating your account to prevent others from signing up

To apply env changes:
```bash
docker compose down
docker compose up -d
```

---

## Useful Commands

```bash
# View running containers
docker ps

# View logs
docker compose logs -f postiz
docker compose logs -f caddy

# Restart everything
docker compose restart

# Stop everything
docker compose down

# Update to latest Postiz version
docker compose pull
docker compose up -d

# Check disk space
df -h
```

---

## Adding Social Media Accounts

Each platform requires API credentials. See [Postiz Provider Docs](https://docs.postiz.com/providers) for setup guides:

1. Create developer app on each platform
2. Add credentials to `.env`
3. Restart: `docker compose down && docker compose up -d`
4. Connect account in Postiz UI

---

## Troubleshooting

### Site not loading
```bash
# Check if containers are running
docker ps

# Check Caddy logs (SSL issues)
docker compose logs caddy

# Check Postiz logs
docker compose logs postiz
```

### Database connection errors
```bash
# Check postgres is healthy
docker compose logs postgres
```

### Out of memory
```bash
# Check memory usage
free -h
docker stats
```

If running low, consider upgrading to KVM 4.

---

## Backup Strategy

Hostinger includes weekly automatic backups. For manual backups:

```bash
# Backup database
docker exec postiz-postgres pg_dump -U postiz postiz > backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz /opt/postiz/uploads
```

---

## Next Steps

- [ ] VPS purchased and Docker template installed
- [ ] DNS pointing to VPS
- [ ] Docker Compose running
- [ ] HTTPS working
- [ ] Account created
- [ ] Registration disabled (if single user)
- [ ] Social accounts connected
- [ ] First post scheduled!
