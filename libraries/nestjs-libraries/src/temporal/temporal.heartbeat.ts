import { Context } from '@temporalio/activity';

// Heartbeats are throttled by the SDK to ~80% of the workflow's
// heartbeatTimeout, so a short interval here only controls liveness
// granularity, not server traffic. Outside an activity context (or under
// workflow versions that set no heartbeatTimeout) heartbeating is a no-op.
const HEARTBEAT_INTERVAL = 15_000;

export const withHeartbeat = async <T>(fn: () => Promise<T>): Promise<T> => {
  const interval = setInterval(() => {
    try {
      Context.current().heartbeat();
    } catch (err) {
      /**empty**/
    }
  }, HEARTBEAT_INTERVAL);

  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
};
