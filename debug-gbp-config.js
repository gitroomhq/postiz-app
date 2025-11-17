const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

async function debugGBPConfig() {
  try {
    console.log('Debugging GBP database configuration...');
    
    // Find all GBP configurations
    const configs = await prisma.socialMediaPlatformConfig.findMany({
      where: {
        platformKey: 'gbp'
      },
      include: {
        config: true
      }
    });
    
    if (configs.length === 0) {
      console.log('❌ No GBP configurations found in the database');
      return;
    }
    
    console.log(`Found ${configs.length} GBP configuration(s):`);
    
    configs.forEach((config, index) => {
      console.log(`\n--- Configuration ${index + 1} ---`);
      console.log(`ID: ${config.id}`);
      console.log(`Platform: ${config.platform}`);
      console.log(`Platform Key: ${config.platformKey}`);
      console.log(`Organization ID: ${config.organizationId}`);
      console.log(`Customer ID: ${config.customerId}`);
      console.log('Config Items:');
      
      config.config.forEach(item => {
        console.log(`  • ${item.key}: ${item.value}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error debugging GBP configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGBPConfig();