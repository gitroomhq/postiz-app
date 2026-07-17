import React from 'react';

export const LogoTextComponent = () => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'inherit',
        fontWeight: 700,
        fontSize: 22,
        lineHeight: '33px',
        height: 33,
        color: 'currentColor',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#612BD3" />
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fontFamily="inherit"
          fontWeight="700"
          fontSize="14"
          fill="white"
        >
          L
        </text>
      </svg>
      Lime Manager
    </span>
  );
};
