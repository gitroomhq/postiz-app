'use client';

import { FC } from 'react';
import type { IconProps } from '@gitroom/frontend/components/ui/icons';

const PATHS = {
  select: 'M5 3.5l13.5 7-6 1.8-2.3 6.2z',
  text: 'M5 5h14M12 5v14M9 19h6',
  draw: 'M4 20l4.2-1L19 8.2a2.1 2.1 0 0 0-3-3L5.2 15.8zM14.5 6.7l2.8 2.8',
  shapes: 'M3.5 11.5h8v8h-8zM20.5 8a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z',
  image:
    'M4 5h16v14H4zM4 16l4.5-4.5 4 4 2.5-2.5L20 18M17 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  svg: 'M6 18C6 11 11 6 18 6M3.5 15.5h5v5h-5zM15.5 3.5h5v5h-5z',
  crop: 'M6 2.5V18h15.5M2.5 6H18v15.5',
  rotateLeft: 'M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5',
  rotateRight: 'M20 12a8 8 0 1 1-2.4-5.7L20 8.5M20 4v4.5h-4.5',
  flipHorizontal: 'M12 3v18M9 7l-5 10h5zM15 7l5 10h-5z',
  flipVertical: 'M3 12h18M7 9L17 4v5zM7 15l10 5v-5z',
  grid: 'M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16',
  fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  rect: 'M4 6h16v12H4z',
  ellipse: 'M21 12c0 3.9-4 7-9 7s-9-3.1-9-7 4-7 9-7 9 3.1 9 7z',
  line: 'M5 19L19 5',
  arrow: 'M5 19L19 5M10 5h9v9',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  reset: 'M4 4v5h5M4.6 9A8 8 0 1 1 4 13',
  alignLeft: 'M4 6h16M4 12h10M4 18h14',
  alignCentre: 'M4 6h16M7 12h10M5 18h14',
  alignRight: 'M4 6h16M10 12h10M6 18h14',
  toFront: 'M5 3.5h14M12 20.5V8M7 13l5-5 5 5',
  forward: 'M12 20V4M6 10l6-6 6 6',
  backward: 'M12 4v16M6 14l6 6 6-6',
  toBack: 'M5 20.5h14M12 3.5V16M7 11l5 5 5-5',
  duplicate: 'M8.5 8.5h11v11h-11zM15.5 8.5V4.5h-11v11h4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  split: 'M12 3v18M5 8h6M13 16h6',
  volume: 'M4 9v6h4l5 4V5L8 9H4zM16.5 9.5a3.5 3.5 0 0 1 0 5',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  ratioFree: 'M4 7V4h3M10 4h4M17 4h3v3M20 10v4M20 17v3h-3M14 20h-4M7 20H4v-3M4 14v-4',
  ratioSquare: 'M5 5h14v14H5z',
  ratioPortrait: 'M6.5 4h11v16h-11z',
  ratioLandscape: 'M3 7h18v10H3z',
  ratioStory: 'M7.5 3h9v18h-9z',
};

export type EditorIconName = keyof typeof PATHS;

export const EditorIcon: FC<IconProps & { name: EditorIconName }> = ({
  name,
  size = 16,
  className,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d={PATHS[name]}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
