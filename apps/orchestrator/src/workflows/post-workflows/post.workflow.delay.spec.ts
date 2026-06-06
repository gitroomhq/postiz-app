/// <reference types="jest" />

import { commentDelayToMilliseconds } from './post.workflow.delay';

describe('commentDelayToMilliseconds', () => {
  it('keeps CLI/API delays above the UI preset range as milliseconds', () => {
    expect(commentDelayToMilliseconds(5000)).toBe(5000);
    expect(commentDelayToMilliseconds('2000')).toBe(2000);
  });

  it('keeps UI comment delays in minutes', () => {
    expect(commentDelayToMilliseconds(1)).toBe(60000);
    expect(commentDelayToMilliseconds(120)).toBe(7200000);
  });

  it('normalizes empty, invalid, and negative delays to zero', () => {
    expect(commentDelayToMilliseconds()).toBe(0);
    expect(commentDelayToMilliseconds('not-a-number')).toBe(0);
    expect(commentDelayToMilliseconds(-5)).toBe(0);
  });
});
