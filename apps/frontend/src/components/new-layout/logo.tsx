'use client';

// postmonster: brand sign (replaces the upstream mark)
export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 64 64"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <rect x="4" y="4" width="56" height="34" rx="14" fill="#C8F560" />
      <rect x="4" y="4" width="28" height="56" rx="12" fill="#C8F560" />
      <circle cx="22" cy="19" r="5.5" fill="#0E0F13" />
      <circle cx="42" cy="19" r="5.5" fill="#0E0F13" />
      <path
        d="M33 38h3.4l-1.7 5.8zM38.3 38h3.4l-1.7 5.8zM43.6 38h3.4l-1.7 5.8z"
        fill="#C8F560"
      />
    </svg>
  );
};
