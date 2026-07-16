import React from 'react';

export const LogoTextComponent = () => {
  return (
    <svg
      width="140"
      height="33"
      viewBox="0 0 140 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="28" y={2.5} rx="6" fill="#612BD3" />
      <text
        x="14"
        y="21.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="15"
        fill="white"
      >
        MP
      </text>
      <text
        x="36"
        y="23"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="currentColor"
      >
        MediaPublish
      </text>
    </svg>
  );
};
