import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addGbpConfig() {
  try {
    // Get first organization (you may want to specify a specific org ID)
    const org = await prisma.organization.findFirst();

    if (!org) {
      console.error('No organization found in the database');
      process.exit(1);
    }

    console.log(`Using organization: ${org.name} (${org.id})`);

    // Create or update GBP configuration
    const config = await prisma.socialMediaPlatformConfig.upsert({
      where: {
        platformKey_organizationId_customerId: {
          platformKey: 'GBP',
          organizationId: org.id,
          customerId: null,
        },
      },
      update: {
        platform: 'Google Business Profile',
        updatedAt: new Date(),
      },
      create: {
        platform: 'Google Business Profile',
        platformKey: 'GBP',
        organizationId: org.id,
        customerId: null,
      },
      include: {
        config: true,
      },
    });

    console.log(`Created config with ID: ${config.id}`);

    // Define config items
    const configItems = [
      {
        key: 'GOOGLE_CLIENT_ID',
        value: '662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com',
      },
      {
        key: 'GOOGLE_CLIENT_SECRET',
        value: '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',
      },
      {
        key: 'FRONTEND_URL',
        value: 'http://localhost:4200',
      },
    ];

    // Upsert each config item
    for (const item of configItems) {
      await prisma.socialMediaPlatformConfigItem.upsert({
        where: {
          key_configId: {
            key: item.key,
            configId: config.id,
          },
        },
        update: {
          value: item.value,
        },
        create: {
          key: item.key,
          value: item.value,
          configId: config.id,
        },
      });
      console.log(`✓ Configured ${item.key}`);
    }

    // Verify the configuration
    const updatedConfig = await prisma.socialMediaPlatformConfig.findUnique({
      where: { id: config.id },
      include: { config: true },
    });

    console.log('\n=== GBP Configuration Created ===');
    console.log(`Platform: ${updatedConfig?.platform}`);
    console.log(`Platform Key: ${updatedConfig?.platformKey}`);
    console.log(`Organization: ${updatedConfig?.organizationId}`);
    console.log('\nConfig Items:');
    updatedConfig?.config.forEach((item) => {
      console.log(`  ${item.key}: ${item.value}`);
    });

    console.log('\n✅ GBP configuration has been successfully added to the database!');
    console.log('\nThe GBP provider will now read credentials from the database instead of environment variables.');

  } catch (error) {
    console.error('Error adding GBP configuration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addGbpConfig();