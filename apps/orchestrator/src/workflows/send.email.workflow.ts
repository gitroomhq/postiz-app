import {
  proxyActivities,
  setHandler,
  condition,
  sleep,
  continueAsNew,
} from '@temporalio/workflow';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';
import {
  SendEmail,
  sendEmailSignal,
} from '@gitroom/orchestrator/signals/send.email.signal';

const { sendEmail } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
});

const RATE_LIMIT_MS = 700;

export async function sendEmailWorkflow({
  queue = [],
}: {
  queue: SendEmail[];
}) {
  let processedThisRun = 0;
  // Handle incoming email signals
  setHandler(sendEmailSignal, (addEmail: SendEmail) => {
    if (addEmail.to && addEmail.subject) {
      queue.push(addEmail);
    }
  });

  // Process emails with rate limiting
  while (true) {
    // Wait until there's an email in the queue or timeout after 1 hour of inactivity
    const waitForQueue = await condition(() => queue.length > 0, '1 hour');
    if (!waitForQueue) {
      return;
    }

    try {
      const email = queue.shift()!;
      if (!email) {
        continue;
      }
      await sendEmail(email.to, email.subject, email.html, email.replyTo);
      processedThisRun++;
    } catch (err) {}

    await sleep(RATE_LIMIT_MS);

    if (processedThisRun >= 100) {
      return await continueAsNew({ queue });
    }
  }
}
