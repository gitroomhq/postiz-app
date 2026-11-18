import {
  continueAsNew,
  makeContinueAsNewFunc,
  patched,
  proxyActivities,
  sleep,
} from '@temporalio/workflow';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';

const { sendEmailAsync, getUserOrgs, setStreak, getLastPublishDate } =
  proxyActivities<EmailActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    cancellationType: 'ABANDON',
  });

const DAY = 86400000;

export async function streakWorkflow({
  organizationId,
}: {
  organizationId: string;
}) {
  await setStreak(organizationId, 'start');
  await sleep(79200000);
  const userOrgs = await getUserOrgs(organizationId);

  if (!patched('reminder')) {
    for (const user of userOrgs.users) {
      if (!user.user.sendStreakEmails) {
        continue;
      }
      await sendEmailAsync(
        user.user.email,
        'Streak Reminder',
        '<p>You are about to lose your streak in two hours! schedule a post now to keep it!</p>',
        'bottom'
      );
    }
  }

  await sleep(7200000);

  // Posts no longer restart this workflow, hand the streak over to
  // streakWorkflowV2 if the organization posted since it started
  if (patched('streak-last-post')) {
    const lastPost = await getLastPublishDate(organizationId);
    if (lastPost && lastPost + DAY > Date.now()) {
      return await makeContinueAsNewFunc<typeof streakWorkflowV2>({
        workflowType: 'streakWorkflowV2',
      })({ organizationId, lastPost });
    }
  }

  if (patched('reminder')) {
    for (const user of userOrgs.users) {
      if (!user.user.sendStreakEmails) {
        continue;
      }
      await sendEmailAsync(
        user.user.email,
        'Streak Ended',
        '<p>Your streak has ended! You didn\'t post anything in the last 24 hours. Schedule a post now to start a new streak!</p>',
        'bottom'
      );
    }
  }
  await setStreak(organizationId, 'end');
}

// One run per organization that posts don't restart: it wakes up when the
// last post is a day old and ends the streak if nothing newer was published
export async function streakWorkflowV2({
  organizationId,
  lastPost,
}: {
  organizationId: string;
  lastPost?: number;
}) {
  if (lastPost === undefined) {
    // Started by a publish
    await setStreak(organizationId, 'start');
    lastPost = Date.now();
  }

  for (let check = 0; check < 30; check++) {
    await sleep(Math.max(1000, lastPost + DAY - Date.now()));
    lastPost = Math.max(
      lastPost,
      (await getLastPublishDate(organizationId)) || 0
    );

    if (lastPost + DAY > Date.now()) {
      continue;
    }

    const userOrgs = await getUserOrgs(organizationId);
    for (const user of userOrgs.users) {
      if (!user.user.sendStreakEmails) {
        continue;
      }
      await sendEmailAsync(
        user.user.email,
        'Streak Ended',
        "<p>Your streak has ended! You didn't post anything in the last 24 hours. Schedule a post now to start a new streak!</p>",
        'bottom'
      );
    }
    await setStreak(organizationId, 'end');
    return;
  }

  // Keep the history small for organizations that post every day
  return await continueAsNew<typeof streakWorkflowV2>({
    organizationId,
    lastPost,
  });
}
