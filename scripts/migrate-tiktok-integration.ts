#!/usr/bin/env ts-node
/**
 * Script to migrate TikTok integration from one database to another
 * 
 * Usage:
 *   ts-node scripts/migrate-tiktok-integration.ts
 * 
 * Or with environment variables:
 *   SOURCE_DB_URL="postgresql://..." TARGET_DB_URL="postgresql://..." ts-node scripts/migrate-tiktok-integration.ts
 */

import { PrismaClient } from '@prisma/client';

interface IntegrationData {
  id: string;
  internalId: string;
  organizationId: string;
  name: string;
  picture: string | null;
  providerIdentifier: string;
  type: string;
  token: string;
  disabled: boolean;
  tokenExpiration: Date | null;
  refreshToken: string | null;
  profile: string | null;
  postingTimes: string;
  additionalSettings: string;
}

async function migrateTikTokIntegration() {
  const sourceDbUrl = process.env.SOURCE_DB_URL || process.env.DATABASE_URL;
  const targetDbUrl = process.env.TARGET_DB_URL || process.env.DATABASE_URL;
  const targetOrgId = process.env.TARGET_ORG_ID;

  if (!sourceDbUrl || !targetDbUrl) {
    console.error('Error: DATABASE_URL, SOURCE_DB_URL, or TARGET_DB_URL must be set');
    process.exit(1);
  }

  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: sourceDbUrl } },
  });

  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetDbUrl } },
  });

  try {
    // Find TikTok integration in source database
    console.log('🔍 Searching for TikTok integration in source database...');
    const sourceIntegration = await sourcePrisma.integration.findFirst({
      where: {
        providerIdentifier: 'tiktok',
        deletedAt: null,
      },
    });

    if (!sourceIntegration) {
      console.error('❌ No TikTok integration found in source database');
      process.exit(1);
    }

    console.log('✅ Found TikTok integration:', {
      id: sourceIntegration.id,
      name: sourceIntegration.name,
      profile: sourceIntegration.profile,
    });

    // Get target organization ID
    let orgId = targetOrgId;
    if (!orgId) {
      console.log('🔍 Finding target organization...');
      const orgs = await targetPrisma.organization.findMany({
        take: 1,
      });

      if (orgs.length === 0) {
        console.error('❌ No organization found in target database. Please create one first.');
        process.exit(1);
      }

      orgId = orgs[0].id;
      console.log(`✅ Using organization: ${orgId}`);
    }

    // Check if integration already exists
    const existing = await targetPrisma.integration.findFirst({
      where: {
        organizationId: orgId,
        internalId: sourceIntegration.internalId,
        providerIdentifier: 'tiktok',
      },
    });

    if (existing) {
      console.log('⚠️  Integration already exists. Updating...');
      await targetPrisma.integration.update({
        where: { id: existing.id },
        data: {
          token: sourceIntegration.token,
          refreshToken: sourceIntegration.refreshToken,
          tokenExpiration: sourceIntegration.tokenExpiration,
          name: sourceIntegration.name,
          picture: sourceIntegration.picture,
          profile: sourceIntegration.profile,
          postingTimes: sourceIntegration.postingTimes,
          additionalSettings: sourceIntegration.additionalSettings,
          disabled: sourceIntegration.disabled,
          refreshNeeded: false,
          updatedAt: new Date(),
        },
      });
      console.log('✅ Integration updated successfully!');
    } else {
      console.log('📝 Creating new integration...');
      await targetPrisma.integration.create({
        data: {
          internalId: sourceIntegration.internalId,
          organizationId: orgId,
          name: sourceIntegration.name,
          picture: sourceIntegration.picture,
          providerIdentifier: sourceIntegration.providerIdentifier,
          type: sourceIntegration.type,
          token: sourceIntegration.token,
          refreshToken: sourceIntegration.refreshToken,
          tokenExpiration: sourceIntegration.tokenExpiration,
          profile: sourceIntegration.profile,
          postingTimes: sourceIntegration.postingTimes,
          additionalSettings: sourceIntegration.additionalSettings,
          disabled: sourceIntegration.disabled,
          rootInternalId: sourceIntegration.rootInternalId,
          inBetweenSteps: sourceIntegration.inBetweenSteps,
          refreshNeeded: false,
        },
      });
      console.log('✅ Integration created successfully!');
    }

    console.log('\n🎉 Migration complete!');
    console.log('\n⚠️  Important notes:');
    console.log('   - Make sure TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET are set in your local .env');
    console.log('   - Make sure FRONTEND_URL matches your local setup');
    console.log('   - Tokens may expire - you may need to re-authenticate if they do');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

// Run the migration
migrateTikTokIntegration();
