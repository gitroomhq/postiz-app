#!/usr/bin/env node
/**
 * Manage the single ReportPortal launch shared by every test tier.
 *
 *   node tools/reportportal/launch.mjs start   -> prints the launch UUID
 *   node tools/reportportal/launch.mjs finish  -> closes RP_LAUNCH_ID
 *
 * Uses plain fetch rather than @reportportal/client-javascript so the CI job
 * that opens the launch needs no dependency install at all. The two calls
 * mirror what the client does: POST <endpoint>/<project>/launch and
 * PUT <endpoint>/<project>/launch/<uuid>/finish, with epoch-millisecond times
 * and a Bearer token.
 *
 * Always exits 0. ReportPortal being unreachable must never fail CI - the
 * JUnit artifacts are the fallback record of the run.
 */
const {
  RP_ENABLE,
  RP_ENDPOINT,
  RP_PROJECT,
  RP_API_KEY,
  RP_LAUNCH = 'postiz-app',
  RP_LAUNCH_ID,
  RP_DESCRIPTION,
  RP_MODE,
  GITHUB_REF_NAME,
  GITHUB_SHA,
  GITHUB_RUN_ID,
  GITHUB_ACTIONS,
  GITHUB_REPOSITORY,
} = process.env;

if (RP_ENABLE !== 'true' || !RP_ENDPOINT || !RP_PROJECT || !RP_API_KEY) {
  console.warn('[reportportal] disabled or not configured; skipping.');
  process.exit(0);
}

const base = `${RP_ENDPOINT.replace(/\/+$/, '')}/${RP_PROJECT}`;
const attribute = (key, value) => (value ? [{ key, value }] : []);

async function send(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  }

  return text ? JSON.parse(text) : {};
}

try {
  const command = process.argv[2];

  if (command === 'start') {
    const { id } = await send('POST', '/launch', {
      name: RP_LAUNCH,
      startTime: Date.now(),
      mode: RP_MODE === 'DEBUG' ? 'DEBUG' : 'DEFAULT',
      description:
        RP_DESCRIPTION ||
        [
          `Branch \`${GITHUB_REF_NAME ?? 'local'}\` @ \`${(GITHUB_SHA ?? 'dev').slice(0, 8)}\``,
          GITHUB_RUN_ID && GITHUB_REPOSITORY
            ? `[GitHub Actions run](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})`
            : '',
        ]
          .filter(Boolean)
          .join(' - '),
      attributes: [
        ...attribute('ci', GITHUB_ACTIONS ? 'github' : 'local'),
        ...attribute('branch', GITHUB_REF_NAME),
        ...attribute('sha', GITHUB_SHA?.slice(0, 8)),
        ...attribute('run', GITHUB_RUN_ID),
      ],
    });

    if (!id) {
      throw new Error('launch created but no id was returned');
    }

    // Each tier joins this launch by passing it as RP_LAUNCH_ID, which makes
    // the agents report into it without finishing it.
    console.log(id);
  } else if (command === 'finish') {
    if (!RP_LAUNCH_ID) {
      console.warn('[reportportal] no RP_LAUNCH_ID; nothing to finish.');
      process.exit(0);
    }

    await send('PUT', `/launch/${RP_LAUNCH_ID}/finish`, { endTime: Date.now() });
    console.warn(`[reportportal] finished launch ${RP_LAUNCH_ID}`);
  } else {
    console.warn('[reportportal] usage: launch.mjs start|finish');
  }
} catch (error) {
  console.warn(
    '[reportportal] launch operation failed, ignoring:',
    error?.message ?? error
  );
}

process.exit(0);
