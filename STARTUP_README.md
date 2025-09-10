# Postiz Development Setup

## Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/en/download/))
- **Docker** ([Download](https://www.docker.com/products/docker-desktop))
- **pnpm** ([Install guide](https://pnpm.io/installation))

## Network Ports

- 5000/tcp: Main entry (for reverse proxy)
- 4200/tcp: Frontend (web interface)
- 3000/tcp: Backend (API)
- 5432/tcp: PostgreSQL
- 6379/tcp: Redis


## 1. Start PostgreSQL and Redis (Docker)

```sh
docker compose -f docker-compose.dev.yaml up
```

## 3. Install Dependencies

```sh
pnpm install
```

## 4. Configure Environment

Copy `.env` from drive https://drive.google.com/file/d/11XxeeVT_nHJ251Zj0U3DSJEAb4tbEgKE/view?usp=drive_link


## 5. Prepare the Database

```sh
pnpm run prisma-db-push
```

## 6. Start Development Servers

```sh
pnpm run dev
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

---

For more details, see the [official documentation](https://docs.postiz.com/installation/development).
