const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

async function verifyGBPConfig() {
  try {
    console.log('🔍 Verifying GBP database configuration...');
    
    // Find the GBP configuration with null customerId
    const config = await prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey: 'gbp',
        customerId: null
      },
      include: {
        config: true
      }
    });
    
    if (!config) {
      console.log('❌ No GBP configuration found in the database');
      console.log('💡 Run the configure-gbp-database.js script to set up the configuration');
      return;
    }
    
    console.log('✅ GBP configuration found!');
    console.log(`Platform: ${config.platform}`);
    console.log(`Platform Key: ${config.platformKey}`);
    console.log(`Organization ID: ${config.organizationId}`);
    console.log('Config Items:');
    
    // Display config items with masked sensitive data
    config.config.forEach(item => {
      let displayValue = item.value;
      if (item.key === 'GOOGLE_CLIENT_SECRET' && item.value.length > 10) {
        displayValue = item.value.substring(0, 10) + '...';
      } else if (item.key === 'GOOGLE_CLIENT_ID' && item.value.length > 30) {
        displayValue = item.value.substring(0, 30) + '...';
      }
      console.log(`  • ${item.key}: ${displayValue}`);
    });
    
    // Check if all required keys are present
    const requiredKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FRONTEND_URL'];
    const missingKeys = requiredKeys.filter(key => !config.config.some(item => item.key === key));
    
    if (missingKeys.length > 0) {
      console.log(`❌ Missing required configuration keys: ${missingKeys.join(', ')}`);
    } else {
      console.log('✅ All required configuration keys are present');
    }
    
  } catch (error) {
    console.error('❌ Error verifying GBP configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifyGBPConfig();
}

module.exports = { verifyGBPConfig };