import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import {
  ActivityFailure,
  ApplicationFailure,
  startChild,
  proxyActivities,
  sleep,
  defineSignal,
  setHandler,
} from '@temporalio/workflow';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { capitalize, sortBy } from 'lodash';
import { PostResponse } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { TimeoutFailure, TypedSearchAttributes } from '@temporalio/common';
import { postId as postIdSearchParam } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';

const proxyTaskQueue = (taskQueue: string) => {
  return proxyActivities<PostActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue,
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });
};

// postComment publishes through providers that can legitimately run long
// (media conversion + upload), so it gets a large time budget. The activity
// heartbeats for its whole duration, so a dead worker is detected within
// heartbeatTimeout instead of the full startToCloseTimeout. A false timeout
// here retries and could duplicate a comment, so it must only fire for a
// genuinely dead worker: 10 minutes absorbs event-loop lag, dropped heartbeat
// sends and GC pauses that a live-but-busy worker can hit, while still
// detecting a dead worker 3x faster than startToCloseTimeout. Only
// heartbeating activities may live behind this proxy - a non-heartbeating one
// would be killed after 10 minutes.
const proxyCommentTaskQueue = (taskQueue: string) => {
  return proxyActivities<PostActivity>({
    startToCloseTimeout: '30 minute',
    heartbeatTimeout: '10 minute',
    taskQueue,
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });
};

// checkPostStatus is a single read-only status call, so it gets a short timeout
// and fast retries - retrying it can never duplicate a post.
const proxyCheckTaskQueue = (taskQueue: string) => {
  return proxyActivities<PostActivity>({
    startToCloseTimeout: '2 minute',
    taskQueue,
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '10 seconds',
    },
  });
};

// postSocialPending / finalizePost run irreversible publishing mutations, so no
// automatic retries - a retried activity whose previous (timed-out) attempt
// still completed in the background would publish twice. The workflow retries
// deliberately, and treats timeouts as "outcome unknown".
// Both activities heartbeat for their whole duration: the long
// startToCloseTimeout covers genuinely slow uploads, while heartbeatTimeout
// bounds how long a crashed worker leaves the post in limbo. A false timeout
// marks a possibly-live post as unconfirmed, which is far worse than a slow
// failure, so 10 minutes absorbs event-loop lag, dropped heartbeat sends and
// GC pauses that a live-but-busy worker can hit, while still detecting a dead
// worker 3x faster than startToCloseTimeout.
const proxyMutationTaskQueue = (taskQueue: string) => {
  return proxyActivities<PostActivity>({
    startToCloseTimeout: '30 minute',
    heartbeatTimeout: '10 minute',
    taskQueue,
    retry: {
      maximumAttempts: 1,
    },
  });
};

const {
  getPostsList,
  getPost,
  inAppNotification,
  changeState,
  updatePost,
  sendWebhooks,
  isCommentable,
} = proxyActivities<PostActivity>({
  startToCloseTimeout: '10 minute',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

const poke = defineSignal('poke');

const iterate = Array.from({ length: 5 });

// ~30 minutes at 20s interval (longer than the old in-activity loop, timers are
// free). Multi-item flows (stories, chunked uploads) consume several checks per
// item, so the budget must cover the largest realistic post, not one poll cycle.
const maxPendingChecks = 90;

export async function postWorkflowV108({
  taskQueue,
  postId,
  organizationId,
  postNow = false,
}: {
  taskQueue: string;
  postId: string;
  organizationId: string;
  postNow?: boolean;
}) {
  // Dynamic task queue, for concurrency
  const {
    getIntegrationById,
    refreshTokenWithCause,
    internalPlugs,
    globalPlugs,
    processInternalPlug,
    processPlug,
  } = proxyTaskQueue(taskQueue);

  const { checkPostStatus } = proxyCheckTaskQueue(taskQueue);

  const { postComment } = proxyCommentTaskQueue(taskQueue);

  const { postSocialPending, finalizePost } = proxyMutationTaskQueue(taskQueue);

  let poked = false;
  setHandler(poke, () => {
    poked = true;
  });

  const startTime = new Date();
  // get all the posts and comments to post
  const firstPost = await getPost(organizationId, postId);

  // in case doesn't exists for some reason, fail it
  if (!firstPost) {
    await changeState(postId, 'ERROR', 'No Post');
    return;
  }

  if (!postNow && firstPost.state !== 'QUEUE') {
    await changeState(firstPost.id, 'ERROR', 'Already posted', [firstPost]);
    return;
  }

  // if it's a repeatable post, we should ignore this.
  if (!postNow) {
    await sleep(
      dayjs(firstPost.publishDate).isBefore(dayjs())
        ? 0
        : dayjs(firstPost.publishDate).diff(dayjs(), 'millisecond')
    );
  }

  const postsListBefore = await getPostsList(organizationId, postId);
  const [post] = postsListBefore;

  if (!post) {
    await changeState(postId, 'ERROR', 'No Post');
    return;
  }

  // if refresh is needed from last time, let's inform the user
  if (post.integration?.refreshNeeded) {
    await inAppNotification(
      post.organizationId,
      `We couldn't post to ${post.integration?.providerIdentifier} for ${post?.integration?.name}`,
      `We couldn't post to ${post.integration?.providerIdentifier} for ${post?.integration?.name} because you need to reconnect it. Please enable it and try again.`,
      true,
      false,
      'info'
    );

    await changeState(
      postsListBefore[0].id,
      'ERROR',
      'Refresh channel needed',
      postsListBefore
    );
    return;
  }

  // if it's disabled, inform the user
  if (post.integration?.disabled) {
    await inAppNotification(
      post.organizationId,
      `We couldn't post to ${post.integration?.providerIdentifier} for ${post?.integration?.name}`,
      `We couldn't post to ${post.integration?.providerIdentifier} for ${post?.integration?.name} because it's disabled. Please enable it and try again.`,
      true,
      false,
      'info'
    );

    await changeState(
      postsListBefore[0].id,
      'ERROR',
      'Channel disabled',
      postsListBefore
    );
    return;
  }

  // Do we need to post comment for this social?
  const toComment: boolean =
    postsListBefore.length === 1
      ? false
      : await isCommentable(post.integration);

  const postsList = toComment ? postsListBefore : [postsListBefore[0]];

  // list of all the saved results
  const postsResults: PostResponse[] = [];

  // Every catch block below used to repeat the same failure classification, so
  // it is centralized here: detect the failure type, refresh the token when
  // needed, and tell the caller what to do.
  // 'retry' - the token was refreshed, run the action again
  // 'stop' - the token could not be refreshed
  // 'bad-body' - the platform rejected the action
  // 'timeout' - the activity timed out, its outcome is unknown
  // 'unknown' - anything else (transient errors)
  const handleActivityError = async (
    err: unknown,
    getIntegration?: () => Promise<any>
  ): Promise<{
    type: 'retry' | 'stop' | 'bad-body' | 'timeout' | 'unknown';
    message: string;
  }> => {
    if (
      err instanceof ActivityFailure &&
      err.cause instanceof TimeoutFailure
    ) {
      return { type: 'timeout', message: '' };
    }

    const cause =
      err instanceof ActivityFailure && err.cause instanceof ApplicationFailure
        ? err.cause
        : undefined;

    if (cause?.type === 'refresh_token') {
      const refresh = await refreshTokenWithCause(
        getIntegration ? await getIntegration() : post.integration,
        cause.message || ''
      );
      if (!refresh || !refresh.accessToken) {
        return { type: 'stop', message: cause.message || '' };
      }

      if (!getIntegration) {
        post.integration.token = refresh.accessToken;
      }

      return { type: 'retry', message: cause.message || '' };
    }

    if (cause?.type === 'bad_body') {
      return { type: 'bad-body', message: cause.message || '' };
    }

    return { type: 'unknown', message: '' };
  };

  // The platform may have accepted the post but we can't confirm it was
  // published - mark the error with a distinct message so the user checks the
  // account before reposting manually and duplicating it.
  const markUnconfirmed = async (err: any) => {
    await changeState(postsList[0].id, 'ERROR', err, postsList);
    await inAppNotification(
      post.organizationId,
      `We couldn't confirm your post on ${capitalize(
        post.integration?.providerIdentifier
      )}`,
      `Your post was sent to ${capitalize(
        post.integration?.providerIdentifier
      )}, but we couldn't confirm it was published. Please check your ${
        post?.integration?.name
      } account before posting again to avoid duplicates.`,
      true,
      false,
      'fail'
    );
  };

  // The post/comment was already accepted by the platform but returned as
  // "pending": poll the read-only status check with durable timers until it
  // completes. Errors are fully handled here (never rethrown), otherwise they
  // would bubble to the posting retry loop and re-run the publish.
  const resolvePending = async (
    pending: PostResponse
  ): Promise<PostResponse | false> => {
    let pendingData = pending.pendingData;
    let errorAttempts = 0;

    for (let check = 0; check < maxPendingChecks; check++) {
      try {
        let result = await checkPostStatus(post.integration, pendingData);

        // commit the check's state BEFORE finalizePost runs: if finalize dies
        // mid-mutation, the next check must see what it had already authorized,
        // so providers can detect the interrupted attempt instead of running
        // the mutation again
        if (result.status !== 'completed') {
          pendingData = result.pendingData;
        }

        // polling is done, run the remaining provider mutations
        if (result.status === 'ready') {
          result = await finalizePost(post.integration, result.pendingData);
        }

        if (result.status === 'completed') {
          return {
            id: pending.id,
            postId: result.postId,
            releaseURL: result.releaseURL,
            status: 'success',
          };
        }

        pendingData = result.pendingData;

        // a fully successful iteration proves the platform is reachable: the
        // error budget bounds consecutive failures, not blips accumulated over
        // a long upload
        errorAttempts = 0;
      } catch (err) {
        const handle = await handleActivityError(err);

        // token refreshed, check again right away
        if (handle.type === 'retry') {
          continue;
        }

        // the token could not be refreshed while checking, but the platform
        // already accepted the post - warn about a possible live post
        if (handle.type === 'stop') {
          await markUnconfirmed(err);
          return false;
        }

        // the platform explicitly failed the post, it was not published
        if (handle.type === 'bad-body') {
          await changeState(postsList[0].id, 'ERROR', err, postsList);
          await inAppNotification(
            post.organizationId,
            `Error posting on ${post.integration?.providerIdentifier} for ${post?.integration?.name}`,
            `An error occurred while posting on ${
              post.integration?.providerIdentifier
            }${handle.message ? `: ${handle.message}` : ``}`,
            true,
            false,
            'fail'
          );
          return false;
        }

        // unknown error on a read-only check, retry a few more times
        errorAttempts++;
        if (errorAttempts >= iterate.length) {
          break;
        }
      }

      // the platform is still processing, wait before the next check
      await sleep('20 seconds');
    }

    // no verdict from the platform after all the checks
    await markUnconfirmed('Could not confirm the post status');
    return false;
  };

  // iterate over the posts
  for (let i = 0; i < postsList.length; i++) {
    const before = postsResults.length;
    // once the platform accepted the post, the catch below must never retry
    // the publish - retrying after updatePost / notification errors would
    // duplicate the post
    let posted = false;
    let updated = false;
    // this is a small trick to repeat an action in case of token refresh
    for (const _ of iterate) {
      try {
        // first post the main post
        if (i === 0) {
          postsResults.push(
            ...(await postSocialPending(post.integration as Integration, [
              postsList[i],
            ]))
          );

          // then post the comments if any
        } else {
          if (postsList[i].delay) {
            await sleep(60000 * Math.max(0, Number(postsList[i].delay ?? 0)));
          }

          postsResults.push(
            ...(await postComment(
              postsResults[0].postId,
              postsResults.length === 1
                ? undefined
                : postsResults[i - 1].postId,
              post.integration,
              [postsList[i]]
            ))
          );
        }

        posted = true;

        // the platform accepted the post but is still processing it: resolve
        // it here before marking anything, resolvePending handles its own
        // errors so a failed status check can never re-run the publish above
        if (postsResults[i].status === 'pending') {
          let resolved: PostResponse | false = false;
          try {
            resolved = await resolvePending(postsResults[i]);
          } catch (err) {
            // never let a pending-resolution error reach the outer catch, it
            // would retry the post and duplicate it. Best-effort error state,
            // otherwise the post stays in QUEUE and the missing-posts sweep
            // would re-publish it.
            try {
              await markUnconfirmed(err);
            } catch (e) {
              /**empty**/
            }
            resolved = false;
          }
          if (!resolved) {
            return false;
          }
          postsResults[i] = resolved;
        }

        // mark post as successful
        await updatePost(
          postsList[i].id,
          postsResults[i].postId,
          postsResults[i].releaseURL
        );
        updated = true;

        if (i === 0) {
          // send notification on a sucessful post
          await inAppNotification(
            post.integration.organizationId,
            `Your post has been published on ${capitalize(
              post.integration.providerIdentifier
            )}`,
            `Your post has been published on ${capitalize(
              post.integration.providerIdentifier
            )} at ${postsResults[0].releaseURL}`,
            true,
            true
          );
        }

        // break the current while to move to the next post
        break;
      } catch (err) {
        // the post is already live: never re-run the publish
        if (posted) {
          if (!updated) {
            // still marked QUEUE, record the error so the missing-posts sweep
            // doesn't re-publish it
            try {
              await markUnconfirmed(err);
            } catch (e) {
              /**empty**/
            }
            return false;
          }

          // already marked published, a failed notification shouldn't abort
          // the rest of the flow
          break;
        }

        const handle = await handleActivityError(err);

        // token refreshed, repeat the action
        if (handle.type === 'retry') {
          continue;
        }

        // the activity timed out: the platform may still complete the publish
        // in the background, so never retry it
        if (handle.type === 'timeout') {
          try {
            await markUnconfirmed(err);
          } catch (e) {
            /**empty**/
          }
          return false;
        }

        // for other errors, change state and inform the user if needed
        await changeState(postsList[0].id, 'ERROR', err, postsList);

        if (handle.type === 'stop') {
          return false;
        }

        // specific case for bad body errors
        if (handle.type === 'bad-body') {
          await inAppNotification(
            post.organizationId,
            `Error posting${i === 0 ? ' ' : ' comments '}on ${
              post.integration?.providerIdentifier
            } for ${post?.integration?.name}`,
            `An error occurred while posting${i === 0 ? ' ' : ' comments '}on ${
              post.integration?.providerIdentifier
            }${handle.message ? `: ${handle.message}` : ``}`,
            true,
            false,
            'fail'
          );
          return false;
        }
      }
    }

    if (postsResults.length === before) {
      // all retries exhausted without success
      return false;
    }
  }

  // send webhooks for the post
  await sendWebhooks(
    postsResults[0].postId,
    post.organizationId,
    post.integration.id
  );

  // load internal plugs like repost by other users
  const internalPlugsList = await internalPlugs(
    post.integration,
    JSON.parse(post.settings)
  );

  // load global plugs, like repost a post if it gets to a certain number of likes
  const globalPlugsList = (await globalPlugs(post.integration)).reduce(
    (all, current) => {
      for (let i = 1; i <= current.totalRuns; i++) {
        all.push({
          ...current,
          delay: current.delay * i,
        });
      }

      return all;
    },
    []
  );

  // Check if the post is repeatable
  const repeatPost = !post.intervalInDays
    ? []
    : [
        {
          type: 'repeat-post',
          delay:
            post.intervalInDays * 24 * 60 * 60 * 1000 -
            (new Date().getTime() - startTime.getTime()),
        },
      ];

  // Sort all the actions by delay, so we can process them in order
  const list = sortBy(
    [...internalPlugsList, ...globalPlugsList, ...repeatPost],
    'delay'
  );

  // process all the plugs in order, we are using while because in some cases we need to remove items from the list
  while (list.length > 0) {
    // get the next to process
    const todo = list.shift();

    // wait for the delay
    await sleep(Math.max(0, Number(todo.delay ?? 0)));

    // process internal plug
    if (todo.type === 'internal-plug') {
      for (const _ of iterate) {
        try {
          await processInternalPlug({ ...todo, post: postsResults[0].postId });
        } catch (err) {
          const handle = await handleActivityError(err, () =>
            getIntegrationById(organizationId, todo.integration)
          );

          if (handle.type === 'stop' || handle.type === 'bad-body') {
            break;
          }

          continue;
        }
        break;
      }
    }

    // process global plug
    if (todo.type === 'global') {
      for (const _ of iterate) {
        try {
          const process = await processPlug({
            ...todo,
            postId: postsResults[0].postId,
          });
          if (process) {
            const toDelete = list
              .reduce((all, current, index) => {
                if (current.plugId === todo.plugId) {
                  all.push(index);
                }

                return all;
              }, [])
              .reverse();

            for (const index of toDelete) {
              list.splice(index, 1);
            }
          }
        } catch (err) {
          const handle = await handleActivityError(err);

          if (handle.type === 'stop' || handle.type === 'bad-body') {
            break;
          }

          continue;
        }

        break;
      }
    }

    // process repeat post in a new workflow, this is important so the other plugs can keep running
    if (todo.type === 'repeat-post') {
      await startChild(postWorkflowV108, {
        parentClosePolicy: 'ABANDON',
        args: [
          {
            taskQueue,
            postId,
            organizationId,
            postNow: true,
          },
        ],
        workflowId: `post_${post.id}_${makeId(10)}`,
        typedSearchAttributes: new TypedSearchAttributes([
          {
            key: postIdSearchParam,
            value: postId,
          },
        ]),
      });
    }
  }
}
