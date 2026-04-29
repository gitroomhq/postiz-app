import { condition, proxyActivities, setHandler } from '@temporalio/workflow';
import { RepostActivity } from '@gitroom/orchestrator/activities/repost.activity';
import { pokeRepostSignal } from '@gitroom/orchestrator/signals/repost.signal';

const { runRepostCycle } = proxyActivities<RepostActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function repostWorkflow({ ruleId }: { ruleId: string }) {
  let poked = false;
  setHandler(pokeRepostSignal, () => {
    poked = true;
  });

  while (true) {
    const result = await runRepostCycle(ruleId);
    if (result.ruleDisabled) {
      return;
    }
    const intervalMs = Math.max(result.intervalMinutes || 15, 5) * 60_000;
    poked = false;
    await condition(() => poked, intervalMs);
  }
}
