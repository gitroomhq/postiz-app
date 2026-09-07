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

export const workflowsPath = resolve(
  root,
  'apps/orchestrator/src/workflows/post-workflows/post.workflow.v1.1.2.ts'
);

export type ActivityStubs = Record<string, (...args: any[]) => unknown>;

let environment: TestWorkflowEnvironment | undefined;
let bundle: Awaited<ReturnType<typeof bundleWorkflowCode>> | undefined;

export async function startTestEnvironment() {
  environment ??= await TestWorkflowEnvironment.createTimeSkipping();
  // Bundled once per run rather than once per Worker.create: webpack is by far
  // the slowest part of this tier.
  bundle ??= await bundleWorkflowCode({
    workflowsPath,
    ...workflowBundlerOptions,
  });

  return environment;
}

export async function stopTestEnvironment() {
  await environment?.teardown();
  environment = undefined;
  bundle = undefined;
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
  const env = await startTestEnvironment();
  const taskQueue = `test-${randomUUID()}`;

  const worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowBundle: bundle,
    activities: options.activities,
  });

  return worker.runUntil(
    env.client.workflow.execute('postWorkflowV112', {
      workflowId: `test-${randomUUID()}`,
      taskQueue,
      args: [
        {
          taskQueue, // must equal the worker's queue - see above
          postId: 'post-1',
          organizationId: 'org-1',
          ...options.args,
        },
      ],
    })
  );
}
