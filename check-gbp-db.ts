import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postiz-db-local'
    }
  }
});

async function checkGbpConfig() {
  try {
    console.log('🔍 Checking GBP Configuration in Database...\n');
    
    // Check if there are any organizations
    const orgs = await prisma.organization.findMany();
    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
      console.log(`  - ${org.name} (${org.id})`);
    });
    
    if (orgs.length === 0) {
      console.log('❌ No organizations found in database');
      process.exit(1);
    }
    
    // Check for existing GBP configurations
    const configs = await prisma.socialMediaPlatformConfig.findMany({
      where: {
        platformKey: 'GBP'
      },
      include: {
        config: true
      }
    });
    
    console.log(`\nFound ${configs.length} GBP configurations:`);
    configs.forEach((config, index) => {
      console.log(`\n--- Configuration #${index + 1} ---`);
      console.log(`ID: ${config.id}`);
      console.log(`Platform: ${config.platform}`);
      console.log(`Platform Key: ${config.platformKey}`);
      console.log(`Organization ID: ${config.organizationId}`);
      console.log(`Customer ID: ${config.customerId || 'null'}`);
      console.log('Config Items:');
      config.config.forEach(item => {
        console.log(`  ${item.key}: ${item.value.substring(0, 30)}${item.value.length > 30 ? '...' : ''}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking GBP configuration:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkGbpConfig();