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
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

// Rate limit: 2 requests per second = 500ms between requests
const RATE_LIMIT_MS = 500;

export async function sendEmailWorkflow({
  queue = [],
}: {
  queue: SendEmail[];
}) {
  let processedThisRun = 0;
  // Handle incoming email signals
  setHandler(sendEmailSignal, (email: SendEmail) => {
    queue.push(email);
  });

  // Process emails with rate limiting
  while (true) {
    // Wait until there's an email in the queue or timeout after 1 hour of inactivity
    const waitForQueue = await condition(() => queue.length > 0, '1 hour');
    if (!waitForQueue) {
      break;
    }

    try {
      const email = queue.shift()!;

      await sendEmail(email.to, email.subject, email.html, email.replyTo);
      processedThisRun++;
    } catch (err) {}

    await sleep(RATE_LIMIT_MS);

    if (processedThisRun >= 100) {
      return await continueAsNew({ queue });
    }
  }
}
