import React from 'react';

export const LogoTextComponent = () => {
  return (
    <svg
      width="144"
      height="36"
      viewBox="0 0 144 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="voc-lt-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E89A7B" />
          <stop offset="38%" stopColor="#CF6295" />
          <stop offset="72%" stopColor="#7360AA" />
          <stop offset="100%" stopColor="#2897BF" />
        </linearGradient>
      </defs>

      {/* Icon 36×36 — path escalonado do favicon.svg (32→36, ×1.125) */}
      <rect width="36" height="36" rx="9" fill="url(#voc-lt-g)" />
      <path
        d="M6.2 10.7 L16.7 29.8 L17.8 29.8 L29.8 10.7 L24.5 10.7 L17.4 25.3 L13.5 10.7 Z"
        fill="white"
      />
      <circle cx="25.9" cy="7.9" r="2.8" fill="white" />

      {/* Wordmark */}
      <text
        x="46"
        y="24"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="currentColor"
        letterSpacing="-0.4"
      >
        Vocaccio
      </text>
    </svg>
  );
};
