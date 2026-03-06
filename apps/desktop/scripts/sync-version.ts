/**
 * sync-version.ts
 *
 * Keeps the desktop app version in sync across three files:
 *   - apps/desktop/src-tauri/tauri.conf.json  ("version")
 *   - apps/desktop/src-tauri/Cargo.toml       (version in [package])
 *   - apps/desktop/package.json               ("version")
 *
 * Usage:
 *   pnpm --filter @gitroom/desktop run sync-version          # reads latest git tag
 *   pnpm --filter @gitroom/desktop run sync-version 2.13.0   # explicit version
 *
 * Or from repo root:
 *   npx ts-node apps/desktop/scripts/sync-version.ts
 *   npx ts-node apps/desktop/scripts/sync-version.ts 2.13.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const DESKTOP_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(DESKTOP_DIR, '../..');

function getLatestGitTag(): string {
  const result = spawnSync('git', ['describe', '--tags', '--abbrev=0'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error('Could not determine version from git tags. Pass a version argument instead.');
  }
  return result.stdout.trim().replace(/^v/, ''); // strip leading 'v'
}

function main() {
  const version = process.argv[2] || getLatestGitTag();

  // Validate semver-ish format
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    console.error(`Invalid version format: "${version}". Expected X.Y.Z`);
    process.exit(1);
  }

  console.log(`Syncing desktop version to ${version}...`);

  // 1. tauri.conf.json
  const tauriConfPath = path.join(DESKTOP_DIR, 'src-tauri/tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  const oldTauriVersion = tauriConf.version;
  tauriConf.version = version;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`  tauri.conf.json: ${oldTauriVersion} → ${version}`);

  // 2. Cargo.toml (update only the [package] version, not dep versions)
  const cargoPath = path.join(DESKTOP_DIR, 'src-tauri/Cargo.toml');
  let cargoContent = fs.readFileSync(cargoPath, 'utf-8');
  const cargoVersionMatch = cargoContent.match(/^version\s*=\s*"([^"]+)"/m);
  const oldCargoVersion = cargoVersionMatch ? cargoVersionMatch[1] : '?';
  // Replace only the first occurrence (the [package] version)
  cargoContent = cargoContent.replace(/^(version\s*=\s*)"[^"]+"/, `$1"${version}"`);
  fs.writeFileSync(cargoPath, cargoContent);
  console.log(`  Cargo.toml: ${oldCargoVersion} → ${version}`);

  // 3. package.json
  const pkgPath = path.join(DESKTOP_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const oldPkgVersion = pkg.version;
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  package.json: ${oldPkgVersion} → ${version}`);

  console.log(`\nDone. All three files now report version ${version}.`);
  console.log('Remember to commit these changes and rebuild the app.');
}

main();
