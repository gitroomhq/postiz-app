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
 *   PQ_COOKIES extra cookies, "name=value;name=value" — for chrome that keeps its
 *              state in one, e.g. PQ_COOKIES='railCollapsed=1'
 *
 * --click takes one or more selectors separated by |, clicked in order after the
 * page settles, for states that only exist after an interaction:
 *
 *   --click '[aria-label="Menu"]'                      the phone drawer, open
 *   --click '[aria-label="Account menu"]'              the user menu, open
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
  console.error('usage: ui-shot.mjs --url <url> --out <path-without-extension> [--width 420,900,1440] [--theme dark|light|both] [--full] [--click "sel|sel"]');
  process.exit(2);
}
const widths = String(arg('width', '1440')).split(',').map((w) => parseInt(w, 10));
const themeArg = arg('theme', 'dark');
const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg];
const height = parseInt(arg('height', '900'), 10);
const fullPage = process.argv.includes('--full');
const host = process.env.PQ_HOST || 'localhost';
// Anything that only exists after a click — an open menu, the phone drawer, a
// dialog and the blur behind it, a toast — was simply unphotographable before
// this. Selectors are applied in order, each followed by a settle.
const clicks = String(arg('click', '')).split('|').filter(Boolean);
const probe = arg('probe', '');
// --count <selector>: how many match. "Did the regrouping drop a provider?" is
// a counting question, and counting tiles in a screenshot is how you miss one.
const count = arg('count', '');
// --tab N presses Tab N times before probing. Real key events, not el.focus(),
// because `:focus-visible` — the thing that decides whether a focus ring is
// drawn at all — only matches keyboard-initiated focus. Doc 06 §E asks for the
// keyboard path to be verified; this is how.
const tabs = parseInt(arg('tab', '0'), 10) || 0;

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
const redirects = [];
try {
  for (const theme of themes) {
    const cookies = [{ name: 'mode', value: theme, domain: host, path: '/' }];
    if (process.env.PQ_AUTH) {
      cookies.push({ name: 'auth', value: process.env.PQ_AUTH, domain: host, path: '/' });
    }
    // Several pieces of chrome remember their state in a cookie rather than in
    // the URL — the collapsed rail, the calendar's collapsed channel column —
    // so without this there is no way to photograph them at all.
    for (const pair of (process.env.PQ_COOKIES || '').split(';')) {
      const [name, ...rest] = pair.split('=');
      if (!name.trim()) continue;
      cookies.push({ name: name.trim(), value: rest.join('='), domain: host, path: '/' });
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
      const nav = await cdp.send('Page.navigate', { url });
      // A dev server that dies mid-run answers with a connection error, and
      // Chrome's error page loads instantly and sits perfectly still — so the
      // idle check below is happy with it and the run writes a screenshot of
      // "This site can't be reached". That has already happened once. Refuse
      // it here rather than let it become somebody's reference image.
      if (nav.errorText) {
        throw new Error(`${url} did not load: ${nav.errorText}`);
      }
      let { timedOut, elapsed } = await settle();

      for (const selector of clicks) {
        const { result: clicked } = await cdp.send('Runtime.evaluate', {
          expression: `(() => { const el = document.querySelector(${JSON.stringify(
            selector
          )}); if (!el) return false; el.click(); return true; })()`,
          returnByValue: true,
        });
        // A selector that matches nothing would otherwise photograph the page
        // in its resting state and read as "the menu never opens".
        if (!clicked.value) {
          throw new Error(`--click selector matched nothing: ${selector}`);
        }
        const after = await settle();
        timedOut = timedOut || after.timedOut;
      }

      // A skeleton that survives a quiet network is a real render, but one that
      // survives a *timeout* means the shot is probably of a half-loaded page.
      // Say so rather than writing a file that silently misrepresents the app.
      const { result } = await cdp.send('Runtime.evaluate', {
        expression:
          'JSON.stringify({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, href: location.href })',
        returnByValue: true,
      });
      const { sw, cw, href } = JSON.parse(result.value);

      // A redirect is a *successful* navigation, so nothing above notices it —
      // and the screenshot is then of a page nobody asked for. The step-0
      // baseline captured the signup screen three times under the name
      // "billing" because /billing bounces when billing is disabled, and every
      // later comparison was quietly comparing signup pages.
      const landed = new URL(href).pathname;
      const asked = new URL(url).pathname;
      if (landed !== asked) redirects.push({ file: `${out}-${width}-${theme}`, asked, landed });

      for (let i = 0; i < tabs; i++) {
        for (const type of ['rawKeyDown', 'keyUp']) {
          await cdp.send('Input.dispatchKeyEvent', {
            type,
            key: 'Tab',
            code: 'Tab',
            windowsVirtualKeyCode: 9,
            nativeVirtualKeyCode: 9,
          });
        }
        await sleep(40);
      }
      if (tabs) {
        const { result: f } = await cdp.send('Runtime.evaluate', {
          expression:
            "(() => { const el = document.activeElement; if (!el) return 'none'; const cs = getComputedStyle(el); return JSON.stringify({ tag: el.tagName, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), outline: cs.outlineStyle === 'none' ? 'none' : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, ring: cs.boxShadow.slice(0, 60) }); })()",
          returnByValue: true,
        });
        console.log(`  after ${tabs} Tab: ${f.value}`);
      }

      // --probe <selector>: print what the live DOM says about an element.
      // Reading a screenshot is guesswork when the question is "did this
      // attribute apply?"; this answers it.
      if (probe) {
        const { result: p } = await cdp.send('Runtime.evaluate', {
          expression: `(() => { const el = document.querySelector(${JSON.stringify(
            probe
          )}); if (!el) return 'no match'; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return JSON.stringify({ text: el.textContent.trim().slice(0, 30), cls: typeof el.className === 'string' ? el.className.slice(0, 90) : '', dirAttr: el.getAttribute('dir'), direction: cs.direction, outline: cs.outlineStyle === 'none' ? 'none' : cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0, 70), fg: cs.color, bg: cs.backgroundColor, z: cs.zIndex, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',') }); })()`,
          returnByValue: true,
        });
        console.log(`  probe ${probe}: ${p.value}`);
      }

      if (count) {
        const { result: c } = await cdp.send('Runtime.evaluate', {
          expression: `document.querySelectorAll(${JSON.stringify(
            count
          )}).length`,
          returnByValue: true,
        });
        console.log(`  count ${count}: ${c.value}`);
      }

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
// Reported, not failed. Some redirects are the app working as intended
// (/agents sends you to /agents/new) and some mean the shot is worthless
// (/billing bounces to /auth when billing is off, which is how three baselines
// ended up with the signup page filed under "billing"). Only a human can tell
// those apart, so say it loudly and let them judge — a check that cries wolf is
// a check people learn to scroll past, which is what let the billing shot
// survive in the first place.
if (redirects.length) {
  console.log('');
  for (const r of redirects) {
    console.log(`⚠ ${r.asked} redirected to ${r.landed} — ${r.file}.png is that page, not ${r.asked}`);
  }
}
if (bad) process.exitCode = 1;
