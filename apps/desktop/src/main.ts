import { ServiceManager } from './service-manager';
import * as path from 'path';
import * as dotenv from 'dotenv';

const rootDir = path.resolve(__dirname, '..', '..', '..');

// Load environment variables from .env file
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });
console.log(`Loaded environment from: ${envPath}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Postiz Desktop Mode');
  console.log('='.repeat(60));
  console.log('');

  const manager = new ServiceManager(rootDir);

  console.log(`Data directory: ${manager.getDataDirectory()}`);
  console.log('');
  console.log('Starting services...');
  console.log('');

  try {
    await manager.startAll((status) => {
      const icon =
        status.status === 'running'
          ? '\u2705'
          : status.status === 'starting'
            ? '\u23F3'
            : status.status === 'error'
              ? '\u274C'
              : '\u23F9';

      const portInfo = status.port ? ` on port ${status.port}` : '';
      console.log(`${icon} [${status.name}] ${status.status}${portInfo}`);

      if (status.error) {
        console.error(`   Error: ${status.error}`);
      }
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('\u2705 All services started successfully!');
    console.log('');
    console.log('\uD83C\uDF10 Open http://localhost:4200 in your browser');
    console.log('\uD83D\uDCCA Temporal UI: http://localhost:8233');
    console.log('\uD83D\uDD27 Backend API: http://localhost:3000');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('');
    console.error('\u274C Failed to start services:', (error as Error).message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Ensure Temporal CLI is installed: brew install temporal');
    console.error('  2. Run: pnpm run prisma-push:desktop');
    console.error('  3. Check that ports 3000, 4200, 7233, 8233 are available');
    console.error('');
    process.exit(1);
  }

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log('');
    console.log(`${signal} received. Shutting down...`);
    await manager.stopAll();
    console.log('\u2705 All services stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
