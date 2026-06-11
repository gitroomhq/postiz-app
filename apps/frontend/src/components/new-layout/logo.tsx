'use client';

export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      className="min-w-[44px] min-h-[44px]"
    >
      <defs>
        <linearGradient id="voc-icon-grad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E89A7B" />
          <stop offset="38%" stopColor="#CF6295" />
          <stop offset="72%" stopColor="#7360AA" />
          <stop offset="100%" stopColor="#2897BF" />
        </linearGradient>
      </defs>
      <rect width="44" height="44" rx="11" fill="url(#voc-icon-grad)" />
      {/*
        Calligraphic V:
        - left arm 9px wide at top (thicker)
        - right arm 6px wide at top (thinner)
        - 1.5px tip at bottom center
      */}
      <path
        d="M8 13 L20.5 36 L22 36 L36 13 L30 13 L21.8 31 L17 13 Z"
        fill="white"
      />
      {/* Dot — upper right, clearly separated from V tip */}
      <circle cx="31" cy="9.5" r="3.2" fill="white" />
    </svg>
  );
};
