import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFacebookTokens() {
  console.log('Starting Facebook token format migration...\n');

  try {
    // Find all Facebook integrations
    const facebookIntegrations = await prisma.integration.findMany({
      where: {
        providerIdentifier: 'facebook',
        deletedAt: null,
        inBetweenSteps: false, // Only process fully connected integrations
      },
    });

    console.log(`Found ${facebookIntegrations.length} Facebook integrations to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const integration of facebookIntegrations) {
      try {
        // Check if refreshToken is already in new format (contains ::)
        if (integration.refreshToken && integration.refreshToken.includes('::')) {
          console.log(`✓ Skipping ${integration.name} (${integration.id}) - already in new format`);
          skippedCount++;
          continue;
        }

        // Get the current tokens
        const userToken = integration.refreshToken || integration.token;
        const pageId = integration.internalId;

        if (!userToken || !pageId) {
          console.log(`✗ Skipping ${integration.name} (${integration.id}) - missing token or page ID`);
          errorCount++;
          continue;
        }

        // Update to new format: userToken::pageId
        const newRefreshToken = `${userToken}::${pageId}`;

        await prisma.integration.update({
          where: { id: integration.id },
          data: { refreshToken: newRefreshToken },
        });

        console.log(`✓ Updated ${integration.name} (${integration.id})`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Error updating ${integration.name} (${integration.id}):`, error);
        errorCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (already migrated): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total processed: ${facebookIntegrations.length}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixFacebookTokens()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
