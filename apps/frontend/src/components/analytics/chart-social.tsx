'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DrawChart from 'chart.js/auto';
import { TotalList } from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import useCookie from 'react-use-cookie';
import {
  chartDayLabel,
  chartTooltipBox,
} from '@gitroom/frontend/components/analytics/chart-social-label';

export { chartDayLabel, chartTooltipBox };

function formatTooltipValue(value: number) {
  return new Intl.NumberFormat().format(value);
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

  const list = data;

  const ref = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chart = useRef<null | DrawChart>(null);

  const hero = variant === 'hero';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    const hideTip = () => {
      const tip = tipRef.current;
      if (tip) {
        tip.style.display = 'none';
      }
    };

    const placeTip = (tooltip: {
      opacity: number;
      caretX: number;
      caretY: number;
      dataPoints?: Array<{ label?: unknown; parsed: { y: number | null } }>;
    }) => {
      const canvas = ref.current;
      const tip = tipRef.current;
      const title = titleRef.current;
      const body = bodyRef.current;
      if (!canvas || !tip || !title || !body) {
        return;
      }
      if (tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
        hideTip();
        return;
      }
      const point = tooltip.dataPoints[0];
      title.textContent = chartDayLabel(String(point.label ?? ''));
      body.textContent = `${label}: ${formatTooltipValue(Number(point.parsed.y))}`;
      tip.style.display = 'block';
      const rect = canvas.getBoundingClientRect();
      const caretX = rect.left + tooltip.caretX;
      const caretY = rect.top + tooltip.caretY;
      const box = tip.getBoundingClientRect();
      const next = chartTooltipBox(
        caretX,
        caretY,
        box.width,
        box.height,
        window.innerWidth,
        window.innerHeight,
      );
      tip.style.left = `${next.left}px`;
      tip.style.top = `${next.top}px`;
    };

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
            enabled: false,
            external: ({ tooltip }) => placeTip(tooltip),
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
      hideTip();
      chart.current?.destroy();
    };
  }, [color, dark, hero, label, list]);

  return (
    <>
      <canvas
        className="h-full w-full"
        ref={ref}
        data-pq={hero ? 'chart-hero' : 'chart-spark'}
      />
      {mounted &&
        createPortal(
          <div
            ref={tipRef}
            data-pq="chart-tooltip"
            className="pointer-events-none fixed z-[80] min-w-[72px] rounded-[8px] bg-pqPop px-[10px] py-[10px] shadow-[inset_0_0_0_1px_var(--border)]"
            style={{ display: 'none', left: 0, top: 0 }}
          >
            <div
              ref={titleRef}
              data-pq="chart-tooltip-title"
              className="text-[12px] font-normal text-pqText"
            />
            <div
              ref={bodyRef}
              data-pq="chart-tooltip-body"
              className="text-[14px] font-bold text-pqMuted"
            />
          </div>,
          document.body,
        )}
    </>
  );
};
