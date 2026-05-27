'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

interface SparklineGeometry {
  linePath: string;
  areaPath: string;
  lastX: number;
  lastY: number;
  baselineY: number;
}

function buildGeometry(values: number[], width: number, height: number): SparklineGeometry | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 8;
  const padTop = 12;
  const padBottom = 16;
  const w = width - padX * 2;
  const h = height - padTop - padBottom;

  const points: Array<[number, number]> = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * w;
    const y = padTop + (1 - (v - min) / range) * h;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');

  const baselineY = height - padBottom;
  const [lastX, lastY] = points[points.length - 1];
  const areaPath = `${linePath} L ${lastX.toFixed(2)} ${baselineY} L ${padX} ${baselineY} Z`;

  return { linePath, areaPath, lastX, lastY, baselineY };
}

export function Sparkline({
  values,
  width = 800,
  height = 240,
  className,
  ariaLabel,
}: SparklineProps) {
  const geometry = useMemo(() => buildGeometry(values, width, height), [values, width, height]);
  // Re-trigger one-shot CSS animations when values change (e.g. dashboard filter switch).
  // Key change → React remounts the <g> children → keyframes fire fresh.
  const animationKey = values.length
    ? `${values.length}-${values[0]}-${values[values.length - 1]}`
    : 'empty';

  if (!geometry) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={clsx('w-full h-full block', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <style>{`
        @keyframes sparkDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes sparkArea { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sparkDot  { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        .spark-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sparkDraw 800ms cubic-bezier(0.16, 1, 0.3, 1) 120ms forwards; }
        .spark-area { opacity: 0; animation: sparkArea 600ms cubic-bezier(0.16, 1, 0.3, 1) 400ms forwards; }
        .spark-dot  { opacity: 0; transform-box: fill-box; transform-origin: center; animation: sparkDot 200ms cubic-bezier(0.16, 1, 0.3, 1) 840ms forwards; }
        @media (prefers-reduced-motion: reduce) {
          .spark-line { stroke-dashoffset: 0; animation: none; }
          .spark-area { opacity: 1; animation: none; }
          .spark-dot  { opacity: 1; transform: none; animation: none; }
        }
      `}</style>
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2E600" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F2E600" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="8"
        y1={geometry.baselineY}
        x2={width - 8}
        y2={geometry.baselineY}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <g key={animationKey}>
        <path
          d={geometry.areaPath}
          fill="url(#sparkArea)"
          className="spark-area"
        />
        <path
          d={geometry.linePath}
          pathLength={1}
          fill="none"
          stroke="#F2E600"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="spark-line"
        />
        <circle
          cx={geometry.lastX}
          cy={geometry.lastY}
          r="3"
          fill="#F2E600"
          vectorEffect="non-scaling-stroke"
          className="spark-dot"
        />
      </g>
    </svg>
  );
}
