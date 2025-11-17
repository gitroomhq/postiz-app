const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local'
    }
  }
});

async function verifyGbpConfig() {
  try {
    console.log('🔍 Verifying GBP Configuration in Database...\n');
    
    const configs = await prisma.socialMediaPlatformConfig.findMany({
      where: {
        platformKey: 'GBP'
      },
      include: {
        config: true
      }
    });
    
    if (configs.length === 0) {
      console.log('❌ No GBP configuration found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found ${configs.length} GBP configuration(s):\n`);
    
    configs.forEach((config, index) => {
      console.log(`--- Configuration #${index + 1} ---`);
      console.log(`ID: ${config.id}`);
      console.log(`Platform: ${config.platform}`);
      console.log(`Platform Key: ${config.platformKey}`);
      console.log(`Organization ID: ${config.organizationId}`);
      console.log(`Customer ID: ${config.customerId || 'null'}`);
      console.log(`Created: ${config.createdAt}`);
      console.log(`Updated: ${config.updatedAt}`);
      console.log('\nConfig Items:');
      config.config.forEach((item) => {
        const maskedValue = item.key.includes('SECRET') || item.key.includes('PASSWORD') 
          ? item.value.substring(0, 10) + '...' 
          : item.value;
        console.log(`  • ${item.key}: ${maskedValue}`);
      });
      console.log('');
    });
    
    console.log('✅ Verification complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Navigate to Integrations');
    console.log('3. Try to connect Google Business Profile');
    console.log('4. Check logs for "Using APPROVED GBP API credentials"');
    
  } catch (error) {
    console.error('❌ Error verifying GBP configuration:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyGbpConfig();
