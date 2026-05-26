#!/usr/bin/env node
// Pre-warm Next.js dev server by hitting common routes so cold-compile
// happens before the user's first click. Run manually after `next dev` boots.

const BASE = process.env.PREWARM_BASE || 'http://localhost:4200';
const ROUTES = ['/', '/auth/login', '/launches', '/analytics', '/settings'];
const READINESS_TIMEOUT_MS = 60_000;
const READINESS_POLL_MS = 500;
const PER_ROUTE_TIMEOUT_MS = 30_000;

async function waitReady() {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  process.stdout.write(`[prewarm] waiting for ${BASE} ...`);
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE, { method: 'HEAD' });
      if (r.ok || r.status === 404 || r.status === 500) {
        process.stdout.write(' ready\n');
        return true;
      }
    } catch {
      // server not up yet
    }
    process.stdout.write('.');
    await new Promise((res) => setTimeout(res, READINESS_POLL_MS));
  }
  process.stdout.write(' TIMEOUT\n');
  return false;
}

async function warmRoute(path) {
  const url = `${BASE}${path}`;
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PER_ROUTE_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ac.signal });
    const ms = Date.now() - t0;
    console.log(`[prewarm] ${path} → ${r.status} in ${ms}ms`);
    return r.status < 500;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[prewarm] ${path} → FAIL in ${ms}ms (${e.name})`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const ready = await waitReady();
  if (!ready) {
    console.error(`[prewarm] server never became ready at ${BASE}`);
    process.exit(1);
  }
  const t0 = Date.now();
  let ok = 0;
  for (const route of ROUTES) {
    if (await warmRoute(route)) ok++;
  }
  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[prewarm] Done. ${ok}/${ROUTES.length} routes warmed in ${totalS}s`);
  process.exit(ok === ROUTES.length ? 0 : 1);
}

main();
