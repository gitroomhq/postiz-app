// Test script to verify GBP provider reads from database
const { PrismaClient } = require('@prisma/client');

// Mock the SocialMediaPlatformConfigService for testing
class MockSocialMediaPlatformConfigService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getPlatformConfig(platformKey, orgId, customerId) {
    return this.prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey,
        organizationId: orgId,
        customerId: customerId || null
      },
      include: {
        config: true
      }
    });
  }
}

// Simple test of the GBP provider configuration loading
async function testGBPProviderConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing GBP provider configuration loading...');
    
    // Get the organization ID
    const organizations = await prisma.organization.findMany();
    if (organizations.length === 0) {
      console.log('❌ No organizations found');
      return;
    }
    
    const orgId = organizations[0].id;
    console.log(`Using organization ID: ${orgId}`);
    
    // Create mock service
    const configService = new MockSocialMediaPlatformConfigService(prisma);
    
    // Try to get the GBP configuration
    const config = await configService.getPlatformConfig('gbp', orgId, null);
    
    if (!config) {
      console.log('❌ No GBP configuration found');
      return;
    }
    
    console.log('✅ GBP configuration loaded from database:');
    console.log(`Platform: ${config.platform}`);
    console.log(`Platform Key: ${config.platformKey}`);
    
    // Transform config array to key-value object (same as in integration.manager.ts)
    const configObject = config.config.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    
    console.log('Configuration object:');
    Object.keys(configObject).forEach(key => {
      let displayValue = configObject[key];
      if (key === 'GOOGLE_CLIENT_SECRET' && displayValue.length > 10) {
        displayValue = displayValue.substring(0, 10) + '...';
      } else if (key === 'GOOGLE_CLIENT_ID' && displayValue.length > 30) {
        displayValue = displayValue.substring(0, 30) + '...';
      }
      console.log(`  • ${key}: ${displayValue}`);
    });
    
    // Verify required keys are present
    const requiredKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FRONTEND_URL'];
    const missingKeys = requiredKeys.filter(key => !configObject[key]);
    
    if (missingKeys.length > 0) {
      console.log(`❌ Missing required configuration keys: ${missingKeys.join(', ')}`);
    } else {
      console.log('✅ All required configuration keys are present');
      console.log('🎉 GBP provider should now read credentials from the database!');
    }
    
  } catch (error) {
    console.error('❌ Error testing GBP provider configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGBPProviderConfig();