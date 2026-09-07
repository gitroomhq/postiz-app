#!/usr/bin/env node
/**
 * Manage the single ReportPortal launch shared by every test tier.
 *
 *   node tools/reportportal/launch.mjs start   -> prints the launch UUID
 *   node tools/reportportal/launch.mjs finish  -> closes RP_LAUNCH_ID
 *
 * Always exits 0. ReportPortal being unreachable must never fail CI - the
 * JUnit artifacts are the fallback record of the run.
 */
import RPClient from '@reportportal/client-javascript';

const {
  RP_ENABLE,
  RP_ENDPOINT,
  RP_PROJECT,
  RP_API_KEY,
  RP_LAUNCH = 'postiz-app',
  RP_LAUNCH_ID,
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

const client = new RPClient(
  {
    apiKey: RP_API_KEY,
    endpoint: RP_ENDPOINT,
    project: RP_PROJECT,
    launch: RP_LAUNCH,
    restClientConfig: { timeout: 15000 },
  },
  { name: 'postiz-ci', version: '1.0.0' }
);

const attribute = (key, value) => (value ? [{ key, value }] : []);

try {
  if (process.argv[2] === 'start') {
    const { tempId, promise } = client.startLaunch({
      name: RP_LAUNCH,
      startTime: client.helpers.now(),
      description: [
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

    await promise;
    // Each tier joins this launch by passing it as RP_LAUNCH_ID, which makes
    // the agents report into it without finishing it.
    console.log(client.map[tempId].realId);
  } else if (process.argv[2] === 'finish') {
    if (!RP_LAUNCH_ID) {
      console.warn('[reportportal] no RP_LAUNCH_ID; nothing to finish.');
      process.exit(0);
    }

    await client.finishLaunch(RP_LAUNCH_ID, { endTime: client.helpers.now() }).promise;
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
