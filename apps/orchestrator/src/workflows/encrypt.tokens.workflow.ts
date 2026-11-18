import { continueAsNew, proxyActivities } from '@temporalio/workflow';
import { IntegrationsActivity } from '@gitroom/orchestrator/activities/integrations.activity';

const { encryptStoredTokens } = proxyActivities<IntegrationsActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

// Started by hand (Temporal UI or CLI, task queue "main") after the encryption
// was set: new tokens are already stored encrypted, this encrypts the ones
// that were stored before. Only ids and counters go through the workflow,
// never a token. The result is how many channels were encrypted, and how many
// could not be (see the logs).
export async function encryptTokensWorkflow({
  lastId,
  changed = 0,
  failed = 0,
}: {
  lastId?: string;
  changed?: number;
  failed?: number;
} = {}) {
  for (let page = 0; page < 100; page++) {
    const result = await encryptStoredTokens(lastId);
    changed += result.changed;
    failed += result.failed;
    if (!result.lastId) {
      return { changed, failed };
    }

    lastId = result.lastId;
  }

  // Keep the history small
  return await continueAsNew<typeof encryptTokensWorkflow>({
    lastId,
    changed,
    failed,
  });
}
