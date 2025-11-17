const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

async function cleanupGBPConfig() {
  try {
    console.log('Cleaning up GBP database configurations...');
    
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
    
    console.log(`Found ${configs.length} GBP configuration(s)`);
    
    // Find the correct configuration (with null customerId and correct values)
    const correctConfig = configs.find(config => {
      // Check if customerId is null
      if (config.customerId !== null) return false;
      
      // Check if it has the correct values
      const clientIdItem = config.config.find(item => item.key === 'GOOGLE_CLIENT_ID');
      const clientSecretItem = config.config.find(item => item.key === 'GOOGLE_CLIENT_SECRET');
      
      return clientIdItem && clientSecretItem &&
             clientIdItem.value === '662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com' &&
             clientSecretItem.value === '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';
    });
    
    if (!correctConfig) {
      console.log('❌ No correct GBP configuration found');
      return;
    }
    
    console.log(`Found correct configuration with ID: ${correctConfig.id}`);
    
    // Delete all other GBP configurations and their config items
    for (const config of configs) {
      if (config.id !== correctConfig.id) {
        // Delete config items first
        await prisma.socialMediaPlatformConfigItem.deleteMany({
          where: { configId: config.id }
        });
        
        // Then delete the configuration
        await prisma.socialMediaPlatformConfig.delete({
          where: { id: config.id }
        });
        
        console.log(`Deleted configuration with ID: ${config.id}`);
      }
    }
    
    console.log(`✅ Deleted ${configs.length - 1} incorrect GBP configurations`);
    console.log('✅ GBP configuration cleanup completed successfully!');
    
    // Verify the remaining configuration
    const remainingConfigs = await prisma.socialMediaPlatformConfig.findMany({
      where: {
        platformKey: 'gbp'
      },
      include: {
        config: true
      }
    });
    
    console.log(`\nRemaining GBP configurations: ${remainingConfigs.length}`);
    if (remainingConfigs.length > 0) {
      const config = remainingConfigs[0];
      console.log(`Configuration ID: ${config.id}`);
      console.log(`Customer ID: ${config.customerId}`);
      config.config.forEach(item => {
        let displayValue = item.value;
        if (item.key === 'GOOGLE_CLIENT_SECRET' && item.value.length > 10) {
          displayValue = item.value.substring(0, 10) + '...';
        } else if (item.key === 'GOOGLE_CLIENT_ID' && item.value.length > 30) {
          displayValue = item.value.substring(0, 30) + '...';
        }
        console.log(`  • ${item.key}: ${displayValue}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up GBP configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupGBPConfig();