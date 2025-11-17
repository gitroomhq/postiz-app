// Detailed test script to debug GBP provider configuration loading
const { PrismaClient } = require('@prisma/client');

// Mock the SocialMediaPlatformConfigService for testing
class MockSocialMediaPlatformConfigService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getPlatformConfig(platformKey, orgId, customerId) {
    console.log(`Fetching config for platformKey: ${platformKey}, orgId: ${orgId}, customerId: ${customerId}`);
    
    try {
      const config = await this.prisma.socialMediaPlatformConfig.findFirst({
        where: {
          platformKey,
          organizationId: orgId,
          customerId: customerId || null
        },
        include: {
          config: true
        }
      });
      
      console.log('Database query result:', config ? 'Found' : 'Not found');
      if (config) {
        console.log('Config details:', {
          id: config.id,
          platform: config.platform,
          platformKey: config.platformKey,
          organizationId: config.organizationId,
          customerId: config.customerId,
          configCount: config.config.length
        });
      }
      
      return config;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}

// Detailed test of the GBP provider configuration loading
async function debugGBPProviderConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Debugging GBP provider configuration loading...');
    
    // Get the organization ID
    console.log('Fetching organizations...');
    const organizations = await prisma.organization.findMany();
    console.log(`Found ${organizations.length} organization(s)`);
    
    if (organizations.length === 0) {
      console.log('❌ No organizations found');
      return;
    }
    
    const org = organizations[0];
    const orgId = org.id;
    console.log(`Using organization: ${org.name} (ID: ${orgId})`);
    
    // Create mock service
    const configService = new MockSocialMediaPlatformConfigService(prisma);
    
    // Try to get the GBP configuration with null customerId
    console.log('Attempting to fetch GBP configuration with null customerId...');
    const config1 = await configService.getPlatformConfig('gbp', orgId, null);
    
    if (config1) {
      console.log('✅ GBP configuration found with null customerId');
    } else {
      console.log('❌ No GBP configuration found with null customerId');
    }
    
    // Try to get the GBP configuration with undefined customerId
    console.log('Attempting to fetch GBP configuration with undefined customerId...');
    const config2 = await configService.getPlatformConfig('gbp', orgId, undefined);
    
    if (config2) {
      console.log('✅ GBP configuration found with undefined customerId');
    } else {
      console.log('❌ No GBP configuration found with undefined customerId');
    }
    
    // Try to get any GBP configuration
    console.log('Attempting to fetch any GBP configuration...');
    const anyConfig = await prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey: 'gbp',
        organizationId: orgId
      },
      include: {
        config: true
      }
    });
    
    if (anyConfig) {
      console.log('✅ Found GBP configuration:');
      console.log({
        id: anyConfig.id,
        platform: anyConfig.platform,
        platformKey: anyConfig.platformKey,
        organizationId: anyConfig.organizationId,
        customerId: anyConfig.customerId,
        configCount: anyConfig.config.length
      });
    } else {
      console.log('❌ No GBP configuration found at all');
    }
    
  } catch (error) {
    console.error('❌ Error debugging GBP provider configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGBPProviderConfig();