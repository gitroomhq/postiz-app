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
      <path
        d="M7.6 13.1 L20.4 36.4 L21.7 36.4 L36.4 13.1 L30 13.1 L21.3 30.9 L16.5 13.1 Z"
        fill="white"
      />
      <circle cx="31.6" cy="9.6" r="3.4" fill="white" />
    </svg>
  );
};
