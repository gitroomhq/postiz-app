import {
  condition,
  continueAsNew,
  proxyActivities,
  setHandler,
  sleep,
} from '@temporalio/workflow';
import { Email, emailSignal } from '@gitroom/orchestrator/signals/email.signal';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';

const { getUserOrgs, sendEmailAsync } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function digestEmailWorkflow({
  organizationId,
  queue = [],
}: {
  organizationId: string;
  queue?: Email[];
}) {
  setHandler(emailSignal, (data) => {
    queue.push(...data);
  });

  while (true) {
    await condition(() => queue.length > 0);
    await sleep(3600000);

    // Take a snapshot batch and immediately clear queue.
    const batch = queue.splice(0, queue.length);
    queue = [];

    const org = await getUserOrgs(organizationId);

    for (const user of org.users) {
      const allowFailure = user.user.sendFailureEmails ? 'fail' : null;
      const allowSuccess = user.user.sendSuccessEmails ? 'success' : null;

      const toSend = batch.filter(
        (email) =>
          email.type === allowFailure ||
          email.type === allowSuccess ||
          email.type === 'info'
      );

      if (toSend.length === 0) continue;

      await sendEmailAsync(
        user.user.email,
        toSend.length === 1
          ? toSend[0].title
          : `[Postiz] Your latest notifications`,
        toSend.map((p) => p.message).join('<br/>'),
        'bottom'
      );
    }

    return await continueAsNew({
      organizationId,
      queue,
    });
  }
}
