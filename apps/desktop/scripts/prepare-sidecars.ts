#!/usr/bin/env ts-node
/**
 * Prepare sidecars and resources for Postiz desktop app
 *
 * This script:
 * 1. Downloads Node.js binary for the target platform (sidecar)
 * 2. Uses pnpm deploy to create minimal production deployments
 *
 * The Tauri app ships:
 * - Node.js as a sidecar (spawned to run JS code)
 * - Temporal CLI as a sidecar
 * - JS code + production dependencies as resources
 *
 * Usage:
 *   npx ts-node scripts/prepare-sidecars.ts
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

const NODE_VERSION = '22.13.1'; // LTS version

// Node.js download URLs per platform
const NODE_DOWNLOADS: Record<string, { url: string; dirname: string }> = {
  'aarch64-apple-darwin': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    dirname: `node-v${NODE_VERSION}-darwin-arm64`,
  },
  'x86_64-apple-darwin': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    dirname: `node-v${NODE_VERSION}-darwin-x64`,
  },
  'x86_64-unknown-linux-gnu': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz`,
    dirname: `node-v${NODE_VERSION}-linux-x64`,
  },
  'aarch64-unknown-linux-gnu': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.gz`,
    dirname: `node-v${NODE_VERSION}-linux-arm64`,
  },
  'x86_64-pc-windows-msvc': {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    dirname: `node-v${NODE_VERSION}-win-x64`,
  },
};

function detectTargetTriple(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
  if (platform === 'linux' && arch === 'arm64') return 'aarch64-unknown-linux-gnu';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DESKTOP_DIR = path.resolve(__dirname, '..');
const BINARIES_DIR = path.join(DESKTOP_DIR, 'src-tauri', 'binaries');
const RESOURCES_DIR = path.join(DESKTOP_DIR, 'src-tauri', 'resources');
const CACHE_DIR = path.join(ROOT_DIR, '.cache');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location!, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

async function downloadNodeBinary(targetTriple: string): Promise<void> {
  const nodeInfo = NODE_DOWNLOADS[targetTriple];
  if (!nodeInfo) {
    throw new Error(`No Node.js download for: ${targetTriple}`);
  }

  ensureDir(CACHE_DIR);
  ensureDir(BINARIES_DIR);

  const archivePath = path.join(CACHE_DIR, path.basename(nodeInfo.url));
  const extractDir = path.join(CACHE_DIR, nodeInfo.dirname);
  const isWindows = targetTriple.includes('windows');
  const nodeSrc = isWindows
    ? path.join(extractDir, 'node.exe')
    : path.join(extractDir, 'bin', 'node');
  const nodeDest = path.join(BINARIES_DIR, `node-${targetTriple}${isWindows ? '.exe' : ''}`);

  // Check if already exists
  if (fs.existsSync(nodeDest)) {
    console.log(`✓ Node.js binary exists: ${nodeDest}`);
    return;
  }

  // Download if needed
  if (!fs.existsSync(archivePath)) {
    console.log(`Downloading Node.js v${NODE_VERSION}...`);
    await downloadFile(nodeInfo.url, archivePath);
  }

  // Extract if needed
  if (!fs.existsSync(nodeSrc)) {
    console.log('Extracting Node.js...');
    if (archivePath.endsWith('.tar.gz')) {
      spawnSync('tar', ['-xzf', archivePath, '-C', CACHE_DIR], { stdio: 'inherit' });
    } else {
      spawnSync('unzip', ['-q', '-o', archivePath, '-d', CACHE_DIR], { stdio: 'inherit' });
    }
  }

  // Copy node binary
  console.log(`Copying Node.js to: ${nodeDest}`);
  fs.copyFileSync(nodeSrc, nodeDest);
  fs.chmodSync(nodeDest, 0o755);
  console.log(`✓ Node.js binary ready`);
}

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getDirSize(dir: string): string {
  const result = spawnSync('du', ['-sh', dir], { encoding: 'utf-8' });
  if (result.status === 0 && result.stdout) {
    return result.stdout.split('\t')[0].trim();
  }
  return 'N/A';
}

/**
 * Packages that are dev-only or not needed at runtime.
 * These get pulled in via pnpm workspace hoisting but aren't actually used.
 */
const PACKAGES_TO_PRUNE = [
  // Build tools (not needed at runtime)
  'typescript', '@types', 'ts-node', 'ts-loader',
  'webpack', 'webpack-cli', 'webpack-dev-server', 'webpack-merge',
  'fork-ts-checker-webpack-plugin', 'terser-webpack-plugin',
  'esbuild', '@esbuild', 'rollup', '@rollup',
  '@swc', 'swc-loader',
  '@angular-devkit', '@angular', 'angular',

  // Testing (not needed at runtime)
  'vitest', '@vitest', 'jest', '@jest', 'mocha', 'chai',
  'cypress', 'playwright', '@playwright',
  'happy-dom', 'jsdom', '@testing-library',

  // Linting (not needed at runtime)
  'eslint', '@eslint', 'prettier', '@prettier',
  'stylelint', '@stylelint',

  // Frontend-only packages (not needed in backend)
  'next', '@next',
  '@blueprintjs',
  'react-native', '@react-native', 'hermes-compiler', 'metro',
  '@mui', '@emotion', '@chakra-ui',
  'lucide-react', 'react-icons', '@icons',
  'emoji-picker-react', '@meronex',
  'posthog-js',
  '@mantine', '@tabler',
  'hls.js',
  '@radix-ui',
  'framer-motion',
  '@headlessui',

  // Documentation
  'typedoc', '@typedoc', 'storybook', '@storybook',

  // Dev utilities
  '@types', 'nodemon', 'concurrently', 'cross-env',
];

/**
 * Prune unnecessary packages from node_modules to reduce bundle size
 */
function pruneNodeModules(nodeModulesDir: string): void {
  if (!fs.existsSync(nodeModulesDir)) return;

  console.log('  Pruning unnecessary packages...');
  let removedCount = 0;
  let removedSize = 0;

  const entries = fs.readdirSync(nodeModulesDir);
  for (const entry of entries) {
    const shouldPrune = PACKAGES_TO_PRUNE.some(pkg => {
      if (pkg.startsWith('@')) {
        return entry === pkg || entry.startsWith(pkg + '/');
      }
      return entry === pkg;
    });

    if (shouldPrune) {
      const entryPath = path.join(nodeModulesDir, entry);
      try {
        const sizeResult = spawnSync('du', ['-sk', entryPath], { encoding: 'utf-8' });
        if (sizeResult.status === 0) {
          removedSize += parseInt(sizeResult.stdout.split('\t')[0]) || 0;
        }
        fs.rmSync(entryPath, { recursive: true, force: true });
        removedCount++;
      } catch {
        // Ignore errors
      }
    }

    // Handle scoped packages (@org/package)
    const entryFullPath = path.join(nodeModulesDir, entry);
    if (entry.startsWith('@') && fs.existsSync(entryFullPath) && fs.statSync(entryFullPath).isDirectory()) {
      const scopedDir = entryFullPath;
      const scopedEntries = fs.readdirSync(scopedDir);
      for (const scopedEntry of scopedEntries) {
        const fullName = `${entry}/${scopedEntry}`;
        const shouldPruneScoped = PACKAGES_TO_PRUNE.some(pkg =>
          fullName === pkg || fullName.startsWith(pkg + '/')
        );
        if (shouldPruneScoped) {
          const entryPath = path.join(scopedDir, scopedEntry);
          try {
            const sizeResult = spawnSync('du', ['-sk', entryPath], { encoding: 'utf-8' });
            if (sizeResult.status === 0) {
              removedSize += parseInt(sizeResult.stdout.split('\t')[0]) || 0;
            }
            fs.rmSync(entryPath, { recursive: true, force: true });
            removedCount++;
          } catch {
            // Ignore errors
          }
        }
      }
      // Remove empty scoped directory
      try {
        const remaining = fs.readdirSync(scopedDir);
        if (remaining.length === 0) {
          fs.rmdirSync(scopedDir);
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // Also prune the .pnpm directory for removed packages
  const pnpmDir = path.join(nodeModulesDir, '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const pnpmEntries = fs.readdirSync(pnpmDir);
    for (const entry of pnpmEntries) {
      const shouldPrune = PACKAGES_TO_PRUNE.some(pkg => {
        const normalizedPkg = pkg.replace('/', '+');
        return entry.startsWith(normalizedPkg + '@') || entry.startsWith(normalizedPkg + '+');
      });
      if (shouldPrune) {
        try {
          fs.rmSync(path.join(pnpmDir, entry), { recursive: true, force: true });
        } catch {
          // Ignore errors
        }
      }
    }
  }

  // Remove all .bin directories recursively (contain symlinks that break Tauri build)
  console.log('  Removing .bin directories...');
  const result = spawnSync('find', [nodeModulesDir, '-type', 'd', '-name', '.bin', '-exec', 'rm', '-rf', '{}', '+'], {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  // Also remove any broken symlinks
  spawnSync('find', [nodeModulesDir, '-type', 'l', '!', '-exec', 'test', '-e', '{}', ';', '-delete'], {
    stdio: 'pipe'
  });

  const removedMB = (removedSize / 1024).toFixed(1);
  console.log(`  Removed ${removedCount} packages (~${removedMB} MB)`);
}

/**
 * Deploy a package using pnpm deploy --prod
 * This creates a minimal production deployment with all dependencies
 */
function deployWithPnpm(packageFilter: string, targetDir: string): boolean {
  console.log(`  Using pnpm deploy for ${packageFilter}...`);

  // Clean target directory
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }

  // Use pnpm deploy with --legacy flag for workspace compatibility
  const result = spawnSync(
    'pnpm',
    ['--filter', packageFilter, '--prod', 'deploy', '--legacy', targetDir],
    {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    }
  );

  // Check if deploy actually created content (pnpm returns 0 even when no matches)
  const hasContent = fs.existsSync(targetDir) &&
    fs.existsSync(path.join(targetDir, 'node_modules'));

  if (result.status === 0 && !hasContent) {
    console.log(`  ⚠️ pnpm deploy returned success but no content created`);
    return false;
  }

  return result.status === 0 && hasContent;
}

async function prepareBackendResources(): Promise<void> {
  console.log('\n📦 Preparing backend resources...');

  const backendDir = path.join(RESOURCES_DIR, 'backend');

  // Try pnpm deploy first
  if (deployWithPnpm('postiz-backend', backendDir)) {
    // Copy compiled dist folders (not included in pnpm deploy)
    // NestJS outputs to apps/backend/dist/ not dist/apps/backend/
    console.log('  Copying compiled backend dist...');
    copyDirSync(
      path.join(ROOT_DIR, 'apps/backend/dist'),
      path.join(backendDir, 'dist')
    );

    // Prune dev-only and unnecessary packages
    pruneNodeModules(path.join(backendDir, 'node_modules'));

    // Copy Prisma schema to expected location
    const prismaSrc = path.join(
      ROOT_DIR,
      'libraries/nestjs-libraries/src/database/prisma/schema.prisma'
    );
    const prismaDest = path.join(backendDir, 'prisma', 'schema.prisma');
    ensureDir(path.dirname(prismaDest));
    if (fs.existsSync(prismaSrc)) {
      fs.copyFileSync(prismaSrc, prismaDest);
    }
    console.log('✓ Backend resources ready (pnpm deploy)');
  } else {
    console.log('  pnpm deploy failed, falling back to manual copy...');
    await prepareBackendResourcesManual(backendDir);
  }
}

async function prepareBackendResourcesManual(backendDir: string): Promise<void> {
  if (fs.existsSync(backendDir)) {
    fs.rmSync(backendDir, { recursive: true });
  }
  ensureDir(backendDir);

  // Copy compiled JS
  console.log('  Copying dist/apps/backend...');
  copyDirSync(
    path.join(ROOT_DIR, 'dist/apps/backend'),
    path.join(backendDir, 'dist/apps/backend')
  );

  console.log('  Copying dist/libraries...');
  copyDirSync(
    path.join(ROOT_DIR, 'dist/libraries'),
    path.join(backendDir, 'dist/libraries')
  );

  // Copy entire node_modules (required for NestJS)
  console.log('  Copying node_modules (this may take a while)...');
  copyDirSync(
    path.join(ROOT_DIR, 'node_modules'),
    path.join(backendDir, 'node_modules')
  );

  // Copy Prisma schema
  console.log('  Copying Prisma schema...');
  const prismaDest = path.join(backendDir, 'prisma');
  ensureDir(prismaDest);
  fs.copyFileSync(
    path.join(ROOT_DIR, 'libraries/nestjs-libraries/src/database/prisma/schema.prisma'),
    path.join(prismaDest, 'schema.prisma')
  );

  console.log('✓ Backend resources ready (manual copy)');
}

async function prepareOrchestratorResources(): Promise<void> {
  console.log('\n📦 Preparing orchestrator resources...');

  const orchestratorDir = path.join(RESOURCES_DIR, 'orchestrator');

  // Try pnpm deploy first
  if (deployWithPnpm('postiz-orchestrator', orchestratorDir)) {
    // Copy compiled dist folders (not included in pnpm deploy)
    // NestJS outputs to apps/orchestrator/dist/ not dist/apps/orchestrator/
    console.log('  Copying compiled orchestrator dist...');
    copyDirSync(
      path.join(ROOT_DIR, 'apps/orchestrator/dist'),
      path.join(orchestratorDir, 'dist')
    );

    // Prune dev-only and unnecessary packages
    pruneNodeModules(path.join(orchestratorDir, 'node_modules'));

    // Copy Prisma schema
    const prismaSrc = path.join(
      ROOT_DIR,
      'libraries/nestjs-libraries/src/database/prisma/schema.prisma'
    );
    const prismaDest = path.join(orchestratorDir, 'prisma', 'schema.prisma');
    ensureDir(path.dirname(prismaDest));
    if (fs.existsSync(prismaSrc)) {
      fs.copyFileSync(prismaSrc, prismaDest);
    }
    console.log('✓ Orchestrator resources ready (pnpm deploy)');
  } else {
    console.log('  pnpm deploy failed, falling back to manual copy...');
    await prepareOrchestratorResourcesManual(orchestratorDir);
  }
}

async function prepareOrchestratorResourcesManual(orchestratorDir: string): Promise<void> {
  if (fs.existsSync(orchestratorDir)) {
    fs.rmSync(orchestratorDir, { recursive: true });
  }
  ensureDir(orchestratorDir);

  // Copy compiled JS
  console.log('  Copying dist/apps/orchestrator...');
  copyDirSync(
    path.join(ROOT_DIR, 'dist/apps/orchestrator'),
    path.join(orchestratorDir, 'dist/apps/orchestrator')
  );

  console.log('  Copying dist/libraries...');
  copyDirSync(
    path.join(ROOT_DIR, 'dist/libraries'),
    path.join(orchestratorDir, 'dist/libraries')
  );

  // Copy node_modules
  console.log('  Copying node_modules (this may take a while)...');
  copyDirSync(
    path.join(ROOT_DIR, 'node_modules'),
    path.join(orchestratorDir, 'node_modules')
  );

  // Copy Prisma schema
  console.log('  Copying Prisma schema...');
  const prismaDest = path.join(orchestratorDir, 'prisma');
  ensureDir(prismaDest);
  fs.copyFileSync(
    path.join(ROOT_DIR, 'libraries/nestjs-libraries/src/database/prisma/schema.prisma'),
    path.join(prismaDest, 'schema.prisma')
  );

  console.log('✓ Orchestrator resources ready (manual copy)');
}

async function prepareFrontendResources(): Promise<void> {
  console.log('\n📦 Preparing frontend resources...');

  const frontendDir = path.join(RESOURCES_DIR, 'frontend');
  if (fs.existsSync(frontendDir)) {
    fs.rmSync(frontendDir, { recursive: true });
  }
  ensureDir(frontendDir);

  // Next.js standalone already includes all production dependencies
  console.log('  Copying .next/standalone...');
  copyDirSync(
    path.join(ROOT_DIR, 'apps/frontend/.next/standalone'),
    path.join(frontendDir, 'standalone')
  );

  // Copy static files to the correct location
  console.log('  Copying .next/static...');
  copyDirSync(
    path.join(ROOT_DIR, 'apps/frontend/.next/static'),
    path.join(frontendDir, 'standalone/apps/frontend/.next/static')
  );

  // Copy public folder
  console.log('  Copying public...');
  copyDirSync(
    path.join(ROOT_DIR, 'apps/frontend/public'),
    path.join(frontendDir, 'standalone/apps/frontend/public')
  );

  console.log('✓ Frontend resources ready');
}

async function main(): Promise<void> {
  const targetTriple = detectTargetTriple();

  console.log('='.repeat(60));
  console.log('  Postiz Desktop - Sidecar & Resource Preparation');
  console.log('='.repeat(60));
  console.log(`Target: ${targetTriple}`);
  console.log('');

  // 1. Download Node.js binary
  console.log('📥 Preparing Node.js sidecar...');
  await downloadNodeBinary(targetTriple);

  // 2. Prepare service resources
  await prepareBackendResources();
  await prepareOrchestratorResources();
  await prepareFrontendResources();

  // 3. Report sizes
  console.log('\n' + '='.repeat(60));
  console.log('✅ All sidecars and resources prepared!');
  console.log('');

  console.log('Sidecars (binaries/):');
  const binFiles = fs.readdirSync(BINARIES_DIR);
  for (const file of binFiles) {
    const filePath = path.join(BINARIES_DIR, file);
    const stat = fs.statSync(filePath);
    console.log(`  - ${file} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log('\nResources (resources/):');
  console.log(`  - backend: ${getDirSize(path.join(RESOURCES_DIR, 'backend'))}`);
  console.log(`  - orchestrator: ${getDirSize(path.join(RESOURCES_DIR, 'orchestrator'))}`);
  console.log(`  - frontend: ${getDirSize(path.join(RESOURCES_DIR, 'frontend'))}`);

  console.log('\nNext steps:');
  console.log('  1. cd apps/desktop && pnpm run build');
  console.log('  2. Open target/release/bundle/macos/Postiz.app');
  console.log('='.repeat(60));
}

main().catch(console.error);
