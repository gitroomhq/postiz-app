import { FC } from 'react';
import clsx from 'clsx';

type CreationMethod = 'UNKNOWN' | 'WEB' | 'API' | 'MCP' | 'AUTOPOST' | 'CLI';

interface Props {
  creationMethod?: CreationMethod | string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  ringColor?: string;
}

const tooltipFor = (m: string) =>
  m === 'AUTOPOST' ? 'Auto-posted by system' : `Created via ${m}`;

export const CreationMethodBadge: FC<Props> = ({
  creationMethod,
  size = 'xs',
  className,
  ringColor,
}) => {
  if (!creationMethod || creationMethod === 'UNKNOWN') return null;

  const sizeClasses =
    size === 'xs'
      ? 'h-[12px] px-[4px] text-[7px]'
      : size === 'md'
      ? 'h-[22px] px-[10px] text-[12px]'
      : 'h-[18px] px-[8px] text-[10px]';

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center text-lamboBlack font-[400] uppercase tracking-[0.225px] leading-none cursor-default',
        sizeClasses,
        creationMethod === 'WEB' && 'bg-lamboSteel',
        creationMethod === 'API' && 'bg-lamboGold',
        creationMethod === 'MCP' && 'bg-lamboGoldText',
        creationMethod === 'AUTOPOST' && 'bg-lamboGoldDark text-white',
        creationMethod === 'CLI' && 'bg-lamboAsh',
        className
      )}
      style={ringColor ? { boxShadow: `0 0 0 2px ${ringColor}` } : undefined}
      data-tooltip-id="tooltip"
      data-tooltip-content={tooltipFor(creationMethod)}
    >
      {creationMethod}
    </div>
  );
};
