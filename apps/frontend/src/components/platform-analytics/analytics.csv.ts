interface AnalyticsDataItem {
  label: string;
  data: Array<{ total: number | string; date: string }>;
  average?: boolean;
  percentageChange?: number;
}

interface DownloadAnalyticsCsvOptions {
  analytics: AnalyticsDataItem[];
  channelName: string;
  platform: string;
  dateRange: number;
}

interface PeriodSummary {
  label: string;
  value: number;
}

type CsvRow = Array<string | number>;

const formulaPrefixes = ['=', '+', '-', '@'];

const sanitizeCsvCell = (value: unknown) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  const safeValue = formulaPrefixes.some((prefix) =>
    stringValue.trimStart().startsWith(prefix)
  )
    ? `'${stringValue}`
    : stringValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const sanitizeFilenamePart = (value: string) => {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'analytics'
  );
};

const getSummaryValue = (item: AnalyticsDataItem) => {
  const total = item.data.reduce((acc, row) => {
    const value = Number(row.total || 0);
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);
  const value = total / (item.average ? item.data.length || 1 : 1);

  if (item.average) {
    return `${value.toFixed(2)}%`;
  }

  return Math.round(value);
};

const formatMetricValue = (value: number, average?: boolean) => {
  if (average) {
    return `${value.toFixed(2)}%`;
  }

  return Math.round(value);
};

const getPeriodLabels = (dateRange: number) => {
  if (dateRange <= 7) {
    return ['First Half', 'Second Half'];
  }

  if (dateRange <= 30) {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  }

  return ['Month 1', 'Month 2', 'Month 3'];
};

const getNumberValue = (value: number | string) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const summarizePeriod = (
  rows: Array<{ total: number | string }>,
  average?: boolean
) => {
  const total = rows.reduce((acc, row) => acc + getNumberValue(row.total), 0);

  if (average) {
    return total / (rows.length || 1);
  }

  return total;
};

const getPeriodSummaries = (
  item: AnalyticsDataItem,
  labels: string[]
): PeriodSummary[] => {
  const rowsPerPeriod = Math.ceil(item.data.length / labels.length) || 1;

  return labels.map((label, index) => {
    const start = index * rowsPerPeriod;
    const end =
      index === labels.length - 1 ? item.data.length : start + rowsPerPeriod;
    const rows = item.data.slice(start, end);

    return {
      label,
      value: summarizePeriod(rows, item.average),
    };
  });
};

const getTrend = (periods: PeriodSummary[]) => {
  const first = periods[0]?.value || 0;
  const last = periods.at(-1)?.value || 0;

  if (last > first) {
    return 'Up';
  }

  if (last < first) {
    return 'Down';
  }

  return 'Stable';
};

const getBestPeriod = (periods: PeriodSummary[]) => {
  return periods.reduce(
    (best, period) => (period.value > best.value ? period : best),
    periods[0]
  );
};

const getWorstPeriod = (periods: PeriodSummary[]) => {
  return periods.reduce(
    (worst, period) => (period.value < worst.value ? period : worst),
    periods[0]
  );
};

const buildAnalyticsCsv = ({
  analytics,
  channelName,
  platform,
  dateRange,
}: DownloadAnalyticsCsvOptions) => {
  const periodLabels = getPeriodLabels(dateRange);
  const reportRows: CsvRow[] = [
    ['Postiz Analytics Report'],
    ['Channel', channelName],
    ['Platform', platform],
    ['Date Range', `${dateRange} days`],
    ['Generated At', new Date().toISOString().slice(0, 10)],
    [],
    ['Metric Summary'],
    [
      'Metric',
      'Type',
      'Total / Average',
      'Best Period',
      'Best Period Value',
      'Worst Period',
      'Worst Period Value',
      'Trend',
    ],
  ];

  const periodRows = analytics.map((item) => {
    const periods = getPeriodSummaries(item, periodLabels);
    const bestPeriod = getBestPeriod(periods);
    const worstPeriod = getWorstPeriod(periods);

    reportRows.push([
      item.label,
      item.average ? 'Average' : 'Total',
      getSummaryValue(item),
      bestPeriod.label,
      formatMetricValue(bestPeriod.value, item.average),
      worstPeriod.label,
      formatMetricValue(worstPeriod.value, item.average),
      getTrend(periods),
    ]);

    return [
      item.label,
      ...periods.map((period) =>
        formatMetricValue(period.value, item.average)
      ),
    ];
  });

  reportRows.push([], ['Period Breakdown'], ['Metric', ...periodLabels]);
  reportRows.push(...periodRows);

  return reportRows
    .map((row) => row.map(sanitizeCsvCell).join(','))
    .join('\n');
};

export const downloadAnalyticsCsv = (options: DownloadAnalyticsCsvOptions) => {
  const csv = buildAnalyticsCsv(options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = [
    'postiz',
    sanitizeFilenamePart(options.platform),
    'analytics',
    `${options.dateRange}-days`,
    date,
  ].join('-');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
