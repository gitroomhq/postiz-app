import { __awaiter } from "tslib";
import { ActivityFailure, ApplicationFailure, startChild, proxyActivities, sleep, defineSignal, setHandler, } from '@temporalio/workflow';
import dayjs from 'dayjs';
import { capitalize, sortBy } from 'lodash';
import { makeId } from "../../../../../libraries/nestjs-libraries/src/services/make.is";
import { TypedSearchAttributes } from '@temporalio/common';
import { postId as postIdSearchParam } from "../../../../../libraries/nestjs-libraries/src/temporal/temporal.search.attribute";
const proxyTaskQueue = (taskQueue) => {
    return proxyActivities({
        startToCloseTimeout: '10 minute',
        taskQueue,
        retry: {
            maximumAttempts: 3,
            backoffCoefficient: 1,
            initialInterval: '2 minutes',
        },
    });
};
const { getPostsList, inAppNotification, changeState, updatePost, sendWebhooks, isCommentable, } = proxyActivities({
    startToCloseTimeout: '10 minute',
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 1,
        initialInterval: '2 minutes',
    },
});
const poke = defineSignal('poke');
const iterate = Array.from({ length: 5 });
export function postWorkflowV101(_a) {
    return __awaiter(this, arguments, void 0, function* ({ taskQueue, postId, organizationId, postNow = false, }) {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        // Dynamic task queue, for concurrency
        const { postSocial, postComment, getIntegrationById, refreshToken, internalPlugs, globalPlugs, processInternalPlug, processPlug, } = proxyTaskQueue(taskQueue);
        let poked = false;
        setHandler(poke, () => {
            poked = true;
        });
        const startTime = new Date();
        // get all the posts and comments to post
        const postsListBefore = yield getPostsList(organizationId, postId);
        const [post] = postsListBefore;
        // in case doesn't exists for some reason, fail it
        if (!post || (!postNow && post.state !== 'QUEUE')) {
            return;
        }
        // if it's a repeatable post, we should ignore this.
        if (!postNow) {
            yield sleep(dayjs(post.publishDate).isBefore(dayjs())
                ? 0
                : dayjs(post.publishDate).diff(dayjs(), 'millisecond'));
        }
        // if refresh is needed from last time, let's inform the user
        if ((_b = post.integration) === null || _b === void 0 ? void 0 : _b.refreshNeeded) {
            yield inAppNotification(post.organizationId, `We couldn't post to ${(_c = post.integration) === null || _c === void 0 ? void 0 : _c.providerIdentifier} for ${(_d = post === null || post === void 0 ? void 0 : post.integration) === null || _d === void 0 ? void 0 : _d.name}`, `We couldn't post to ${(_e = post.integration) === null || _e === void 0 ? void 0 : _e.providerIdentifier} for ${(_f = post === null || post === void 0 ? void 0 : post.integration) === null || _f === void 0 ? void 0 : _f.name} because you need to reconnect it. Please enable it and try again.`, true, false, 'info');
            return;
        }
        // if it's disabled, inform the user
        if ((_g = post.integration) === null || _g === void 0 ? void 0 : _g.disabled) {
            yield inAppNotification(post.organizationId, `We couldn't post to ${(_h = post.integration) === null || _h === void 0 ? void 0 : _h.providerIdentifier} for ${(_j = post === null || post === void 0 ? void 0 : post.integration) === null || _j === void 0 ? void 0 : _j.name}`, `We couldn't post to ${(_k = post.integration) === null || _k === void 0 ? void 0 : _k.providerIdentifier} for ${(_l = post === null || post === void 0 ? void 0 : post.integration) === null || _l === void 0 ? void 0 : _l.name} because it's disabled. Please enable it and try again.`, true, false, 'info');
            return;
        }
        // Do we need to post comment for this social?
        const toComment = postsListBefore.length === 1
            ? false
            : yield isCommentable(post.integration);
        const postsList = toComment ? postsListBefore : [postsListBefore[0]];
        // list of all the saved results
        const postsResults = [];
        // iterate over the posts
        for (let i = 0; i < postsList.length; i++) {
            const before = postsResults.length;
            // this is a small trick to repeat an action in case of token refresh
            for (const _ of iterate) {
                try {
                    // first post the main post
                    if (i === 0) {
                        postsResults.push(...(yield postSocial(post.integration, [
                            postsList[i],
                        ])));
                        // then post the comments if any
                    }
                    else {
                        if (postsList[i].delay) {
                            yield sleep(60000 * Math.max(0, Number((_m = postsList[i].delay) !== null && _m !== void 0 ? _m : 0)));
                        }
                        postsResults.push(...(yield postComment(postsResults[0].postId, postsResults.length === 1
                            ? undefined
                            : postsResults[i - 1].postId, post.integration, [postsList[i]])));
                    }
                    // mark post as successful
                    yield updatePost(postsList[i].id, postsResults[i].postId, postsResults[i].releaseURL);
                    if (i === 0) {
                        // send notification on a sucessful post
                        yield inAppNotification(post.integration.organizationId, `Your post has been published on ${capitalize(post.integration.providerIdentifier)}`, `Your post has been published on ${capitalize(post.integration.providerIdentifier)} at ${postsResults[0].releaseURL}`, true, true);
                    }
                    // break the current while to move to the next post
                    break;
                }
                catch (err) {
                    // if token refresh is needed, do it and repeat
                    if (err instanceof ActivityFailure &&
                        err.cause instanceof ApplicationFailure &&
                        err.cause.type === 'refresh_token') {
                        const refresh = yield refreshToken(post.integration);
                        if (!refresh || !refresh.accessToken) {
                            yield changeState(postsList[0].id, 'ERROR', err, postsList);
                            return false;
                        }
                        post.integration.token = refresh.accessToken;
                        continue;
                    }
                    // for other errors, change state and inform the user if needed
                    yield changeState(postsList[0].id, 'ERROR', err, postsList);
                    // specific case for bad body errors
                    if (err instanceof ActivityFailure &&
                        err.cause instanceof ApplicationFailure &&
                        err.cause.type === 'bad_body') {
                        yield inAppNotification(post.organizationId, `Error posting${i === 0 ? ' ' : ' comments '}on ${(_o = post.integration) === null || _o === void 0 ? void 0 : _o.providerIdentifier} for ${(_p = post === null || post === void 0 ? void 0 : post.integration) === null || _p === void 0 ? void 0 : _p.name}`, `An error occurred while posting${i === 0 ? ' ' : ' comments '}on ${(_q = post.integration) === null || _q === void 0 ? void 0 : _q.providerIdentifier}${((_r = err === null || err === void 0 ? void 0 : err.cause) === null || _r === void 0 ? void 0 : _r.message) ? `: ${(_s = err === null || err === void 0 ? void 0 : err.cause) === null || _s === void 0 ? void 0 : _s.message}` : ``}`, true, false, 'fail');
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
        yield sendWebhooks(postsResults[0].postId, post.organizationId, post.integration.id);
        // load internal plugs like repost by other users
        const internalPlugsList = yield internalPlugs(post.integration, JSON.parse(post.settings));
        // load global plugs, like repost a post if it gets to a certain number of likes
        const globalPlugsList = (yield globalPlugs(post.integration)).reduce((all, current) => {
            for (let i = 1; i <= current.totalRuns; i++) {
                all.push(Object.assign(Object.assign({}, current), { delay: current.delay * i }));
            }
            return all;
        }, []);
        // Check if the post is repeatable
        const repeatPost = !post.intervalInDays
            ? []
            : [
                {
                    type: 'repeat-post',
                    delay: post.intervalInDays * 24 * 60 * 60 * 1000 -
                        (new Date().getTime() - startTime.getTime()),
                },
            ];
        // Sort all the actions by delay, so we can process them in order
        const list = sortBy([...internalPlugsList, ...globalPlugsList, ...repeatPost], 'delay');
        // process all the plugs in order, we are using while because in some cases we need to remove items from the list
        while (list.length > 0) {
            // get the next to process
            const todo = list.shift();
            // wait for the delay
            yield sleep(Math.max(0, Number((_t = todo.delay) !== null && _t !== void 0 ? _t : 0)));
            // process internal plug
            if (todo.type === 'internal-plug') {
                for (const _ of iterate) {
                    try {
                        yield processInternalPlug(Object.assign(Object.assign({}, todo), { post: postsResults[0].postId }));
                    }
                    catch (err) {
                        if (err instanceof ActivityFailure &&
                            err.cause instanceof ApplicationFailure &&
                            err.cause.type === 'refresh_token') {
                            const refresh = yield refreshToken(yield getIntegrationById(organizationId, todo.integration));
                            if (!refresh || !refresh.accessToken) {
                                break;
                            }
                            continue;
                        }
                        if (err instanceof ActivityFailure &&
                            err.cause instanceof ApplicationFailure &&
                            err.cause.type === 'bad_body') {
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
                        const process = yield processPlug(Object.assign(Object.assign({}, todo), { postId: postsResults[0].postId }));
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
                    }
                    catch (err) {
                        if (err instanceof ActivityFailure &&
                            err.cause instanceof ApplicationFailure &&
                            err.cause.type === 'refresh_token') {
                            const refresh = yield refreshToken(post.integration);
                            if (!refresh || !refresh.accessToken) {
                                break;
                            }
                            continue;
                        }
                        if (err instanceof ActivityFailure &&
                            err.cause instanceof ApplicationFailure &&
                            err.cause.type === 'bad_body') {
                            break;
                        }
                        continue;
                    }
                    break;
                }
            }
            // process repeat post in a new workflow, this is important so the other plugs can keep running
            if (todo.type === 'repeat-post') {
                yield startChild(postWorkflowV101, {
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
    });
}
//# sourceMappingURL=post.workflow.v1.0.1.js.map