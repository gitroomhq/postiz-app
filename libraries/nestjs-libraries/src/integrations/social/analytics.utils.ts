import { AnalyticsData } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

// Honest trend: real percentage change across a time series (first -> last).
// Returns 0 when it cannot be computed (single point, zero base, no data), and
// the UI hides a 0 trend. We never fabricate a change value.
export function computePercentageChange(values: number[]): number {
  const nums = (values || []).filter(
    (v) => typeof v === 'number' && !isNaN(v)
  );
  if (nums.length < 2) {
    return 0;
  }
  const first = nums[0];
  const last = nums[nums.length - 1];
  if (!first) {
    return 0;
  }
  return ((last - first) / Math.abs(first)) * 100;
}

// A card explicitly marked as not provided by the platform API, so we render
// "Not available from platform API" instead of a fake or zero value.
export function notAvailable(label: string): AnalyticsData {
  return {
    label,
    data: [],
    percentageChange: 0,
    available: false,
  };
}
