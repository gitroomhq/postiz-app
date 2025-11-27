const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOrganizations() {
  try {
    // Check if organizations table exists and has data
    const orgs = await prisma.organization.findMany();
    console.log('Organizations found:', orgs.length);
    
    if (orgs.length > 0) {
      console.log('First organization:', orgs[0]);
    } else {
      console.log('No organizations found in the database');
    }
    
    // Check if socialMediaPlatformConfig table exists
    try {
      const configs = await prisma.socialMediaPlatformConfig.findMany();
      console.log('SocialMediaPlatformConfig entries found:', configs.length);
      
      if (configs.length > 0) {
        console.log('First config:', configs[0]);
      }
    } catch (error) {
      console.log('SocialMediaPlatformConfig table may not exist or is empty:', error.message);
    }
  } catch (error) {
    console.error('Error checking organizations:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrganizations();