const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGbpConfigWithCustomerId() {
  try {
    const orgId = 'd5166253-ac52-414a-99b2-eb64f1011af5';
    const customerId = '1a093d78-7c76-4df5-bf93-bc55d924c38d';
    
    // Check if GBP configuration exists for this organization and customerId
    const gbpConfig = await prisma.socialMediaPlatformConfig.findFirst({
      where: {
        platformKey: 'gbp',
        organizationId: orgId,
        customerId: customerId,
      },
      include: {
        config: true
      }
    });
    
    if (gbpConfig) {
      console.log('GBP configuration found with customerId:', JSON.stringify(gbpConfig, null, 2));
    } else {
      console.log('No GBP configuration found for organization:', orgId, 'and customerId:', customerId);
      
      // Let's also check what customer this customerId refers to
      try {
        const customer = await prisma.customer.findUnique({
          where: {
            id: customerId
          }
        });
        
        if (customer) {
          console.log('Customer details:', JSON.stringify(customer, null, 2));
        } else {
          console.log('Customer not found in database');
        }
      } catch (error) {
        console.log('Error checking customer:', error.message);
      }
    }
  } catch (error) {
    console.error('Error checking GBP config:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGbpConfigWithCustomerId();