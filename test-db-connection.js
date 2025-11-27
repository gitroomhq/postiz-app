const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test the connection by running a simple query
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Database connection successful:', result);
    
    // Check if socialMediaPlatformConfig table exists
    try {
      const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'socialMediaPlatformConfig'`;
      console.log('socialMediaPlatformConfig table exists:', tables.length > 0);
      
      if (tables.length > 0) {
        // Try to query the table
        const config = await prisma.$queryRaw`SELECT * FROM "socialMediaPlatformConfig" LIMIT 1`;
        console.log('Sample data from socialMediaPlatformConfig:', config);
      }
    } catch (error) {
      console.log('Error checking socialMediaPlatformConfig table:', error.message);
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();