-- AT-2: Ateliê Virtual — catálogo de serviços + fila de pedidos (cockpit /atelie/fila).
-- Additive only: 2 novos enums (ServiceOfferingCategory, ServiceDeliveryMode,
-- ServiceScopeLevel, ServiceRequestStatus) e 3 novas tabelas. Nenhuma tabela existente
-- é alterada. Ver docs/atelie/plano-atelie-virtual.md.
--
-- Escrita à mão (sem `prisma migrate dev` real — este worktree não tem node_modules/DB,
-- ver docs/auditoria/plano-leveza-2026-07.md). ANTES de aplicar em produção: rodar
-- `pnpm run prisma-generate` e conferir que o `prisma migrate diff` contra o schema não
-- aponta divergência (se apontar, é preferível descartar este arquivo e deixar o Prisma
-- gerar a migration de verdade a partir do schema já editado).
--
-- Rollback: DROP TABLE "ServiceRequestEvent"; DROP TABLE "ServiceRequest";
-- DROP TABLE "ServiceOffering"; DROP TYPE "ServiceRequestStatus";
-- DROP TYPE "ServiceScopeLevel"; DROP TYPE "ServiceDeliveryMode";
-- DROP TYPE "ServiceOfferingCategory";

-- CreateEnum
CREATE TYPE "ServiceOfferingCategory" AS ENUM ('PRESENCA_DIGITAL', 'ESTRATEGIA', 'CONTEUDO', 'INTELIGENCIA', 'AUDIOVISUAL');

-- CreateEnum
CREATE TYPE "ServiceDeliveryMode" AS ENUM ('BACKOFFICE', 'FRONTOFFICE', 'NICOLAS');

-- CreateEnum
CREATE TYPE "ServiceScopeLevel" AS ENUM ('SIMPLES', 'PADRAO', 'ROBUSTO');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('SOLICITADO', 'CONFIRMADO', 'EM_PRODUCAO', 'EM_REVISAO', 'ENTREGUE', 'APROVADO', 'ARQUIVADO');

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceOfferingCategory" NOT NULL,
    "deliveryMode" "ServiceDeliveryMode" NOT NULL DEFAULT 'BACKOFFICE',
    "briefingSchema" JSONB,
    "optionsSchema" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "briefing" JSONB NOT NULL,
    "scopeLevel" "ServiceScopeLevel" NOT NULL DEFAULT 'PADRAO',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'SOLICITADO',
    "priceRange" TEXT,
    "leadTimeRange" TEXT,
    "contextPackComplete" BOOLEAN NOT NULL DEFAULT false,
    "hasReligareProfile" BOOLEAN NOT NULL DEFAULT false,
    "deliverableUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffering_slug_key" ON "ServiceOffering"("slug");

-- CreateIndex
CREATE INDEX "ServiceOffering_active_idx" ON "ServiceOffering"("active");

-- CreateIndex
CREATE INDEX "ServiceRequest_projectId_idx" ON "ServiceRequest"("projectId");

-- CreateIndex
CREATE INDEX "ServiceRequest_orgId_idx" ON "ServiceRequest"("orgId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE INDEX "ServiceRequest_deletedAt_idx" ON "ServiceRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_orgId_status_idx" ON "ServiceRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_requestId_idx" ON "ServiceRequestEvent"("requestId");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_createdAt_idx" ON "ServiceRequestEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
