'use client';

import { FC, useEffect, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import {
  ForksList,
  StarsList,
} from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import dayjs from 'dayjs';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
export const Chart: FC<{
  list: StarsList[] | ForksList[];
}> = (props) => {
  const { list } = props;
  const ref = useRef<any>(null);
  const chart = useRef<null | DrawChart>(null);
  useEffect(() => {
    const gradient = ref.current
      .getContext('2d')
      .createLinearGradient(0, 0, 0, ref.current.height);
    gradient.addColorStop(0, 'rgba(255, 238, 0, 0.6)'); // Start color with some transparency
    gradient.addColorStop(1, 'rgba(255, 238, 0, 0)');
    chart.current = new DrawChart(ref.current!, {
      type: 'line',
      options: {
        maintainAspectRatio: false,
        responsive: true,
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 0,
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
        labels: list.map((row) => newDayjs(row.date).format('DD/MM/YYYY')),
        datasets: [
          {
            borderColor: '#F2E600',
            // @ts-ignore
            label: list?.[0]?.totalForks ? 'Forks by date' : 'Stars by date',
            backgroundColor: gradient,
            fill: true,
            // @ts-ignore
            data: list.map((row) => row.totalForks || row.totalStars),
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
