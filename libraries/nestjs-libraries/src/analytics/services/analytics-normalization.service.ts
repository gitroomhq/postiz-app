import { Injectable } from '@nestjs/common';

import { AnalyticsData } from '../../integrations/social/social.integrations.interface';

import {
  NormalizedAnalytics,
  NormalizedMetric,
} from '../interfaces/normalized-analytics.interface';

import { SOCIAL_METRIC_MAPPINGS } from '../mappings/social-metric-mappings';

@Injectable()
export class AnalyticsNormalizationService {
  normalize(provider: string, analytics: AnalyticsData[]): NormalizedAnalytics {
    const mappings = SOCIAL_METRIC_MAPPINGS[provider] || {};

    const metrics: NormalizedMetric[] = analytics.flatMap((metric) => {
      return metric.data.map((entry, index) => {
        const currentValue = Number(entry.total);

        const previousEntry = index > 0 ? metric.data[index - 1] : undefined;

        const previousValue = previousEntry
          ? Number(previousEntry.total)
          : undefined;

        return {
          metricId:
            mappings[metric.label] ||
            metric.label.toLowerCase().replace(/\s+/g, '_'),

          metricName: metric.label,

          currentValue,

          previousValue,

          percentageChange: this.calculatePercentageChange(
            currentValue,
            previousValue
          ),

          date: entry.date,

          provider,

          originalLabel: metric.label,
        };
      });
    });

    return {
      provider,

      fetchedAt: new Date().toISOString(),

      normalizationVersion: 'v1',

      metrics,
    };
  }

  private calculatePercentageChange(
    currentValue: number,
    previousValue?: number
  ): number | undefined {
    if (previousValue === undefined || previousValue === 0) {
      return undefined;
    }

    return Number(
      (((currentValue - previousValue) / previousValue) * 100).toFixed(2)
    );
  }
}
