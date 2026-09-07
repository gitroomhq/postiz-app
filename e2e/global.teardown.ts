import { disconnectTestPrisma } from '@gitroom/testing/prisma/test.database';

export default async function globalTeardown() {
  await disconnectTestPrisma();
}
