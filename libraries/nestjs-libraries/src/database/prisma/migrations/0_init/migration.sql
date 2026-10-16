-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "From" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "State" AS ENUM ('QUEUE', 'PUBLISHED', 'ERROR', 'DRAFT');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STANDARD', 'PRO', 'TEAM', 'ULTIMATE');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('LOCAL', 'GITHUB', 'GOOGLE', 'APPLE', 'FARCASTER', 'WALLET', 'GENERIC');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "APPROVED_SUBMIT_FOR_ORDER" AS ENUM ('NO', 'WAITING_CONFIRMATION', 'YES');

-- CreateEnum
CREATE TYPE "CreationMethod" AS ENUM ('UNKNOWN', 'WEB', 'MCP', 'API', 'AUTOPOST', 'CLI');

-- CreateEnum
CREATE TYPE "ShortLinkPreference" AS ENUM ('ASK', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "AnnouncementColor" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "apiKey" TEXT,
    "paymentId" TEXT,
    "streakSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "allowTrial" BOOLEAN NOT NULL DEFAULT false,
    "isTrailing" BOOLEAN NOT NULL DEFAULT false,
    "shortlink" "ShortLinkPreference" NOT NULL DEFAULT 'ASK',

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagsPosts" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagsPosts_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "providerName" "Provider" NOT NULL,
    "name" TEXT,
    "lastName" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "audience" INTEGER NOT NULL DEFAULT 0,
    "pictureId" TEXT,
    "providerId" TEXT,
    "timezone" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReadNotifications" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteId" TEXT,
    "activated" BOOLEAN NOT NULL DEFAULT true,
    "account" TEXT,
    "connectedAccount" BOOLEAN NOT NULL DEFAULT false,
    "lastOnline" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "agent" TEXT,
    "deletedAt" TIMESTAMP(3),
    "sendSuccessEmails" BOOLEAN NOT NULL DEFAULT true,
    "sendFailureEmails" BOOLEAN NOT NULL DEFAULT true,
    "sendStreakEmails" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedCodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedCodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrganization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHub" (
    "id" TEXT NOT NULL,
    "login" TEXT,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "jobId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trending" (
    "id" TEXT NOT NULL,
    "trendingList" TEXT NOT NULL,
    "language" TEXT,
    "hash" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingLog" (
    "id" TEXT NOT NULL,
    "language" TEXT,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "ItemUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Star" (
    "id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "totalStars" INTEGER NOT NULL,
    "forks" INTEGER NOT NULL,
    "totalForks" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "path" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'image',
    "thumbnail" TEXT,
    "alt" TEXT,
    "thumbnailTimestamp" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "processingError" TEXT,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaAgency" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoId" TEXT,
    "website" TEXT,
    "slug" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "linkedIn" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "otherSocialMedia" TEXT,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SocialMediaAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaAgencyNiche" (
    "agencyId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,

    CONSTRAINT "SocialMediaAgencyNiche_pkey" PRIMARY KEY ("agencyId","niche")
);

-- CreateTable
CREATE TABLE "Credits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ai_images',

    CONSTRAINT "Credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clipping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'analysing',
    "error" TEXT,
    "title" TEXT,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "maxClips" INTEGER NOT NULL DEFAULT 5,
    "fit" TEXT NOT NULL DEFAULT 'blur',
    "integrations" TEXT NOT NULL,
    "creditsId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClippingClip" (
    "id" TEXT NOT NULL,
    "clippingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "start" DOUBLE PRECISION NOT NULL,
    "end" DOUBLE PRECISION NOT NULL,
    "trimStart" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "mediaId" TEXT,
    "path" TEXT,
    "thumbnail" TEXT,
    "draftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClippingClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionTier" "SubscriptionTier" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "identifier" TEXT,
    "cancelAt" TIMESTAMP(3),
    "period" "Period" NOT NULL,
    "totalChannels" INTEGER NOT NULL,
    "isLifetime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customName" TEXT,
    "picture" TEXT,
    "providerIdentifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "tokenExpiration" TIMESTAMP(3),
    "refreshToken" TEXT,
    "profile" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "inBetweenSteps" BOOLEAN NOT NULL DEFAULT false,
    "refreshNeeded" BOOLEAN NOT NULL DEFAULT false,
    "postingTimes" TEXT NOT NULL DEFAULT '[{"time":120}, {"time":400}, {"time":700}]',
    "customInstanceDetails" TEXT,
    "customerId" TEXT,
    "rootInternalId" TEXT,
    "additionalSettings" TEXT DEFAULT '[]',

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signatures" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "autoAdd" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "parentId" TEXT,
    "anchorStart" INTEGER,
    "anchorEnd" INTEGER,
    "anchorQuote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "state" "State" NOT NULL DEFAULT 'QUEUE',
    "publishDate" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "delay" INTEGER NOT NULL DEFAULT 0,
    "group" TEXT NOT NULL,
    "batchId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "parentPostId" TEXT,
    "releaseId" TEXT,
    "releaseURL" TEXT,
    "settings" TEXT,
    "image" TEXT,
    "submittedForOrderId" TEXT,
    "submittedForOrganizationId" TEXT,
    "approvedSubmitForOrder" "APPROVED_SUBMIT_FOR_ORDER" NOT NULL DEFAULT 'NO',
    "creationMethod" "CreationMethod" NOT NULL DEFAULT 'UNKNOWN',
    "lastMessageId" TEXT,
    "intervalInDays" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagesGroup" (
    "id" TEXT NOT NULL,
    "buyerOrganizationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagesGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutProblems" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutProblems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "messageGroupId" TEXT NOT NULL,
    "captureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItems" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Messages" (
    "id" TEXT NOT NULL,
    "from" "From" NOT NULL,
    "content" TEXT,
    "groupId" TEXT NOT NULL,
    "special" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plugs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plugFunction" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExisingPlugData" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ExisingPlugData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopularPosts" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopularPosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationsWebhooks" (
    "integrationId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,

    CONSTRAINT "IntegrationsWebhooks_pkey" PRIMARY KEY ("integrationId","webhookId")
);

-- CreateTable
CREATE TABLE "Webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "onSlot" BOOLEAN NOT NULL,
    "syncLast" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "lastUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "addPicture" BOOLEAN NOT NULL,
    "generateContent" BOOLEAN NOT NULL,
    "integrations" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdParty" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ThirdParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Errors" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "Errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentions" (
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "Mentions_pkey" PRIMARY KEY ("name","username","platform","image")
);

-- CreateTable
CREATE TABLE "mastra_ai_spans" (
    "traceId" TEXT NOT NULL,
    "spanId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "name" TEXT NOT NULL,
    "scope" JSONB,
    "spanType" TEXT NOT NULL,
    "attributes" JSONB,
    "metadata" JSONB,
    "links" JSONB,
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "startedAt" TIMESTAMP(6) NOT NULL,
    "endedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6),
    "isEvent" BOOLEAN NOT NULL,
    "startedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "endedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityName" TEXT,
    "parentEntityType" TEXT,
    "parentEntityId" TEXT,
    "parentEntityName" TEXT,
    "rootEntityType" TEXT,
    "rootEntityId" TEXT,
    "rootEntityName" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "resourceId" TEXT,
    "runId" TEXT,
    "sessionId" TEXT,
    "threadId" TEXT,
    "requestId" TEXT,
    "environment" TEXT,
    "serviceName" TEXT,
    "experimentId" TEXT,
    "source" TEXT,
    "tags" JSONB,
    "requestContext" JSONB,
    "entityVersionId" TEXT,
    "parentEntityVersionId" TEXT,
    "rootEntityVersionId" TEXT,

    CONSTRAINT "public_mastra_ai_spans_traceid_spanid_pk" PRIMARY KEY ("traceId","spanId")
);

-- CreateTable
CREATE TABLE "mastra_evals" (
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "agent_name" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "test_info" JSONB,
    "global_run_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6),
    "created_atZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mastra_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "resourceId" TEXT,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_resources" (
    "id" TEXT NOT NULL,
    "workingMemory" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_scorers" (
    "id" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "traceId" TEXT,
    "runId" TEXT NOT NULL,
    "scorer" JSONB NOT NULL,
    "preprocessStepResult" JSONB,
    "extractStepResult" JSONB,
    "analyzeStepResult" JSONB,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "preprocessPrompt" TEXT,
    "extractPrompt" TEXT,
    "generateScorePrompt" TEXT,
    "generateReasonPrompt" TEXT,
    "analyzePrompt" TEXT,
    "reasonPrompt" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "additionalContext" JSONB,
    "runtimeContext" JSONB,
    "entityType" TEXT,
    "entity" JSONB,
    "entityId" TEXT,
    "source" TEXT NOT NULL,
    "resourceId" TEXT,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "spanId" TEXT,
    "requestContext" JSONB,
    "organizationId" TEXT,
    "projectId" TEXT,
    "batchId" TEXT,
    "datasetId" TEXT,
    "datasetItemId" TEXT,

    CONSTRAINT "mastra_scorers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_threads" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_traces" (
    "id" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "name" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" INTEGER NOT NULL,
    "attributes" JSONB,
    "status" JSONB,
    "events" JSONB,
    "links" JSONB,
    "other" TEXT,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_workflow_snapshot" (
    "workflow_name" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "resourceId" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mastra_agent_versions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "model" JSONB NOT NULL,
    "tools" JSONB,
    "defaultOptions" JSONB,
    "workflows" JSONB,
    "agents" JSONB,
    "integrationTools" JSONB,
    "inputProcessors" JSONB,
    "outputProcessors" JSONB,
    "memory" JSONB,
    "scorers" JSONB,
    "mcpClients" JSONB,
    "requestContextSchema" JSONB,
    "workspace" JSONB,
    "skills" JSONB,
    "skillsFormat" TEXT,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "durable" JSONB,
    "browser" JSONB,
    "toolProviders" JSONB,

    CONSTRAINT "mastra_agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_agents" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT,
    "favoriteCount" INTEGER,

    CONSTRAINT "mastra_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_background_tasks" (
    "id" TEXT NOT NULL,
    "tool_call_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "resource_id" TEXT,
    "status" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "result" JSONB,
    "error" JSONB,
    "suspend_payload" JSONB,
    "retry_count" INTEGER NOT NULL,
    "max_retries" INTEGER NOT NULL,
    "timeout_ms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "startedAt" TIMESTAMP(6),
    "suspendedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "startedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "suspendedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_background_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_channel_config" (
    "platform" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_channel_config_pkey" PRIMARY KEY ("platform")
);

-- CreateTable
CREATE TABLE "mastra_channel_installations" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "webhookId" TEXT,
    "data" JSONB NOT NULL,
    "configHash" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_channel_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_dataset_items" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersion" INTEGER NOT NULL,
    "validTo" INTEGER,
    "isDeleted" BOOLEAN NOT NULL,
    "input" JSONB NOT NULL,
    "groundTruth" JSONB,
    "requestContext" JSONB,
    "metadata" JSONB,
    "source" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expectedTrajectory" JSONB,
    "organizationId" TEXT,
    "projectId" TEXT,
    "toolMocks" JSONB,
    "unmockedToolPolicy" TEXT,
    "scorerIds" JSONB,
    "externalId" TEXT,

    CONSTRAINT "mastra_dataset_items_pkey" PRIMARY KEY ("id","datasetVersion")
);

-- CreateTable
CREATE TABLE "mastra_dataset_versions" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "inputSchema" JSONB,
    "groundTruthSchema" JSONB,
    "requestContextSchema" JSONB,
    "tags" JSONB,
    "targetType" TEXT,
    "targetIds" JSONB,
    "scorerIds" JSONB,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "projectId" TEXT,
    "candidateKey" TEXT,
    "candidateId" TEXT,

    CONSTRAINT "mastra_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_experiment_results" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemDatasetVersion" INTEGER,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "groundTruth" JSONB,
    "error" JSONB,
    "startedAt" TIMESTAMP(6) NOT NULL,
    "completedAt" TIMESTAMP(6) NOT NULL,
    "retryCount" INTEGER NOT NULL,
    "traceId" TEXT,
    "status" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "startedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "toolMockReport" JSONB,
    "metadata" JSONB,
    "organizationId" TEXT,
    "projectId" TEXT,
    "attempt" INTEGER,

    CONSTRAINT "mastra_experiment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "datasetId" TEXT,
    "datasetVersion" INTEGER,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "succeededCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "agentVersion" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "startedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "projectId" TEXT,
    "provenance" JSONB,
    "runnerAttestation" JSONB,
    "experimentSetId" TEXT,
    "comparisonId" TEXT,
    "variantId" TEXT,
    "trialIndex" INTEGER,
    "scorerIds" JSONB,

    CONSTRAINT "mastra_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_favorites" (
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_favorites_pkey" PRIMARY KEY ("userId","entityType","entityId")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_activity" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "sourceThreadId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_knowledge_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_cursors" (
    "sourceThreadId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "lastKnowledgeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_knowledge_cursors_pkey" PRIMARY KEY ("sourceThreadId","agent")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_mentions" (
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "mastra_knowledge_mentions_pkey" PRIMARY KEY ("sourceType","sourceId","recordId")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_nodes" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "kind" TEXT,
    "content" TEXT,
    "description" TEXT,
    "scope" JSONB NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "mergedInto" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_records" (
    "id" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "sourceThreadId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(6) NOT NULL,
    "when" TIMESTAMP(6),
    "maxScope" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(6),
    "deletedBy" TEXT,
    "capturedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "whenZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deletedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_knowledge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_knowledge_semantic_outbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "availableAt" TIMESTAMP(6) NOT NULL,
    "claimedAt" TIMESTAMP(6),
    "claimedBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "completedAt" TIMESTAMP(6),
    "availableAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "claimedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_knowledge_semantic_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_mcp_client_versions" (
    "id" TEXT NOT NULL,
    "mcpClientId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "servers" JSONB NOT NULL,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_mcp_client_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_mcp_clients" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_mcp_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_mcp_server_versions" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "repository" JSONB,
    "releaseDate" TEXT,
    "isLatest" BOOLEAN,
    "packageCanonical" TEXT,
    "tools" JSONB,
    "agents" JSONB,
    "workflows" JSONB,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_mcp_server_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_mcp_servers" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_notifications" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "resourceId" TEXT,
    "agentId" TEXT,
    "sourceId" TEXT,
    "dedupeKey" TEXT,
    "coalesceKey" TEXT,
    "coalescedCount" INTEGER NOT NULL,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "deliveredAt" TIMESTAMP(6),
    "seenAt" TIMESTAMP(6),
    "dismissedAt" TIMESTAMP(6),
    "archivedAt" TIMESTAMP(6),
    "discardedAt" TIMESTAMP(6),
    "deliverAt" TIMESTAMP(6),
    "summaryAt" TIMESTAMP(6),
    "deliveryReason" TEXT,
    "deliveryAttempts" INTEGER NOT NULL,
    "lastDeliveryAttemptAt" TIMESTAMP(6),
    "lastDeliveryError" TEXT,
    "deliveredSignalId" TEXT,
    "summarySignalId" TEXT,
    "metadata" JSONB,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deliveredAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "seenAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "dismissedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "archivedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "discardedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deliverAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "summaryAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastDeliveryAttemptAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mastra_observational_memory" (
    "id" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resourceId" TEXT,
    "threadId" TEXT,
    "activeObservations" TEXT NOT NULL,
    "activeObservationsPendingUpdate" TEXT,
    "originType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "generationCount" INTEGER NOT NULL,
    "lastObservedAt" TIMESTAMP(6),
    "lastReflectionAt" TIMESTAMP(6),
    "pendingMessageTokens" INTEGER NOT NULL,
    "totalTokensObserved" INTEGER NOT NULL,
    "observationTokenCount" INTEGER NOT NULL,
    "isObserving" BOOLEAN NOT NULL,
    "isReflecting" BOOLEAN NOT NULL,
    "observedMessageIds" JSONB,
    "observedTimezone" TEXT,
    "bufferedObservations" TEXT,
    "bufferedObservationTokens" INTEGER,
    "bufferedMessageIds" JSONB,
    "bufferedReflection" TEXT,
    "bufferedReflectionTokens" INTEGER,
    "bufferedReflectionInputTokens" INTEGER,
    "reflectedObservationLineCount" INTEGER,
    "bufferedObservationChunks" JSONB,
    "isBufferingObservation" BOOLEAN NOT NULL,
    "isBufferingReflection" BOOLEAN NOT NULL,
    "lastBufferedAtTokens" INTEGER NOT NULL,
    "lastBufferedAtTime" TIMESTAMP(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "lastObservedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastReflectionAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastBufferedAtTimeZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_observational_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_prompt_block_versions" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "rules" JSONB,
    "requestContextSchema" JSONB,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_prompt_block_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_prompt_blocks" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_prompt_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_schedule_triggers" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "run_id" TEXT,
    "scheduled_fire_at" BIGINT NOT NULL,
    "actual_fire_at" BIGINT NOT NULL,
    "outcome" TEXT NOT NULL,
    "error" TEXT,
    "trigger_kind" TEXT NOT NULL,
    "parent_trigger_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "mastra_schedule_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_schedules" (
    "id" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT,
    "status" TEXT NOT NULL,
    "next_fire_at" BIGINT NOT NULL,
    "last_fire_at" BIGINT,
    "last_run_id" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "metadata" JSONB,
    "owner_type" TEXT,
    "owner_id" TEXT,

    CONSTRAINT "mastra_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_scorer_definition_versions" (
    "id" TEXT NOT NULL,
    "scorerDefinitionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "model" JSONB,
    "instructions" TEXT,
    "scoreRange" JSONB,
    "presetConfig" JSONB,
    "defaultSampling" JSONB,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_scorer_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_scorer_definitions" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "projectId" TEXT,

    CONSTRAINT "mastra_scorer_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_skill_blobs" (
    "hash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_skill_blobs_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "mastra_skill_versions" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "license" TEXT,
    "compatibility" JSONB,
    "source" JSONB,
    "references" JSONB,
    "scripts" JSONB,
    "assets" JSONB,
    "metadata" JSONB,
    "tree" JSONB,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "files" JSONB,

    CONSTRAINT "mastra_skill_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_skills" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT,
    "favoriteCount" INTEGER,

    CONSTRAINT "mastra_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_thread_state" (
    "threadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_thread_state_pkey" PRIMARY KEY ("threadId","type")
);

-- CreateTable
CREATE TABLE "mastra_tool_provider_connections" (
    "authorId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "toolkit" TEXT NOT NULL,
    "label" TEXT,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_tool_provider_connections_pkey" PRIMARY KEY ("authorId","providerId","connectionId")
);

-- CreateTable
CREATE TABLE "mastra_workflow_definitions" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "stateSchema" JSONB,
    "requestContextSchema" JSONB,
    "graph" JSONB NOT NULL,
    "schedule" JSONB,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_workspace_versions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filesystem" JSONB,
    "sandbox" JSONB,
    "mounts" JSONB,
    "search" JSONB,
    "skills" JSONB,
    "tools" JSONB,
    "autoSync" BOOLEAN,
    "operationTimeout" INTEGER,
    "changedFields" JSONB,
    "changeMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_workspace_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastra_workspaces" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAtZ" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastra_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthApp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pictureId" TEXT,
    "redirectUrl" TEXT NOT NULL,
    "redirectUris" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "dynamic" BOOLEAN NOT NULL DEFAULT false,
    "tokenEndpointAuthMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorization" (
    "id" TEXT NOT NULL,
    "oauthAppId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accessToken" TEXT,
    "authorizationCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "redirectUri" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthSelfHostedAuthorization" (
    "id" TEXT NOT NULL,
    "oauthAppId" TEXT NOT NULL,
    "mcpUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT,
    "authorizationCode" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "redirectUri" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthSelfHostedAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" "AnnouncementColor" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_apiKey_idx" ON "Organization"("apiKey");

-- CreateIndex
CREATE INDEX "Organization_streakSince_idx" ON "Organization"("streakSince");

-- CreateIndex
CREATE INDEX "Organization_paymentId_idx" ON "Organization"("paymentId");

-- CreateIndex
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- CreateIndex
CREATE INDEX "Tags_orgId_idx" ON "Tags"("orgId");

-- CreateIndex
CREATE INDEX "Tags_deletedAt_idx" ON "Tags"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TagsPosts_postId_tagId_key" ON "TagsPosts"("postId", "tagId");

-- CreateIndex
CREATE INDEX "User_lastReadNotifications_idx" ON "User"("lastReadNotifications");

-- CreateIndex
CREATE INDEX "User_inviteId_idx" ON "User"("inviteId");

-- CreateIndex
CREATE INDEX "User_account_idx" ON "User"("account");

-- CreateIndex
CREATE INDEX "User_lastOnline_idx" ON "User"("lastOnline");

-- CreateIndex
CREATE INDEX "User_pictureId_idx" ON "User"("pictureId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_providerName_key" ON "User"("email", "providerName");

-- CreateIndex
CREATE INDEX "UsedCodes_code_idx" ON "UsedCodes"("code");

-- CreateIndex
CREATE INDEX "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");

-- CreateIndex
CREATE INDEX "UserOrganization_disabled_idx" ON "UserOrganization"("disabled");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_key" ON "UserOrganization"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "GitHub_login_idx" ON "GitHub"("login");

-- CreateIndex
CREATE INDEX "GitHub_organizationId_idx" ON "GitHub"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Trending_language_key" ON "Trending"("language");

-- CreateIndex
CREATE INDEX "Trending_hash_idx" ON "Trending"("hash");

-- CreateIndex
CREATE INDEX "ItemUser_userId_idx" ON "ItemUser"("userId");

-- CreateIndex
CREATE INDEX "ItemUser_key_idx" ON "ItemUser"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUser_userId_key_key" ON "ItemUser"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Star_login_date_key" ON "Star"("login", "date");

-- CreateIndex
CREATE INDEX "Media_name_idx" ON "Media"("name");

-- CreateIndex
CREATE INDEX "Media_organizationId_idx" ON "Media"("organizationId");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaAgency_userId_key" ON "SocialMediaAgency"("userId");

-- CreateIndex
CREATE INDEX "SocialMediaAgency_userId_idx" ON "SocialMediaAgency"("userId");

-- CreateIndex
CREATE INDEX "SocialMediaAgency_deletedAt_idx" ON "SocialMediaAgency"("deletedAt");

-- CreateIndex
CREATE INDEX "SocialMediaAgency_id_idx" ON "SocialMediaAgency"("id");

-- CreateIndex
CREATE INDEX "Credits_organizationId_idx" ON "Credits"("organizationId");

-- CreateIndex
CREATE INDEX "Credits_createdAt_idx" ON "Credits"("createdAt");

-- CreateIndex
CREATE INDEX "Clipping_organizationId_idx" ON "Clipping"("organizationId");

-- CreateIndex
CREATE INDEX "Clipping_deletedAt_idx" ON "Clipping"("deletedAt");

-- CreateIndex
CREATE INDEX "ClippingClip_clippingId_idx" ON "ClippingClip"("clippingId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_deletedAt_idx" ON "Subscription"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_name_deletedAt_key" ON "Customer"("orgId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "Integration_rootInternalId_idx" ON "Integration"("rootInternalId");

-- CreateIndex
CREATE INDEX "Integration_organizationId_idx" ON "Integration"("organizationId");

-- CreateIndex
CREATE INDEX "Integration_providerIdentifier_idx" ON "Integration"("providerIdentifier");

-- CreateIndex
CREATE INDEX "Integration_updatedAt_idx" ON "Integration"("updatedAt");

-- CreateIndex
CREATE INDEX "Integration_createdAt_idx" ON "Integration"("createdAt");

-- CreateIndex
CREATE INDEX "Integration_deletedAt_idx" ON "Integration"("deletedAt");

-- CreateIndex
CREATE INDEX "Integration_customerId_idx" ON "Integration"("customerId");

-- CreateIndex
CREATE INDEX "Integration_inBetweenSteps_idx" ON "Integration"("inBetweenSteps");

-- CreateIndex
CREATE INDEX "Integration_refreshNeeded_idx" ON "Integration"("refreshNeeded");

-- CreateIndex
CREATE INDEX "Integration_disabled_idx" ON "Integration"("disabled");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_internalId_key" ON "Integration"("organizationId", "internalId");

-- CreateIndex
CREATE INDEX "Signatures_createdAt_idx" ON "Signatures"("createdAt");

-- CreateIndex
CREATE INDEX "Signatures_organizationId_idx" ON "Signatures"("organizationId");

-- CreateIndex
CREATE INDEX "Signatures_deletedAt_idx" ON "Signatures"("deletedAt");

-- CreateIndex
CREATE INDEX "Comments_createdAt_idx" ON "Comments"("createdAt");

-- CreateIndex
CREATE INDEX "Comments_organizationId_idx" ON "Comments"("organizationId");

-- CreateIndex
CREATE INDEX "Comments_userId_idx" ON "Comments"("userId");

-- CreateIndex
CREATE INDEX "Comments_postId_idx" ON "Comments"("postId");

-- CreateIndex
CREATE INDEX "Comments_parentId_idx" ON "Comments"("parentId");

-- CreateIndex
CREATE INDEX "Comments_resolvedAt_idx" ON "Comments"("resolvedAt");

-- CreateIndex
CREATE INDEX "Comments_deletedAt_idx" ON "Comments"("deletedAt");

-- CreateIndex
CREATE INDEX "Post_group_idx" ON "Post"("group");

-- CreateIndex
CREATE INDEX "Post_batchId_idx" ON "Post"("batchId");

-- CreateIndex
CREATE INDEX "Post_deletedAt_idx" ON "Post"("deletedAt");

-- CreateIndex
CREATE INDEX "Post_publishDate_idx" ON "Post"("publishDate");

-- CreateIndex
CREATE INDEX "Post_state_idx" ON "Post"("state");

-- CreateIndex
CREATE INDEX "Post_organizationId_idx" ON "Post"("organizationId");

-- CreateIndex
CREATE INDEX "Post_parentPostId_idx" ON "Post"("parentPostId");

-- CreateIndex
CREATE INDEX "Post_submittedForOrderId_idx" ON "Post"("submittedForOrderId");

-- CreateIndex
CREATE INDEX "Post_intervalInDays_idx" ON "Post"("intervalInDays");

-- CreateIndex
CREATE INDEX "Post_approvedSubmitForOrder_idx" ON "Post"("approvedSubmitForOrder");

-- CreateIndex
CREATE INDEX "Post_creationMethod_idx" ON "Post"("creationMethod");

-- CreateIndex
CREATE INDEX "Post_lastMessageId_idx" ON "Post"("lastMessageId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_updatedAt_idx" ON "Post"("updatedAt");

-- CreateIndex
CREATE INDEX "Post_releaseURL_idx" ON "Post"("releaseURL");

-- CreateIndex
CREATE INDEX "Post_integrationId_idx" ON "Post"("integrationId");

-- CreateIndex
CREATE INDEX "Notifications_createdAt_idx" ON "Notifications"("createdAt");

-- CreateIndex
CREATE INDEX "Notifications_organizationId_idx" ON "Notifications"("organizationId");

-- CreateIndex
CREATE INDEX "Notifications_deletedAt_idx" ON "Notifications"("deletedAt");

-- CreateIndex
CREATE INDEX "MessagesGroup_createdAt_idx" ON "MessagesGroup"("createdAt");

-- CreateIndex
CREATE INDEX "MessagesGroup_updatedAt_idx" ON "MessagesGroup"("updatedAt");

-- CreateIndex
CREATE INDEX "MessagesGroup_buyerOrganizationId_idx" ON "MessagesGroup"("buyerOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MessagesGroup_buyerId_sellerId_key" ON "MessagesGroup"("buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "Orders_buyerId_idx" ON "Orders"("buyerId");

-- CreateIndex
CREATE INDEX "Orders_sellerId_idx" ON "Orders"("sellerId");

-- CreateIndex
CREATE INDEX "Orders_updatedAt_idx" ON "Orders"("updatedAt");

-- CreateIndex
CREATE INDEX "Orders_createdAt_idx" ON "Orders"("createdAt");

-- CreateIndex
CREATE INDEX "Orders_messageGroupId_idx" ON "Orders"("messageGroupId");

-- CreateIndex
CREATE INDEX "OrderItems_orderId_idx" ON "OrderItems"("orderId");

-- CreateIndex
CREATE INDEX "OrderItems_integrationId_idx" ON "OrderItems"("integrationId");

-- CreateIndex
CREATE INDEX "Messages_groupId_idx" ON "Messages"("groupId");

-- CreateIndex
CREATE INDEX "Messages_createdAt_idx" ON "Messages"("createdAt");

-- CreateIndex
CREATE INDEX "Messages_deletedAt_idx" ON "Messages"("deletedAt");

-- CreateIndex
CREATE INDEX "Plugs_organizationId_idx" ON "Plugs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Plugs_plugFunction_integrationId_key" ON "Plugs"("plugFunction", "integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExisingPlugData_integrationId_methodName_value_key" ON "ExisingPlugData"("integrationId", "methodName", "value");

-- CreateIndex
CREATE INDEX "IntegrationsWebhooks_integrationId_idx" ON "IntegrationsWebhooks"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationsWebhooks_webhookId_idx" ON "IntegrationsWebhooks"("webhookId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationsWebhooks_integrationId_webhookId_key" ON "IntegrationsWebhooks"("integrationId", "webhookId");

-- CreateIndex
CREATE INDEX "Webhooks_organizationId_idx" ON "Webhooks"("organizationId");

-- CreateIndex
CREATE INDEX "Webhooks_deletedAt_idx" ON "Webhooks"("deletedAt");

-- CreateIndex
CREATE INDEX "AutoPost_deletedAt_idx" ON "AutoPost"("deletedAt");

-- CreateIndex
CREATE INDEX "Sets_organizationId_idx" ON "Sets"("organizationId");

-- CreateIndex
CREATE INDEX "ThirdParty_organizationId_idx" ON "ThirdParty"("organizationId");

-- CreateIndex
CREATE INDEX "ThirdParty_deletedAt_idx" ON "ThirdParty"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdParty_organizationId_internalId_key" ON "ThirdParty"("organizationId", "internalId");

-- CreateIndex
CREATE INDEX "Errors_organizationId_idx" ON "Errors"("organizationId");

-- CreateIndex
CREATE INDEX "Errors_createdAt_idx" ON "Errors"("createdAt");

-- CreateIndex
CREATE INDEX "Mentions_createdAt_idx" ON "Mentions"("createdAt");

-- CreateIndex
CREATE INDEX "public_mastra_ai_spans_name_idx" ON "mastra_ai_spans"("name");

-- CreateIndex
CREATE INDEX "public_mastra_ai_spans_parentspanid_startedat_idx" ON "mastra_ai_spans"("parentSpanId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_ai_spans_spantype_startedat_idx" ON "mastra_ai_spans"("spanType", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_ai_spans_traceid_startedat_idx" ON "mastra_ai_spans"("traceId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_ai_spans_entitytype_entityid_idx" ON "mastra_ai_spans"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_entitytype_entityname_idx" ON "mastra_ai_spans"("entityType", "entityName");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_metadata_gin_idx" ON "mastra_ai_spans" USING GIN ("metadata");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_name_idx" ON "mastra_ai_spans"("name");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_orgid_userid_idx" ON "mastra_ai_spans"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_parentspanid_startedat_idx" ON "mastra_ai_spans"("parentSpanId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_ai_spans_spantype_startedat_idx" ON "mastra_ai_spans"("spanType", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_ai_spans_tags_gin_idx" ON "mastra_ai_spans" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "mastra_ai_spans_traceid_startedat_idx" ON "mastra_ai_spans"("traceId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_evals_agent_name_created_at_idx" ON "mastra_evals"("agent_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_messages_thread_id_createdat_idx" ON "mastra_messages"("thread_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_messages_thread_id_createdat_idx" ON "mastra_messages"("thread_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_scores_trace_id_span_id_created_at_idx" ON "mastra_scorers"("traceId", "spanId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_scores_trace_id_span_id_created_at_idx" ON "mastra_scorers"("traceId", "spanId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_threads_resourceid_createdat_idx" ON "mastra_threads"("resourceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mastra_threads_resourceid_createdat_idx" ON "mastra_threads"("resourceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "public_mastra_traces_name_starttime_idx" ON "mastra_traces"("name", "startTime" DESC);

-- CreateIndex
CREATE INDEX "mastra_workflow_snapshot_name_createdat_idx" ON "mastra_workflow_snapshot"("workflow_name", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "public_mastra_workflow_snapshot_workflow_name_run_id_key" ON "mastra_workflow_snapshot"("workflow_name", "run_id");

-- CreateIndex
CREATE INDEX "mastra_bg_tasks_agent_status_idx" ON "mastra_background_tasks"("agent_id", "status");

-- CreateIndex
CREATE INDEX "mastra_bg_tasks_status_created_at_idx" ON "mastra_background_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "mastra_bg_tasks_thread_idx" ON "mastra_background_tasks"("thread_id", "createdAt");

-- CreateIndex
CREATE INDEX "mastra_bg_tasks_tool_call_idx" ON "mastra_background_tasks"("tool_call_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_channel_installations_webhook" ON "mastra_channel_installations"("webhookId");

-- CreateIndex
CREATE INDEX "idx_channel_installations_platform_agent" ON "mastra_channel_installations"("platform", "agentId");

-- CreateIndex
CREATE INDEX "idx_dataset_items_dataset_validto" ON "mastra_dataset_items"("datasetId", "validTo");

-- CreateIndex
CREATE INDEX "idx_dataset_items_dataset_validto_deleted" ON "mastra_dataset_items"("datasetId", "validTo", "isDeleted");

-- CreateIndex
CREATE INDEX "idx_dataset_items_dataset_version" ON "mastra_dataset_items"("datasetId", "datasetVersion");

-- CreateIndex
CREATE INDEX "idx_dataset_items_external_id_history" ON "mastra_dataset_items"("datasetId", "externalId", "datasetVersion");

-- CreateIndex
CREATE INDEX "idx_dataset_items_org_project" ON "mastra_dataset_items"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "idx_dataset_versions_dataset_version" ON "mastra_dataset_versions"("datasetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "idx_dataset_versions_dataset_version_unique" ON "mastra_dataset_versions"("datasetId", "version");

-- CreateIndex
CREATE INDEX "idx_datasets_candidate" ON "mastra_datasets"("candidateKey", "candidateId");

-- CreateIndex
CREATE INDEX "idx_datasets_org_project" ON "mastra_datasets"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "idx_experiment_results_experimentid" ON "mastra_experiment_results"("experimentId");

-- CreateIndex
CREATE INDEX "idx_experiment_results_org_project" ON "mastra_experiment_results"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "idx_experiment_results_tags_gin" ON "mastra_experiment_results" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "idx_experiment_results_exp_item_attempt" ON "mastra_experiment_results"("experimentId", "itemId", "attempt");

-- CreateIndex
CREATE INDEX "idx_experiments_datasetid" ON "mastra_experiments"("datasetId");

-- CreateIndex
CREATE INDEX "idx_experiments_grouping" ON "mastra_experiments"("experimentSetId", "comparisonId", "variantId", "trialIndex");

-- CreateIndex
CREATE INDEX "idx_experiments_org_project" ON "mastra_experiments"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "idx_favorites_entity" ON "mastra_favorites"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_knowledge_activity_latest" ON "mastra_knowledge_activity"("id" DESC);

-- CreateIndex
CREATE INDEX "idx_knowledge_mentions_record" ON "mastra_knowledge_mentions"("recordId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "idx_knowledge_nodes_scope" ON "mastra_knowledge_nodes"("scopeKey", "type");

-- CreateIndex
CREATE UNIQUE INDEX "idx_knowledge_nodes_identity" ON "mastra_knowledge_nodes"("type", "scopeKey", "canonicalName");

-- CreateIndex
CREATE INDEX "idx_knowledge_records_node_latest" ON "mastra_knowledge_records"("node", "id" DESC);

-- CreateIndex
CREATE INDEX "idx_knowledge_records_thread_latest" ON "mastra_knowledge_records"("sourceThreadId", "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_knowledge_outbox_idempotency" ON "mastra_knowledge_semantic_outbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "idx_knowledge_outbox_claim" ON "mastra_knowledge_semantic_outbox"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idx_mcp_client_versions_client_version" ON "mastra_mcp_client_versions"("mcpClientId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "idx_mcp_server_versions_server_version" ON "mastra_mcp_server_versions"("mcpServerId", "versionNumber");

-- CreateIndex
CREATE INDEX "idx_notifications_coalescing" ON "mastra_notifications"("threadId", "source", "kind", "status", "agentId", "resourceId", "dedupeKey", "coalesceKey");

-- CreateIndex
CREATE INDEX "idx_notifications_due" ON "mastra_notifications"("status", "deliverAt", "summaryAt");

-- CreateIndex
CREATE INDEX "idx_notifications_thread_status_updated" ON "mastra_notifications"("threadId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "idx_om_lookup_key" ON "mastra_observational_memory"("lookupKey");

-- CreateIndex
CREATE UNIQUE INDEX "idx_prompt_block_versions_block_version" ON "mastra_prompt_block_versions"("blockId", "versionNumber");

-- CreateIndex
CREATE INDEX "idx_mastra_schedule_triggers_schedule_fire" ON "mastra_schedule_triggers"("schedule_id", "actual_fire_at" DESC);

-- CreateIndex
CREATE INDEX "idx_mastra_schedules_status_next_fire" ON "mastra_schedules"("status", "next_fire_at");

-- CreateIndex
CREATE UNIQUE INDEX "idx_scorer_definition_versions_def_version" ON "mastra_scorer_definition_versions"("scorerDefinitionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "idx_skill_versions_skill_version" ON "mastra_skill_versions"("skillId", "versionNumber");

-- CreateIndex
CREATE INDEX "idx_tool_provider_connections_author" ON "mastra_tool_provider_connections"("authorId", "providerId", "toolkit");

-- CreateIndex
CREATE INDEX "idx_workflow_definitions_status" ON "mastra_workflow_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idx_workspace_versions_workspace_version" ON "mastra_workspace_versions"("workspaceId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_clientId_key" ON "OAuthApp"("clientId");

-- CreateIndex
CREATE INDEX "OAuthApp_clientId_idx" ON "OAuthApp"("clientId");

-- CreateIndex
CREATE INDEX "OAuthApp_organizationId_idx" ON "OAuthApp"("organizationId");

-- CreateIndex
CREATE INDEX "OAuthApp_deletedAt_idx" ON "OAuthApp"("deletedAt");

-- CreateIndex
CREATE INDEX "OAuthApp_dynamic_idx" ON "OAuthApp"("dynamic");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_organizationId_deletedAt_key" ON "OAuthApp"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_accessToken_idx" ON "OAuthAuthorization"("accessToken");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_authorizationCode_idx" ON "OAuthAuthorization"("authorizationCode");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_oauthAppId_idx" ON "OAuthAuthorization"("oauthAppId");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_userId_idx" ON "OAuthAuthorization"("userId");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_organizationId_idx" ON "OAuthAuthorization"("organizationId");

-- CreateIndex
CREATE INDEX "OAuthAuthorization_revokedAt_idx" ON "OAuthAuthorization"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorization_oauthAppId_userId_organizationId_key" ON "OAuthAuthorization"("oauthAppId", "userId", "organizationId");

-- CreateIndex
CREATE INDEX "OAuthSelfHostedAuthorization_accessToken_idx" ON "OAuthSelfHostedAuthorization"("accessToken");

-- CreateIndex
CREATE INDEX "OAuthSelfHostedAuthorization_authorizationCode_idx" ON "OAuthSelfHostedAuthorization"("authorizationCode");

-- CreateIndex
CREATE INDEX "OAuthSelfHostedAuthorization_oauthAppId_idx" ON "OAuthSelfHostedAuthorization"("oauthAppId");

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagsPosts" ADD CONSTRAINT "TagsPosts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagsPosts" ADD CONSTRAINT "TagsPosts_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pictureId_fkey" FOREIGN KEY ("pictureId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedCodes" ADD CONSTRAINT "UsedCodes_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHub" ADD CONSTRAINT "GitHub_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUser" ADD CONSTRAINT "ItemUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaAgency" ADD CONSTRAINT "SocialMediaAgency_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaAgency" ADD CONSTRAINT "SocialMediaAgency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaAgencyNiche" ADD CONSTRAINT "SocialMediaAgencyNiche_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "SocialMediaAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credits" ADD CONSTRAINT "Credits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clipping" ADD CONSTRAINT "Clipping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClippingClip" ADD CONSTRAINT "ClippingClip_clippingId_fkey" FOREIGN KEY ("clippingId") REFERENCES "Clipping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "Messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_submittedForOrderId_fkey" FOREIGN KEY ("submittedForOrderId") REFERENCES "Orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_submittedForOrganizationId_fkey" FOREIGN KEY ("submittedForOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagesGroup" ADD CONSTRAINT "MessagesGroup_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagesGroup" ADD CONSTRAINT "MessagesGroup_buyerOrganizationId_fkey" FOREIGN KEY ("buyerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagesGroup" ADD CONSTRAINT "MessagesGroup_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutProblems" ADD CONSTRAINT "PayoutProblems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutProblems" ADD CONSTRAINT "PayoutProblems_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutProblems" ADD CONSTRAINT "PayoutProblems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_messageGroupId_fkey" FOREIGN KEY ("messageGroupId") REFERENCES "MessagesGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MessagesGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plugs" ADD CONSTRAINT "Plugs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plugs" ADD CONSTRAINT "Plugs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExisingPlugData" ADD CONSTRAINT "ExisingPlugData_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationsWebhooks" ADD CONSTRAINT "IntegrationsWebhooks_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationsWebhooks" ADD CONSTRAINT "IntegrationsWebhooks_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhooks" ADD CONSTRAINT "Webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPost" ADD CONSTRAINT "AutoPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sets" ADD CONSTRAINT "Sets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdParty" ADD CONSTRAINT "ThirdParty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Errors" ADD CONSTRAINT "Errors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Errors" ADD CONSTRAINT "Errors_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthApp" ADD CONSTRAINT "OAuthApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthApp" ADD CONSTRAINT "OAuthApp_pictureId_fkey" FOREIGN KEY ("pictureId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorization" ADD CONSTRAINT "OAuthAuthorization_oauthAppId_fkey" FOREIGN KEY ("oauthAppId") REFERENCES "OAuthApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorization" ADD CONSTRAINT "OAuthAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorization" ADD CONSTRAINT "OAuthAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthSelfHostedAuthorization" ADD CONSTRAINT "OAuthSelfHostedAuthorization_oauthAppId_fkey" FOREIGN KEY ("oauthAppId") REFERENCES "OAuthApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

