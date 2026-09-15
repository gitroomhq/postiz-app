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
      total: row.reduce((acc, curr) => acc + Number(curr.total), 0),
    };
  });
}

export const ChartSocial: FC<{
  data: TotalList[];
  color?: 'purple' | 'green' | 'blue';
  variant?: 'spark' | 'hero';
  label?: string;
}> = (props) => {
  const { data, color = 'purple', variant = 'spark', label = 'Total' } = props;
  const [mode] = useCookie('mode', 'light');
  const dark = mode === 'dark';

  const list = useMemo(() => {
    const source =
      variant === 'hero' || data.length < 7
        ? data
        : mergeDataPoints(data, 7);
    if (source.length === 1) {
      return [source[0], source[0]];
    }
    return source;
  }, [data, variant]);

  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<null | DrawChart>(null);

  const colorSchemes = {
    purple: {
      start: 'rgba(97, 43, 211, 0.8)',
      end: 'rgba(97, 43, 211, 0.08)',
      border: 'rgb(97, 43, 211)',
    },
    green: {
      start: 'rgba(50, 213, 131, 0.8)',
      end: 'rgba(50, 213, 131, 0.08)',
      border: 'rgb(50, 213, 131)',
    },
    blue: {
      start: 'rgba(29, 155, 240, 0.8)',
      end: 'rgba(29, 155, 240, 0.08)',
      border: 'rgb(29, 155, 240)',
    },
  };

  const colors = colorSchemes[color];
  const hero = variant === 'hero';

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const ctx = ref.current.getContext('2d');
    if (!ctx) {
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, ref.current.height || 240);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);
    const tick = dark ? '#6e6e78' : '#777';
    const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    chart.current = new DrawChart(ref.current, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          duration: hero ? 450 : 750,
          easing: 'easeOutQuart',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        layout: {
          padding: {
            left: 0,
            right: 4,
            top: 8,
            bottom: hero ? 4 : 0,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            display: hero,
            border: { display: false },
            grid: {
              display: hero,
              color: grid,
            },
            ticks: {
              color: tick,
              font: { size: 11 },
              maxTicksLimit: 5,
              callback: (value) => {
                const n = Number(value);
                if (Math.abs(n) >= 1_000_000) {
                  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
                }
                if (Math.abs(n) >= 1_000) {
                  return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
                }
                return String(n);
              },
            },
          },
          x: {
            display: hero,
            border: { display: false },
            grid: { display: false },
            ticks: {
              color: tick,
              font: { size: 11 },
              maxTicksLimit: 8,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: dark ? '#1f1f24' : '#fff',
            titleColor: dark ? '#ededf0' : '#000',
            bodyColor: dark ? '#9b9ba4' : '#777',
            borderColor: dark ? '#26262c' : '#e7e9eb',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: {
              size: 12,
              weight: 'normal',
            },
            bodyFont: {
              size: 14,
              weight: 'bold',
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
            label,
            backgroundColor: gradient,
            fill: true,
            data: list.map((row) => row.total),
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: dark ? '#1e1d1d' : '#fff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
    });
    return () => {
      chart.current?.destroy();
    };
  }, [colors.border, colors.end, colors.start, dark, hero, label, list]);

  return <canvas className="h-full w-full" ref={ref} />;
};
