'use client';

import { FC } from 'react';
import clsx from 'clsx';

// Small circled "i" icon. Uses currentColor so it inherits the surrounding
// text color and adapts to light/dark automatically.
export const InfoIcon: FC<{ size?: number; className?: string }> = ({
  size = 16,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 11v5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

// Reusable info "(i)" affordance that shows `content` in a tooltip on hover.
// Wires into the global react-tooltip instance (<Tooltip id="tooltip" />,
// mounted in layout/top.tip.tsx), so no extra provider is needed at call sites.
// Use it next to any label, e.g.:
//   <span className="flex items-center gap-[6px]">
//     Thumbnail <InfoTooltip content="..." />
//   </span>
export const InfoTooltip: FC<{
  content: string;
  size?: number;
  className?: string;
}> = ({ content, size = 16, className }) => (
  <span
    data-tooltip-id="tooltip"
    data-tooltip-content={content}
    className={clsx(
      'inline-flex items-center justify-center cursor-help opacity-60 hover:opacity-100 transition-opacity',
      className
    )}
  >
    <InfoIcon size={size} />
  </span>
);
