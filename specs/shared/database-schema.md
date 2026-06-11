# Spec — Database Schema (Fase 1)
> Schema real do Postiz analisado em 2026-06-10:
> `libraries/nestjs-libraries/src/database/prisma/schema.prisma` (970 linhas, 46 modelos).

## Delta Postiz → Vocaccio

### O que o Postiz JÁ TEM (reusar, não recriar)

| Modelo Postiz | Papel no Vocaccio |
|---|---|
| `Organization` | Tenant único = Kairós Media/Vocaccio. **1 organização só no MVP.** Clientes NÃO são Organizations — são o novo modelo `Client`. |
| `User` + `UserOrganization` | Equipe interna. Estender com `vocaccioRole` (ver auth-rbac.md) e `mustChangePassword`. |
| `Integration` | Conexões OAuth por rede social. Adicionar `projectId` opcional para vincular rede → projeto. |
| `Post` (+ State, Tags) | Motor de publicação/agendamento. Adicionar `projectId` opcional. Estados QUEUE/PUBLISHED etc. reusados. |
| `Media` | Upload de mídia. Adicionar `projectId` opcional. |
| `Notifications`, `Webhooks`, `AutoPost` | Reusar como estão. |
| `Customer`, `Orders`, `SocialMediaAgency`, marketplace | **Ignorar** (marketplace do Postiz — não usar, não deletar). |
| `mastra_*` | Infra de IA do Postiz — ignorar por ora. |

### Modelos NOVOS (Fase 1)

```prisma
enum VocaccioRole { OWNER OPERATOR EDITOR VIEWER_INTERNAL CLIENT_USER }
enum ProjectStatus { ACTIVE PAUSED ARCHIVED }
enum ToneOfVoice { FORMAL CASUAL INSPIRATIONAL TECHNICAL PLAYFUL AUTHORITATIVE }

model Client {
  id          String   @id @default(uuid())
  orgId       String                    // FK Organization (tenant)
  name        String
  status      ProjectStatus @default(ACTIVE)
  responsibleId String?                 // FK User (responsável interno)
  notes       String?                   // observações internas (tab CRM)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  projects    Project[]
  contacts    ClientContact[]
  interactions ClientInteraction[]
  @@index([orgId]) @@index([status]) @@index([deletedAt])
}

model ClientContact {
  id        String  @id @default(uuid())
  clientId  String
  name      String
  role      String?                     // cargo/função
  email     String?
  phone     String?
  @@index([clientId])
}

model ClientInteraction {                // tab Interações do CRM
  id        String   @id @default(uuid())
  clientId  String
  userId    String                      // quem registrou
  type      String                      // call | meeting | email | whatsapp | note
  summary   String
  createdAt DateTime @default(now())
  @@index([clientId]) @@index([createdAt])
}

model Project {                          // Camada 4 — cadastro global
  id          String   @id @default(uuid())
  clientId    String
  ownerId     String                    // FK User — owner do projeto
  name        String
  logoMediaId String?                   // FK Media
  businessArea String?
  socialHandles Json?                   // { instagram:"@x", tiktok:"@y", ... }
  slogan      String?
  colors      Json?                     // { primary:"#", secondary:["#","#"] }
  typography  Json?                     // { heading:"", body:"" }
  productsServices String?
  persona     Json?                     // { name, pains:[], desires:[] }
  toneOfVoice ToneOfVoice @default(CASUAL)
  website     String?
  bioLink     String?
  cta1        String?
  cta2        String?
  cta3        String?
  briefing    String?                   // texto livre
  vocationalProfileId String?           // FK → Religare (Fase 5; nullable desde já)
  locale      String   @default("pt-BR")
  timezone    String   @default("America/Sao_Paulo")
  status      ProjectStatus @default(ACTIVE)
  contextPackCache Json?                // Context Pack gerado (≤2k tokens) — Fase 4 move p/ Redis
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  accessLinks ProjectAccessLink[]
  @@index([clientId]) @@index([ownerId]) @@index([status]) @@index([deletedAt])
}

model ProjectAccessLink {                // GUEST_LINK — schema na F1, uso na F2
  id          String   @id @default(uuid())
  projectId   String
  tokenHash   String   @unique          // HMAC-SHA256, nunca o token cru
  createdById String                    // FK User
  revokedAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  events      AccessLinkEvent[]
  @@index([projectId])
}

model AccessLinkEvent {                  // log de auditoria do portal
  id        String   @id @default(uuid())
  linkId    String
  type      String                      // view | approve | request_change | comment
  ip        String?
  metadata  Json?
  createdAt DateTime @default(now())
  @@index([linkId]) @@index([createdAt])
}

model InternalTask {                     // /hub/crm/tarefas
  id         String   @id @default(uuid())
  orgId      String
  clientId   String?
  projectId  String?
  assigneeId String?
  title      String
  status     String   @default("todo")  // todo | doing | done
  dueDate    DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([orgId]) @@index([assigneeId]) @@index([status])
}
```

### Alterações em modelos Postiz existentes (mínimas, aditivas)

| Modelo | Campo novo | Motivo |
|---|---|---|
| `UserOrganization` | `vocaccioRole VocaccioRole @default(VIEWER_INTERNAL)` | RBAC Vocaccio |
| `User` | `mustChangePassword Boolean @default(false)` | troca obrigatória 1º login |
| `Integration` | `projectId String?` + index | rede social ↔ projeto |
| `Post` | `projectId String?` + index | conteúdo ↔ projeto |
| `Media` | `projectId String?` + index | asset ↔ projeto |

> Regra: **só campos aditivos e nullable** em modelos Postiz — preserva compatibilidade
> com merge de upstream e com o código existente.

### Adiado (NÃO criar na Fase 1)
- Modelos de memória (`brand_memory` etc. + pgvector) → Fase 4
- `ReviewSignal` → Fase 4
- Kanban detalhado / ContentItem de aprovação → Fase 2
- `VocationalProfile` (Religare) → Fase 5 (FK nullable já reservada em Project)

## Operacional
- Aplicar: `pnpm run prisma-db-push` (DATABASE_URL → Supabase, senha com `%40`)
- Seed: estender o seed para criar OWNER + 6 clientes dummy (ver 01-crm-admin.md)
- pgvector: ativar extensão no Supabase **só na Fase 4**
- RLS: tabelas novas já nascem com RLS (auto-RLS ativado no Supabase); policies
  explícitas por cliente/projeto na Fase 2 (quando o portal expõe dados)

## Critérios de aceite
- [ ] `prisma db push` aplica sem destruir tabelas Postiz
- [ ] `prisma generate` compila; backend sobe sem erro de schema
- [ ] Seed cria 1 OWNER + 6 Clients + 6 Projects + tarefas/interações dummy
- [ ] Nenhum campo de modelo Postiz alterado de forma não-aditiva
