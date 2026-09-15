'use client';

import { FC, useEffect, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import { TotalList } from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import useCookie from 'react-use-cookie';

export const ChartSocial: FC<{
  data: TotalList[];
  color?: 'purple' | 'green' | 'blue';
  variant?: 'spark' | 'hero';
  label?: string;
}> = (props) => {
  const { data, color = 'purple', variant = 'spark', label = 'Total' } = props;
  const [mode] = useCookie('mode', 'light');
  const dark = mode === 'dark';

  const list = data;

  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<null | DrawChart>(null);

  const hero = variant === 'hero';

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const ctx = ref.current.getContext('2d');
    if (!ctx) {
      return;
    }
    const styles = getComputedStyle(ref.current);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const colorSchemes = {
      purple: {
        start: token('--chartBrandFill'),
        end: token('--chartBrandFade'),
        border: token('--brand'),
      },
      green: {
        start: token('--chartOkFill'),
        end: token('--chartOkFade'),
        border: token('--ok'),
      },
      blue: {
        start: token('--chartBlueFill'),
        end: token('--chartBlueFade'),
        border: token('--chartBlue'),
      },
    };
    const colors = colorSchemes[color];
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const gradient = ctx.createLinearGradient(
      0,
      0,
      0,
      ref.current.height || 240,
    );
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);
    const tick = token('--soft');
    const grid = token('--line');

    chart.current = new DrawChart(ref.current, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        animation: {
          duration: reduceMotion ? 0 : hero ? 450 : 750,
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
            position: 'nearest',
            // The hero has enough canvas above the caret; the 48px scorecard
            // spark does not, so Chart.js places that tooltip beside the point.
            // In both cases the 6px hover point stays visible and inspectable.
            yAlign: hero ? 'bottom' : 'center',
            caretPadding: 10,
            backgroundColor: token('--pop'),
            titleColor: token('--text'),
            bodyColor: token('--muted'),
            borderColor: token('--border'),
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
            pointRadius: list.length === 1 ? (hero ? 4 : 3) : 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: token('--inner'),
            pointHoverBorderWidth: 2,
          },
        ],
      },
    });
    return () => {
      chart.current?.destroy();
    };
  }, [color, dark, hero, label, list]);

  return <canvas className="h-full w-full" ref={ref} />;
};
