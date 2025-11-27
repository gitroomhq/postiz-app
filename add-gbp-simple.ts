import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postiz-db-local'
    }
  }
});

async function addGbpConfig() {
  try {
    // Get first organization
    const org = await prisma.organization.findFirst();
    
    if (!org) {
      console.error('No organization found in the database');
      process.exit(1);
    }
    
    console.log(`Using organization: ${org.name} (${org.id})`);
    
    // Create new GBP configuration
    const config = await prisma.socialMediaPlatformConfig.create({
      data: {
        platform: 'Google Business Profile',
        platformKey: 'GBP',
        organizationId: org.id,
        customerId: null,
        config: {
          create: [
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
          ]
        }
      },
      include: {
        config: true,
      },
    });
    
    console.log('✅ GBP configuration has been successfully added to the database!');
    console.log(`Config ID: ${config.id}`);
    console.log('Config Items:');
    config.config.forEach(item => {
      console.log(`  ${item.key}: ${item.value}`);
    });
    
  } catch (error) {
    console.error('Error adding GBP configuration:', (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addGbpConfig();