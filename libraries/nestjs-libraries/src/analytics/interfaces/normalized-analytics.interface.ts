export interface NormalizedMetric {
  metricId: string;
  metricName: string;
  currentValue: number;
  previousValue?: number;
  percentageChange?: number;
  date: string; // ISO 8601 format
  provider: string;
  originalLabel?: string;
}

export interface NormalizedAnalytics {
  provider: string;
  fetchedAt: string;
  normalizationVersion: string;
  metrics: NormalizedMetric[];
}
