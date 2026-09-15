import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { bundleWorkflowCode, Worker } from '@temporalio/worker';

const root = resolve(dirname(__filename), '../../../..');

/**
 * @temporalio/worker bundles workflow code with its own webpack configuration
 * (lib/workflow/bundler.js), whose resolve.alias map contains only Temporal's
 * internal entries - it does not read tsconfig `paths`. Every workflow under
 * apps/orchestrator/src/workflows imports through @gitroom/*, so the aliases
 * have to be injected by hand or the bundle fails to resolve.
 */
export const workflowBundlerOptions = {
  webpackConfigHook: (config: Record<string, any>) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@gitroom/orchestrator': resolve(root, 'apps/orchestrator/src'),
        '@gitroom/nestjs-libraries': resolve(root, 'libraries/nestjs-libraries/src'),
        '@gitroom/helpers': resolve(root, 'libraries/helpers/src'),
      },
    },
    module: {
      ...config.module,
      rules: (config.module?.rules ?? []).map((rule: any) => {
        const loader = rule?.use?.loader ?? '';
        if (!String(loader).includes('swc-loader')) {
          return rule;
        }

        // apps/orchestrator/.swcrc carries an absolute `baseUrl` pointing at
        // the machine of whoever created it, so swc fails outright with
        // "failed to read .swcrc file" when it walks up and finds it. The
        // production build never hits this because it bundles compiled .js,
        // where this .ts rule does not apply. Ignoring .swcrc keeps the fix
        // inside the test harness rather than changing a build input.
        return {
          ...rule,
          use: { ...rule.use, options: { ...rule.use.options, swcrc: false } },
        };
      }),
    },
  }),
};

// The test-server binary defaults to the system temp directory, which CI
// cannot cache. Pinning it inside the repo makes the cache step meaningful.
export const testServerDownloadDir = resolve(root, '.cache/temporal-test-server');

export const workflowsPath = resolve(
  root,
  'apps/orchestrator/src/workflows/post-workflows/post.workflow.v1.1.2.ts'
);

export const workflowPath = (relative: string) =>
  resolve(root, 'apps/orchestrator/src/workflows', relative);

export type ActivityStubs = Record<string, (...args: any[]) => unknown>;

let environment: TestWorkflowEnvironment | undefined;

// Keyed by entrypoint: webpack is by far the slowest part of this tier, so each
// workflow file is bundled once per run however many specs reach for it.
const bundles = new Map<string, Awaited<ReturnType<typeof bundleWorkflowCode>>>();

async function bundleFor(path: string) {
  if (!bundles.has(path)) {
    bundles.set(
      path,
      await bundleWorkflowCode({ workflowsPath: path, ...workflowBundlerOptions })
    );
  }

  return bundles.get(path)!;
}

export async function startTestEnvironment(path: string = workflowsPath) {
  // The server refuses to start if the download directory does not exist.
  mkdirSync(testServerDownloadDir, { recursive: true });

  environment ??= await TestWorkflowEnvironment.createTimeSkipping({
    server: { executable: { type: 'cached-download', downloadDir: testServerDownloadDir } },
  });
  await bundleFor(path);

  return environment;
}

export async function stopTestEnvironment() {
  await environment?.teardown();
  environment = undefined;
  bundles.clear();
}

/**
 * The time-skipping server's clock, which is NOT the host's.
 *
 * The environment is shared across a spec file, and every sleep a workflow
 * performs advances this clock for every test that follows. A spec that builds
 * a future timestamp from Date.now() therefore starts producing timestamps in
 * the server's past partway through the file, which shows up as a workflow
 * taking an "already expired" branch for no visible reason.
 */
export async function testEnvironmentNow(): Promise<number> {
  if (!environment) {
    throw new Error('startTestEnvironment() must run before testEnvironmentNow()');
  }

  return environment.currentTimeMs();
}

/**
 * Run any workflow against stubbed activities on the time-skipping server.
 *
 * By default each call gets its own task queue, so specs cannot pick up each
 * other's activity stubs. `args` is passed to the workflow verbatim; a workflow that
 * proxies activities onto a queue taken from its own arguments (as the post
 * workflow does) must be given the queue this returns - see runPostWorkflow.
 *
 * Pass `taskQueue` for a workflow whose proxyActivities hardcodes one (the
 * streak and email workflows pin "main"): the single worker then polls that
 * queue for both workflow and activity tasks, exactly as production does. The
 * queue is no longer unique per run, which is safe only because this tier runs
 * serially - see the workflows project in vitest.config.mts.
 */
export async function runWorkflow<T = unknown>(options: {
  path: string;
  type: string;
  activities: ActivityStubs;
  args?: unknown[];
  buildArgs?: (taskQueue: string) => unknown[];
  taskQueue?: string;
}): Promise<T> {
  const env = await startTestEnvironment(options.path);
  const taskQueue = options.taskQueue ?? `test-${randomUUID()}`;

  const worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowBundle: await bundleFor(options.path),
    activities: options.activities,
  });

  return worker.runUntil(
    env.client.workflow.execute(options.type, {
      workflowId: `test-${randomUUID()}`,
      taskQueue,
      args: options.buildArgs?.(taskQueue) ?? options.args ?? [],
    })
  ) as Promise<T>;
}

/**
 * Run postWorkflowV112 against stubbed activities on a time-skipping server.
 *
 * The workflow builds four of its five activity proxies against the
 * `taskQueue` *argument* rather than against its own queue, so the worker and
 * the workflow argument must agree - otherwise every publishing activity waits
 * forever on a queue nobody polls. That coupling is the single easiest way to
 * write a workflow test that hangs, so it is enforced here rather than left to
 * each spec.
 */
export async function runPostWorkflow(options: {
  activities: ActivityStubs;
  args?: Record<string, unknown>;
}) {
  return runWorkflow({
    path: workflowsPath,
    type: 'postWorkflowV112',
    activities: options.activities,
    buildArgs: (taskQueue) => [
      {
        taskQueue, // must equal the worker's queue - see above
        postId: 'post-1',
        organizationId: 'org-1',
        ...options.args,
      },
    ],
  });
}
