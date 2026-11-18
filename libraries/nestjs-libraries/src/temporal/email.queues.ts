// Resend allows 10 requests per second for the whole team (ratelimit-limit
// header). The limits are enforced by the Temporal server across every worker
// polling the queue. The server splits a queue's rate over its 4 partitions,
// so after an idle period a burst can briefly go above the rate. 5/s together
// keeps that burst small, sends rejected by Resend are retried by
// sendEmailSync, and the rest is left for the auth emails sent directly.
export const emailQueues = {
  // Notifications, billing, invites ('top')
  priority: { taskQueue: 'email', perSecond: 3 },
  // Digests and streak emails ('bottom')
  bulk: { taskQueue: 'email-bulk', perSecond: 2 },
};
