'use client';
import { FC, useEffect, useMemo, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import { TotalList } from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import { chunk } from 'lodash';

function mergeDataPoints(data: TotalList[], numPoints: number): TotalList[] {
  const res = chunk(data, Math.ceil(data.length / numPoints));
  return res.map((row) => {
    return {
      date: `${row[0].date} - ${row?.at(-1)?.date}`,
      total: row.reduce((acc, curr) => acc + curr.total, 0),
    };
  });
}

export const ChartSocial: FC<{ data: TotalList[] }> = (props) => {
  const { data } = props;
  const list = useMemo(() => {
    return mergeDataPoints(data, 7);
  }, [data]);

  const ref = useRef<any>(null);
  const chart = useRef<null | DrawChart>(null);
  useEffect(() => {
    const gradient = ref.current
      .getContext('2d')
      .createLinearGradient(0, 0, 0, ref.current.height);
    gradient.addColorStop(0, 'rgb(20,101,6)'); // Start color with some transparency
    gradient.addColorStop(1, 'rgb(9, 11, 19, 1)');
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
          },
          x: {
            display: false,
            ticks: {
              stepSize: 10,
              maxTicksLimit: 7,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
      data: {
        labels: list.map((row) => row.date),
        datasets: [
          {
            borderColor: '#fff',
            // @ts-ignore
            label: 'Total',
            backgroundColor: gradient,
            fill: true,
            // @ts-ignore
            data: list.map((row) => row.total),
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
