'use client';

import { FC, useEffect, useMemo, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import { TotalList } from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import { chunk } from 'lodash';
import useCookie from 'react-use-cookie';

function mergeDataPoints(data: TotalList[], numPoints: number): TotalList[] {
  const res = chunk(data, Math.ceil(data.length / numPoints));
  return res.map((row) => {
    return {
      date: `${row[0].date} - ${row?.at(-1)?.date}`,
      total: row.reduce((acc, curr) => acc + curr.total, 0),
    };
  });
}

export const ChartSocial: FC<{
  data: TotalList[];
  color?: 'purple' | 'green' | 'blue';
}> = (props) => {
  const { data, color = 'purple' } = props;
  const [mode] = useCookie('mode', 'dark');
  const list = useMemo(() => {
    return mergeDataPoints(data, 7);
  }, [data]);
  const ref = useRef<any>(null);
  const chart = useRef<null | DrawChart>(null);

  // Brand palette is monochrome + yellow only. All chart variants route
  // to Brand Yellow (#F2E600) per DESIGN.md — no chromatic accents.
  const goldScheme = {
    start: 'rgba(242, 230, 0, 0.6)',
    end: 'rgba(242, 230, 0, 0)',
    border: '#F2E600',
  };

  const colors = goldScheme;

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, ref.current.height);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);

    chart.current = new DrawChart(ref.current!, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          duration: 750,
          easing: 'easeOutQuart',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 4,
            bottom: 0,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
            grid: {
              color: '#202020',
            },
            ticks: {
              color: '#7D7D7D',
              font: {
                family: 'Archivo',
              },
            },
          },
          x: {
            display: false,
            grid: {
              color: '#202020',
            },
            ticks: {
              stepSize: 10,
              maxTicksLimit: 7,
              color: '#7D7D7D',
              font: {
                family: 'Archivo',
              },
              callback: function (value: any) {
                const label = this.getLabelForValue(value);
                return typeof label === 'string' ? label.toUpperCase() : label;
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: '#000000',
            titleColor: '#FFFFFF',
            bodyColor: '#7D7D7D',
            borderColor: '#F2E600',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 0,
            displayColors: false,
            titleFont: {
              size: 12,
              weight: 'normal',
              family: 'Archivo',
            },
            bodyFont: {
              size: 14,
              weight: 'normal',
              family: 'Archivo',
            },
          },
        },
      },
      data: {
        labels: list.map((row) => row.date),
        datasets: [
          {
            borderColor: colors.border,
            borderWidth: 2,
            label: 'Total',
            backgroundColor: gradient,
            fill: true,
            data: list.map((row) => row.total),
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: '#000000',
            pointHoverBorderWidth: 2,
          },
        ],
      },
    });
    return () => {
      chart?.current?.destroy();
    };
  }, []);

  return <canvas className="w-full h-full" ref={ref} />;
};
