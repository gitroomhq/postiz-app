import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { mkdir } from 'fs/promises';

export interface ServiceStatus {
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  port?: number;
  pid?: number;
  error?: string;
}

export class ServiceManager {
  private processes: Map<string, ChildProcess> = new Map();
  private rootDir: string;
  private dataDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.dataDir = this.getDataDir();
  }

  async startAll(
    onStatusChange: (status: ServiceStatus) => void
  ): Promise<void> {
    // Ensure data directory exists
    await mkdir(this.dataDir, { recursive: true });

    // Ensure PGlite data directory exists
    const pgliteDataDir = path.join(this.dataDir, 'pglite-data');
    await mkdir(pgliteDataDir, { recursive: true });

    // 1. Start Temporal dev server first
    await this.startTemporal(onStatusChange);

    // 2. Start backend (NestJS on port 3000)
    await this.startService('backend', 3000, onStatusChange);

    // 3. Start frontend (Next.js on port 4200)
    await this.startService('frontend', 4200, onStatusChange);

    // 4. Start orchestrator (Temporal worker)
    await this.startService('orchestrator', null, onStatusChange);
  }

  private async startService(
    name: string,
    port: number | null,
    onStatusChange: (status: ServiceStatus) => void
  ): Promise<void> {
    onStatusChange({ name, status: 'starting', port: port ?? undefined });

    const cwd = path.join(this.rootDir, 'apps', name);

    // PGlite data directory - uses same PostgreSQL schema as server deployment
    // For desktop mode, PGlite provides embedded PostgreSQL with full compatibility
    // Users can override DATABASE_URL to point to external PostgreSQL for team use
    const pgliteDataDir = path.join(this.dataDir, 'pglite-data');
    const databaseUrl =
      process.env.DATABASE_URL ||
      `postgresql://localhost:5432/postiz?pglite=${encodeURIComponent(pgliteDataDir)}`;

    // SECURITY: Use spawn with array args, not shell interpolation
    const proc = spawn('pnpm', ['run', 'start'], {
      cwd,
      env: {
        ...process.env,
        POSTIZ_MODE: 'desktop',
        // PGlite data directory - embedded PostgreSQL for desktop
        // Same schema as server deployment, data can be migrated to external PostgreSQL
        DATABASE_URL: databaseUrl,
        PGLITE_DATA_DIR: pgliteDataDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.processes.set(name, proc);

    proc.stdout?.on('data', (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    proc.stderr?.on('data', (data) => {
      console.error(`[${name}] ${data.toString().trim()}`);
    });

    proc.on('error', (error) => {
      onStatusChange({ name, status: 'error', error: error.message });
    });

    proc.on('exit', (code) => {
      if (code !== 0) {
        onStatusChange({ name, status: 'error', error: `Exit code ${code}` });
      } else {
        onStatusChange({ name, status: 'stopped' });
      }
      this.processes.delete(name);
    });

    // Wait for port to be ready (if applicable)
    if (port) {
      try {
        await this.waitForPort(port, 60000);
        onStatusChange({
          name,
          status: 'running',
          port,
          pid: proc.pid,
        });
      } catch (error) {
        onStatusChange({
          name,
          status: 'error',
          error: `Timeout waiting for port ${port}`,
        });
      }
    } else {
      // For services without ports (like orchestrator), just mark as running
      onStatusChange({
        name,
        status: 'running',
        pid: proc.pid,
      });
    }
  }

  private async startTemporal(
    onStatusChange: (status: ServiceStatus) => void
  ): Promise<void> {
    onStatusChange({ name: 'temporal', status: 'starting', port: 7233 });

    const dbPath = path.join(this.dataDir, 'temporal.db');

    // Check if temporal is already running
    if (await this.isPortOpen(7233)) {
      console.log('[temporal] Already running on port 7233');
      onStatusChange({ name: 'temporal', status: 'running', port: 7233 });
      return;
    }

    // SECURITY: Use spawn with array args, not string interpolation
    const proc = spawn(
      'temporal',
      [
        'server',
        'start-dev',
        '--db-filename',
        dbPath,
        '--port',
        '7233',
        '--ui-port',
        '8233',
      ],
      {
        detached: true,
        stdio: 'ignore',
      }
    );

    proc.unref();
    this.processes.set('temporal', proc);

    try {
      await this.waitForPort(7233, 30000);
      onStatusChange({
        name: 'temporal',
        status: 'running',
        port: 7233,
        pid: proc.pid,
      });
    } catch (error) {
      onStatusChange({
        name: 'temporal',
        status: 'error',
        error: 'Timeout waiting for Temporal to start. Is Temporal CLI installed?',
      });
    }
  }

  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    this.processes.forEach((proc, name) => {
      stopPromises.push(this.stopProcess(name, proc));
    });

    await Promise.all(stopPromises);
    this.processes.clear();
  }

  private async stopProcess(name: string, proc: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      console.log(`[${name}] Stopping...`);

      proc.on('exit', () => {
        console.log(`[${name}] Stopped`);
        resolve();
      });

      proc.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }

  private async waitForPort(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isPortOpen(port)) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Timeout waiting for port ${port}`);
  }

  private isPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        resolve(false);
      });
      socket.connect(port, 'localhost');
    });
  }

  private getDataDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (process.platform === 'darwin') {
      return path.join(home, 'Library', 'Application Support', 'Postiz');
    } else if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || home, 'Postiz');
    } else {
      return path.join(home, '.local', 'share', 'postiz');
    }
  }

  getDataDirectory(): string {
    return this.dataDir;
  }
}
