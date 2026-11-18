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
import { emailQueues } from '@gitroom/nestjs-libraries/temporal/email.queues';

const { sendEmail } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
});

const { sendEmail: sendPriorityEmail } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: emailQueues.priority.taskQueue,
  cancellationType: 'ABANDON',
});

const { sendEmail: sendBulkEmail } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: emailQueues.bulk.taskQueue,
  cancellationType: 'ABANDON',
});

// One workflow per email, the Resend rate limit is enforced on the email task queues
export async function sendSingleEmailWorkflow(email: SendEmail) {
  const send = email.addTo === 'top' ? sendPriorityEmail : sendBulkEmail;
  await send(email.to, email.subject, email.html, email.replyTo);
}

const RATE_LIMIT_MS = 700;

// Deprecated: no longer started, kept registered so the running `send_email` can drain its queue
export async function sendEmailWorkflow({
  queue = [],
}: {
  queue: SendEmail[];
}) {
  let processedThisRun = 0;
  // Handle incoming email signals
  setHandler(sendEmailSignal, (addEmail: SendEmail) => {
    if (addEmail.to && addEmail.subject) {
      if (addEmail.addTo === 'top') {
        queue.unshift(addEmail);
      } else {
        queue.push(addEmail);
      }
    }
  });

  // Process emails with rate limiting
  while (true) {
    // Wait until there's an email in the queue or timeout after 1 hour of inactivity
    await condition(() => queue.length > 0);

    try {
      const email = queue.shift()!;
      if (!email) {
        continue;
      }
      await sendEmail(email.to, email.subject, email.html, email.replyTo);
      processedThisRun++;
    } catch (err) {
      console.log(err);
    }

    await sleep(RATE_LIMIT_MS);

    if (processedThisRun >= 30) {
      return await continueAsNew({ queue });
    }
  }
}
