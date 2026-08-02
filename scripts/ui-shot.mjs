#!/usr/bin/env node
/**
 * Screenshot tool for the UI migration.
 *
 * `chrome --headless --screenshot` cannot do the two things this migration needs
 * most: it will not size a viewport below ~500px (so phone widths silently come
 * back cropped, which reads as "the layout overflows" when it doesn't), and it
 * has no way to carry a session cookie. So this drives Chrome over CDP instead:
 * cookies first, then a real device-metrics override, then the capture.
 *
 *   node scripts/ui-shot.mjs --url http://localhost:4200/launches \
 *     --out docs/ui-shots/step-0/launches --theme both --width 420,900,1440
 *
 * --theme both writes <out>-<width>-<theme>.png for every combination, which is
 * the grid every step has to check anyway.
 *
 * Env:
 *   PQ_AUTH    session cookie value (optional; without it you get the login screen)
 *   PQ_HOST    cookie domain, default localhost
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const url = arg('url');
const out = arg('out');
if (!url || !out) {
  console.error('usage: ui-shot.mjs --url <url> --out <path-without-extension> [--width 420,900,1440] [--theme dark|light|both] [--full]');
  process.exit(2);
}
const widths = String(arg('width', '1440')).split(',').map((w) => parseInt(w, 10));
const themeArg = arg('theme', 'dark');
const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg];
const height = parseInt(arg('height', '900'), 10);
const fullPage = process.argv.includes('--full');
const host = process.env.PQ_HOST || 'localhost';

const freePort = () =>
  new Promise((res) => {
    const s = net.createServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chromeTarget(port) {
  // Chrome needs a moment before the debugging endpoint answers.
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await r.json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a debugging target');
}

/** Minimal CDP client — one in-flight map plus an event bus, no dependencies. */
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Map();
  let id = 0;
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
      return;
    }
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    msg.error ? slot.reject(new Error(msg.error.message)) : slot.resolve(msg.result);
  });
  return {
    ready,
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    send(method, params = {}) {
      const mid = ++id;
      ws.send(JSON.stringify({ id: mid, method, params }));
      return new Promise((resolve, reject) => pending.set(mid, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

const port = await freePort();
// A per-run profile directory. A shared one means a Chrome left behind by an
// interrupted run holds the lock and the next run fails to start at all.
const profile = await mkdtemp(join(tmpdir(), 'pq-ui-shot-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const cdp = connect(await chromeTarget(port));
await cdp.ready;
await cdp.send('Page.enable');
await cdp.send('Network.enable');

// Waiting a fixed number of seconds after navigate is not good enough, and the
// first baseline proved it: on a cold `next dev` the route is compiled on
// demand, so 13 of 48 screenshots caught the loading skeleton instead of the
// page, and then looked like a regression when the next run caught the real
// thing. So wait for the network to actually go quiet.
const inflight = new Map();
cdp.on('Network.requestWillBeSent', ({ requestId }) =>
  inflight.set(requestId, Date.now())
);
for (const done of ['Network.loadingFinished', 'Network.loadingFailed']) {
  cdp.on(done, ({ requestId }) => inflight.delete(requestId));
}

const QUIET_MS = 800;
const MIN_MS = 1200;
const MAX_MS = 45000;
// A connection open longer than this is a stream, not a page load: `next dev`
// holds an HMR socket open for the life of the tab and CopilotKit keeps its own
// channel. Neither ever emits loadingFinished, so counting them means the
// network is never "quiet" and every shot burns the full timeout. Age them out.
const STREAM_MS = 5000;

const pendingLoads = () => {
  const now = Date.now();
  let n = 0;
  for (const started of inflight.values()) if (now - started < STREAM_MS) n++;
  return n;
};

async function settle() {
  const start = Date.now();
  let quietSince = null;
  for (;;) {
    const elapsed = Date.now() - start;
    if (elapsed > MAX_MS) return { timedOut: true, elapsed };
    if (pendingLoads() === 0) {
      quietSince ??= Date.now();
      if (Date.now() - quietSince >= QUIET_MS && elapsed >= MIN_MS) {
        return { timedOut: false, elapsed };
      }
    } else {
      quietSince = null;
    }
    await sleep(100);
  }
}

const results = [];
try {
  for (const theme of themes) {
    const cookies = [{ name: 'mode', value: theme, domain: host, path: '/' }];
    if (process.env.PQ_AUTH) {
      cookies.push({ name: 'auth', value: process.env.PQ_AUTH, domain: host, path: '/' });
    }
    await cdp.send('Network.setCookies', { cookies });

    for (const width of widths) {
      // The override is the whole point: it is what lets us render 420px, which
      // the --window-size flag refuses to do.
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 760,
      });

      inflight.clear();
      await cdp.send('Page.navigate', { url });
      const { timedOut, elapsed } = await settle();

      // A skeleton that survives a quiet network is a real render, but one that
      // survives a *timeout* means the shot is probably of a half-loaded page.
      // Say so rather than writing a file that silently misrepresents the app.
      const { result } = await cdp.send('Runtime.evaluate', {
        expression:
          'JSON.stringify({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })',
        returnByValue: true,
      });
      const { sw, cw } = JSON.parse(result.value);

      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: fullPage,
      });
      const file = `${out}-${width}-${theme}.png`;
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(shot.data, 'base64'));
      results.push({
        file,
        width,
        theme,
        overflow: sw > cw ? sw - cw : 0,
        timedOut,
        elapsed,
      });
    }
  }
} finally {
  cdp.close();
  chrome.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

let bad = 0;
for (const r of results) {
  const flags = [];
  if (r.overflow) flags.push(`⚠ horizontal overflow +${r.overflow}px`);
  if (r.timedOut) {
    flags.push(`⚠ network never went quiet (${(r.elapsed / 1000).toFixed(1)}s) — shot may be mid-load`);
    bad++;
  }
  console.log(
    `${r.width.toString().padStart(4)}px ${r.theme.padEnd(5)} → ${r.file}` +
      (flags.length ? `  ${flags.join('  ')}` : '')
  );
}
if (bad) process.exitCode = 1;
