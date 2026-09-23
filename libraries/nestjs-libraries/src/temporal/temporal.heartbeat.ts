import { Context } from '@temporalio/activity';

// Heartbeats are throttled by the SDK (min of ~80% of the workflow's
// heartbeatTimeout and the worker's maxHeartbeatThrottleInterval, set to 15s
// in temporal.module.ts), so a short interval here only controls liveness
// granularity, not server traffic. Outside an activity context (or under
// workflow versions that set no heartbeatTimeout) heartbeating is a no-op.
const HEARTBEAT_INTERVAL = 15_000;

// Heartbeat *details* are the only channel that survives a StartToClose
// timeout: the server keeps the last details in the activity's mutable state,
// shows them under Pending Activities while it is still running, and copies
// them into the timeout failure - which we already persist into Errors. An
// activity that dies at startToCloseTimeout logs nothing at all today, so this
// is what tells us afterwards which call it was waiting on. Recording details
// needs no heartbeatTimeout, so nothing here can time an activity out.
//
// The value hangs off the per-activity Context instance rather than a module
// or provider field: providers are singletons shared by every activity running
// on the worker, so anything instance-scoped would report another post's URL.
const DETAILS = Symbol.for('postiz.heartbeatDetails');

const readDetails = (ctx: any) => ctx[DETAILS];

// Records what this activity is about to wait on. Deliberately does NOT
// heartbeat: the sending is left to the interval below, which already runs.
// Most publishes finish well inside HEARTBEAT_INTERVAL and send no heartbeat
// at all today, so heartbeating here would add an RPC per activity - a burst
// of them at the publish spike, against a server that is already slow there.
// Nothing is lost: the details only have to reach the server before a
// startToCloseTimeout 30 minutes away, and an activity that finishes before
// the first tick is by definition not the one that hung.
//
// Safe to call from code that also runs outside an activity (API requests,
// analytics), where there is no context and this does nothing.
export const setHeartbeatDetails = (details: string) => {
  try {
    const ctx = Context.current() as any;
    ctx[DETAILS] = details;
  } catch (err) {
    /**empty - not inside an activity**/
  }
};

export const withHeartbeat = async <T>(fn: () => Promise<T>): Promise<T> => {
  // Mark the activity as entered before anything can block. If a timed-out
  // activity carries no details at all, it never got this far - meaning the
  // task was dispatched to the worker and the function was never invoked,
  // which is a different failure from stalling on an outbound call.
  try {
    const ctx = Context.current() as any;
    setHeartbeatDetails(`${ctx.info?.activityType || 'activity'}: entered`);
  } catch (err) {
    /**empty**/
  }

  // Heartbeating must never fail the activity, but a heartbeat that silently
  // never fires would surface only as an unexplained heartbeat timeout - log
  // the first failure (once, not every 15s) so a broken context is visible.
  let logged = false;
  const interval = setInterval(() => {
    try {
      const ctx = Context.current() as any;
      // resend the last details, otherwise this keepalive would blank out the
      // URL that setHeartbeatDetails recorded
      ctx.heartbeat(readDetails(ctx));
    } catch (err) {
      if (!logged) {
        logged = true;
        console.error('withHeartbeat: heartbeat failed', err);
      }
    }
  }, HEARTBEAT_INTERVAL);

  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
};
