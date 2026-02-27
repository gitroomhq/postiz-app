const reminder = jest.fn(async () => undefined);
const expire = jest.fn(async () => undefined);
let resolvedHandler: ((payload: {
  status: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
}) => void) | null = null;
let autoResolve = false;

jest.mock('@temporalio/workflow', () => ({
  proxyActivities: jest.fn(() => ({
    sendExternalReviewReminder: reminder,
    expireExternalReview: expire,
  })),
  sleep: jest.fn(async () => undefined),
  condition: jest.fn(async (fn: () => boolean) => {
    if (fn()) return;
    await new Promise(() => undefined);
  }),
  setHandler: jest.fn((_signal: any, handler: any) => {
    resolvedHandler = handler;
    if (autoResolve) {
      handler({ status: 'APPROVED' });
    }
  }),
}));

jest.mock('@gitroom/orchestrator/signals/external.review.signal', () => ({
  externalReviewResolvedSignal: 'externalReviewResolved',
}));

import { externalReviewWorkflow } from './external.review.workflow';

describe('externalReviewWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolvedHandler = null;
    autoResolve = false;
  });

  it('sends reminder then expires when not resolved', async () => {
    await externalReviewWorkflow({
      token: 't1',
      reminderDelayMs: 0,
      expiryDelayMs: 0,
    });

    expect(reminder).toHaveBeenCalledWith('t1');
    expect(expire).toHaveBeenCalledWith('t1');
  });

  it('skips reminder/expiry when resolved signal arrives first', async () => {
    autoResolve = true;
    await externalReviewWorkflow({
      token: 't2',
      reminderDelayMs: 0,
      expiryDelayMs: 0,
    });

    expect(reminder).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
  });
});
