import { Context } from '@temporalio/activity';

// Heartbeats are throttled by the SDK (min of ~80% of the workflow's
// heartbeatTimeout and the worker's maxHeartbeatThrottleInterval, set to 15s
// in temporal.module.ts), so a short interval here only controls liveness
// granularity, not server traffic. Outside an activity context (or under
// workflow versions that set no heartbeatTimeout) heartbeating is a no-op.
const HEARTBEAT_INTERVAL = 15_000;

export const withHeartbeat = async <T>(fn: () => Promise<T>): Promise<T> => {
  // Heartbeating must never fail the activity, but a heartbeat that silently
  // never fires would surface only as an unexplained heartbeat timeout - log
  // the first failure (once, not every 15s) so a broken context is visible.
  let logged = false;
  const interval = setInterval(() => {
    try {
      Context.current().heartbeat();
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
