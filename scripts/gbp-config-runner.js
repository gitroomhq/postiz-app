const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local'
    }
  }
});

async function addGbpConfig() {
  try {
    console.log('🔄 Connecting to database...');
    
    const org = await prisma.organization.findFirst();
    
    if (!org) {
      console.log('📝 No organization found. Creating a default organization...');
      const newOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          description: 'Default organization for testing'
        }
      });
      console.log(`✅ Created organization: ${newOrg.name} (${newOrg.id})`);
      global.org = newOrg;
    } else {
      console.log(`✅ Found organization: ${org.name} (${org.id})`);
      global.org = org;
    }
    
    // Find existing config first
    let config = await prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey: 'GBP',
        organizationId: global.org.id,
        customerId: null
      }
    });
    
    if (!config) {
      console.log('📝 Creating new GBP configuration...');
      config = await prisma.socialMediaPlatformConfig.create({
        data: {
          platform: 'Google Business Profile',
          platformKey: 'GBP',
          organizationId: global.org.id,
          customerId: null,
        },
      });
    } else {
      console.log('📝 Updating existing GBP configuration...');
      config = await prisma.socialMediaPlatformConfig.update({
        where: { id: config.id },
        data: {
          platform: 'Google Business Profile',
          updatedAt: new Date(),
        },
      });
    }
    
    console.log(`✅ Created/updated GBP config with ID: ${config.id}`);
    
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
    
    for (const item of configItems) {
      // Use findFirst + upsert pattern
      const existingItem = await prisma.socialMediaPlatformConfigItem.findFirst({
        where: {
          key: item.key,
          configId: config.id
        }
      });
      
      if (existingItem) {
        await prisma.socialMediaPlatformConfigItem.update({
          where: { id: existingItem.id },
          data: { value: item.value }
        });
      } else {
        await prisma.socialMediaPlatformConfigItem.create({
          data: {
            key: item.key,
            value: item.value,
            configId: config.id,
          }
        });
      }
      console.log(`  ✓ Configured: ${item.key}`);
    }
    
    const updatedConfig = await prisma.socialMediaPlatformConfig.findUnique({
      where: { id: config.id },
      include: { config: true },
    });
    
    console.log('\n=== GBP Configuration Summary ===');
    console.log(`Platform: ${updatedConfig.platform}`);
    console.log(`Platform Key: ${updatedConfig.platformKey}`);
    console.log(`Organization: ${updatedConfig.organizationId}`);
    console.log('\nConfiguration Items:');
    updatedConfig.config.forEach((item) => {
      const maskedValue = item.key.includes('SECRET') || item.key.includes('PASSWORD') 
        ? item.value.substring(0, 8) + '...' 
        : item.value;
      console.log(`  ${item.key}: ${maskedValue}`);
    });
    
    console.log('\n✅ GBP configuration successfully added to database!');
    console.log('The GBP provider will now read credentials from the database.');
    
  } catch (error) {
    console.error('❌ Error adding GBP configuration:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addGbpConfig();
