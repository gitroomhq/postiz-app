const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGbpConfig() {
  try {
    const orgId = 'd5166253-ac52-414a-99b2-eb64f1011af5';
    
    // Check if GBP configuration exists for this organization
    const gbpConfigs = await prisma.socialMediaPlatformConfig.findMany({
      where: {
        platformKey: 'gbp',
        organizationId: orgId,
      },
      include: {
        config: true
      }
    });
    
    console.log('GBP configurations found:', gbpConfigs.length);
    
    if (gbpConfigs.length > 0) {
      console.log('GBP config details:', JSON.stringify(gbpConfigs[0], null, 2));
      
      // Check if it has the required config items
      const configItems = gbpConfigs[0].config;
      const clientId = configItems.find(item => item.key === 'GOOGLE_CLIENT_ID');
      const clientSecret = configItems.find(item => item.key === 'GOOGLE_CLIENT_SECRET');
      
      console.log('GOOGLE_CLIENT_ID exists:', !!clientId);
      console.log('GOOGLE_CLIENT_SECRET exists:', !!clientSecret);
      
      if (clientId) {
        console.log('GOOGLE_CLIENT_ID value:', clientId.value);
      }
      if (clientSecret) {
        console.log('GOOGLE_CLIENT_SECRET value (first 10 chars):', clientSecret.value.substring(0, 10) + '...');
      }
    } else {
      console.log('No GBP configuration found for organization:', orgId);
    }
  } catch (error) {
    console.error('Error checking GBP config:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGbpConfig();