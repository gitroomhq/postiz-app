import {
  continueAsNew,
  log,
  proxyActivities,
  sleep,
} from '@temporalio/workflow';
import { PostMetricsActivity } from '@gitroom/orchestrator/activities/post-metrics.activity';

const { listPostMetricIntegrations, syncPostMetricsForIntegration } =
  proxyActivities<PostMetricsActivity>({
    startToCloseTimeout: '10 minute',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });

const RUNS_BEFORE_RESET = 24 * 7;

export async function analyticsSyncWorkflowV1() {
  for (let run = 0; run < RUNS_BEFORE_RESET; run++) {
    try {
      const targets = await listPostMetricIntegrations();
      for (const target of targets) {
        try {
          await syncPostMetricsForIntegration(
            target.organizationId,
            target.integrationId
          );
        } catch (err) {
          log.warn('Analytics integration sync failed', {
            organizationId: target.organizationId,
            integrationId: target.integrationId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      log.error('Could not list analytics sync targets', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep('1 hour');
  }

  return await continueAsNew();
}

export async function analyticsSyncOrgWorkflowV1({
  organizationId,
}: {
  organizationId: string;
}) {
  const targets = await listPostMetricIntegrations(organizationId);
  for (const target of targets) {
    try {
      await syncPostMetricsForIntegration(
        target.organizationId,
        target.integrationId
      );
    } catch (err) {
      log.warn('Organization analytics integration sync failed', {
        organizationId: target.organizationId,
        integrationId: target.integrationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
