const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

async function configureGBP() {
  try {
    console.log('Starting GBP database configuration...');
    
    // First, let's see if there's an organization in the database
    const organizations = await prisma.organization.findMany();
    
    if (organizations.length === 0) {
      console.log('No organizations found in the database. Creating a default organization...');
      
      // Create a default organization
      const org = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          description: 'Auto-generated organization for GBP configuration'
        }
      });
      
      console.log(`Created organization with ID: ${org.id}`);
      var organizationId = org.id;
    } else {
      // Use the first organization
      const org = organizations[0];
      console.log(`Using existing organization: ${org.name} (ID: ${org.id})`);
      var organizationId = org.id;
    }
    
    // Check if GBP configuration already exists
    const existingConfig = await prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey: 'gbp',
        organizationId: organizationId,
        customerId: null
      }
    });
    
    // Use the values from your .env file
    const googleClientId = '662105185459-4k52hkttqersqt221jra9g0j22jlumiu.apps.googleusercontent.com';
    const googleClientSecret = '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';
    const frontendUrl = 'http://localhost:4200';
    
    if (existingConfig) {
      console.log('GBP configuration already exists. Updating...');
      
      // Delete existing config items
      await prisma.socialMediaPlatformConfigItem.deleteMany({
        where: {
          configId: existingConfig.id
        }
      });
      
      // Add new config items with correct values
      await prisma.socialMediaPlatformConfigItem.createMany({
        data: [
          {
            key: 'GOOGLE_CLIENT_ID',
            value: googleClientId,
            configId: existingConfig.id
          },
          {
            key: 'GOOGLE_CLIENT_SECRET',
            value: googleClientSecret,
            configId: existingConfig.id
          },
          {
            key: 'FRONTEND_URL',
            value: frontendUrl,
            configId: existingConfig.id
          }
        ]
      });
      
      console.log('✅ GBP configuration updated successfully!');
    } else {
      console.log('Creating new GBP configuration...');
      
      // Create new GBP configuration with correct values
      const config = await prisma.socialMediaPlatformConfig.create({
        data: {
          platform: 'Google Business Profile',
          platformKey: 'gbp',
          organizationId: organizationId,
          customerId: null,
          config: {
            create: [
              {
                key: 'GOOGLE_CLIENT_ID',
                value: googleClientId
              },
              {
                key: 'GOOGLE_CLIENT_SECRET',
                value: googleClientSecret
              },
              {
                key: 'FRONTEND_URL',
                value: frontendUrl
              }
            ]
          }
        },
        include: {
          config: true
        }
      });
      
      console.log('✅ GBP configuration created successfully!');
      console.log(`Platform: ${config.platform}`);
      console.log(`Platform Key: ${config.platformKey}`);
      console.log(`Organization ID: ${config.organizationId}`);
      console.log('Config Items:');
      config.config.forEach(item => {
        // Hide sensitive information
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
    console.error('❌ Error configuring GBP:', error);
  } finally {
    await prisma.$disconnect();
  }
}

configureGBP();